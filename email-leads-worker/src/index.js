import PostalMime from 'postal-mime';

export default {
  async email(message, env, ctx) {
    let raw = '';
    let parsed;
    try {
      const reader = message.raw.getReader();
      const chunks = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }
      const buf = new Uint8Array(chunks.reduce((n, c) => n + c.length, 0));
      let off = 0;
      for (const c of chunks) { buf.set(c, off); off += c.length; }
      raw = new TextDecoder().decode(buf);
      parsed = await new PostalMime().parse(buf);
    } catch (err) {
      await saveUnparsed(env, message, raw, 'parse_error: ' + (err && err.message));
      return;
    }

    const subject = (parsed.subject || message.headers.get('subject') || '').trim();
    const fromAddr = (parsed.from && parsed.from.address) || message.from || '';
    const body = (parsed.text || stripHtml(parsed.html || '') || '').trim();
    const messageId = (parsed.messageId || message.headers.get('message-id') || '').trim();
    const sessionId = 'email_' + simpleHash(messageId || (fromAddr + ':' + subject + ':' + body.slice(0, 200)));

    const ctxMeta = { subject, fromAddr, body, messageId, sessionId, to: message.to || '', date: parsed.date || '' };

    let lead = parseCliengo(ctxMeta);
    if (!lead) lead = parseElementor(ctxMeta);

    if (!lead) {
      // Antes de guardar en leads_unparsed, descartar silenciosamente correos que claramente NO son leads
      if (!looksLikeLead(subject, body, fromAddr)) {
        return; // ruido (promos/newsletters/notifs) — no se guarda ni se ve
      }
      await saveUnparsed(env, message, raw, 'no_parser_matched');
      return;
    }

    // Dedup ventana 30 min por wa_norm + landing: si el mismo lead llega 2-3 veces
    // (usuario que le da submit varias veces, o varios destinatarios del form),
    // no duplicar el row en el dashboard.
    try {
      if (lead.wa_norm && lead.wa_norm.length >= 8 && (lead.landing || lead.url)) {
        const dup = await env.DB.prepare(
          `SELECT id FROM leads
           WHERE wa_norm = ?
             AND (landing = ? OR url = ?)
             AND fecha >= datetime('now', '-30 minutes')
           LIMIT 1`
        ).bind(lead.wa_norm, lead.landing || '', lead.url || '').first();
        if (dup) {
          // mismo lead recibido hace menos de 30 min: silenciar duplicado
          return;
        }
      }
    } catch (e) { /* si la query falla, seguimos al INSERT normal */ }

    try {
      // INSERT OR IGNORE: si llega el mismo correo por 2 rutas distintas (reenvío Gmail
      // + form WP + Hotmail Beto), el UNIQUE INDEX en session_id evita duplicado.
      await env.DB.prepare(`
        INSERT OR IGNORE INTO leads
          (session_id, estado, nombre, whatsapp, ciudad, m2, timeline, comentarios, fuente, url, gclid, campania, wa_norm, ip, user_agent, landing)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        lead.session_id,
        lead.estado || '',
        lead.nombre || '',
        lead.whatsapp || '',
        lead.ciudad || '',
        lead.m2 || '',
        lead.timeline || '',
        lead.comentarios || '',
        lead.fuente || '',
        lead.url || '',
        lead.gclid || '',
        lead.campania || '',
        lead.wa_norm || '',
        lead.ip || '',
        lead.user_agent || '',
        lead.landing || ''
      ).run();
    } catch (err) {
      await saveUnparsed(env, message, raw, 'd1_insert_error: ' + (err && err.message));
    }
  }
};

function parseCliengo({ subject, body, sessionId, fromAddr, to, date }) {
  const subjMatch = subject.match(/Tienes un nuevo contacto en\s+(.+?)!?\s*$/i)
    || body.match(/¡?Tienes un nuevo contacto en\s+(.+?)!/i);
  if (!subjMatch) return null;

  const landing = subjMatch[1].replace(/\/+$/, '').trim();
  // Conversación parseada: respuestas del Contacto asociadas a preguntas del Asesor
  const chat = parseCliengoChat(body);

  const nombre = decodeEntities(pick(body, /^\s*Nombre:\s*(.+)$/im)
    || chat.nombre
    || '');
  const telefono = pick(body, /^\s*Tel[eé]fono:\s*(.+)$/im)
    || chat.telefono
    || extractPhoneFromChat(body);
  const ubicacion = limpiarPrefijoUbicacion(decodeEntities(pick(body, /^\s*Ubicaci[oó]n:\s*(.+)$/im) || chat.ciudad || ''));
  const page = pick(body, /^\s*Page:\s*(.+)$/im);
  const fuenteCliengo = (pick(body, /^\s*Fuente:\s*(.+)$/im) || '').toLowerCase();
  const medio = (pick(body, /^\s*Medio:\s*(.+)$/im) || '').toLowerCase();

  let fuente = 'cliengo_web';
  if (fuenteCliengo.includes('facebook') || medio.includes('facebook')) fuente = 'cliengo_facebook';
  else if (fuenteCliengo.includes('instagram') || medio.includes('instagram')) fuente = 'cliengo_instagram';

  const { ciudad, estado } = splitCityState(ubicacion || (chat.ciudad || ''));
  const waNorm = (telefono || '').replace(/\D/g, '').slice(-10);

  // URL: prefer Page: del body. Si no existe, construir desde landing
  let finalUrl = page || '';
  if (!finalUrl && landing && /^[\w.-]+\.[a-z]{2,}/i.test(landing)) {
    finalUrl = 'https://' + landing.replace(/^https?:\/\//, '');
  }

  // Comentarios estructurados (NO toda la conversación). Decode entities en todos.
  const lineas = [];
  if (chat.interes) lineas.push(`Interés: ${decodeEntities(chat.interes)}`);
  if (chat.mensajeCliente) lineas.push(`Mensaje del cliente: "${decodeEntities(chat.mensajeCliente)}"`);
  if (chat.extras && chat.extras.length) lineas.push(`Notas: ${chat.extras.map(decodeEntities).join(' · ')}`);
  const comentariosEstructurados = lineas.join('\n');

  return {
    session_id: sessionId,
    fuente,
    landing,
    nombre: titleCaseName(nombre || ''),
    whatsapp: telefono || '',
    wa_norm: waNorm,
    ciudad: titleCaseCity(ciudad),
    estado: titleCaseCity(estado),
    url: finalUrl,
    campania: '',  // antes ponía landing → causaba duplicación en columna ORIGEN
    comentarios: comentariosEstructurados,
    user_agent: '',
    ip: ''
  };
}

// Parsea el chat Cliengo: asocia cada pregunta del Asesor con la respuesta inmediata del Contacto.
// Devuelve campos estructurados (nombre, ciudad, teléfono, interés, mensaje libre, extras).
function parseCliengoChat(body) {
  const out = { nombre: '', ciudad: '', telefono: '', interes: '', mensajeCliente: '', extras: [] };
  const lines = body.split('\n').map(l => l.trim()).filter(Boolean);

  // Construir secuencia ordenada de turnos.
  // Bug Olga 2026-06-10: si el mensaje del Contacto/Asesor abarca varias líneas
  // (ej. "Contacto: hola necesito cotizar pasto sintético\nde 544 metros y 4cm"),
  // el parser viejo solo agarraba la primera línea. Ahora concatenamos continuaciones.
  const turnos = [];
  let current = null;
  for (const ln of lines) {
    if (/^Datos de contacto/i.test(ln) || /^Gestiona tu contacto/i.test(ln)) break;
    const m = ln.match(/^(Asesor|Contacto):\s*(.*)$/i);
    if (m) {
      current = { rol: m[1].toLowerCase(), txt: m[2].trim() };
      turnos.push(current);
    } else if (current) {
      // continuación del turno actual (línea sin prefijo Asesor/Contacto)
      current.txt = (current.txt ? current.txt + ' ' : '') + ln;
    }
  }

  // Patrones de preguntas que dispara el bot Cliengo
  const RE_NOMBRE = /(nombre|llamas|c[oó]mo te dices|qui[eé]n eres|a que.\s*nombre|a qu[eé] nombre)/i;
  const RE_CIUDAD = /(ciudad|donde te encuentras|d[oó]nde est[aá]s|localidad|estado|ubicaci[oó]n|d[oó]nde ser[ií]a|d[oó]nde sera)/i;
  const RE_TELEFONO = /(whatsapp|tel[eé]fono|n[uú]mero|celular)/i;
  const RE_EXTRA = /(algo m[aá]s|consulta adicional|quieres agregar|comentar|cu[aá]ntas|cuantas|en cu[aá]nto tiempo|cuando|presupuesto)/i;
  const RE_INTERES_DIRECT = /(te interesa|qu[eé] buscas|qu[eé] necesitas|c[oó]mo te puedo ayudar|en qu[eé] podemos ayudarte|qu[eé] tipo)/i;

  const contactoLibre = []; // mensajes del Contacto que no respondieron a una pregunta específica

  for (let i = 0; i < turnos.length; i++) {
    const t = turnos[i];
    if (t.rol !== 'asesor') continue;
    // siguiente Contacto inmediato (puede haber varios Asesor seguidos)
    let nextContacto = null;
    for (let j = i + 1; j < turnos.length; j++) {
      if (turnos[j].rol === 'contacto') { nextContacto = turnos[j]; break; }
      if (turnos[j].rol === 'asesor') continue;
    }
    if (!nextContacto || !nextContacto.txt) continue;

    if (!out.nombre && RE_NOMBRE.test(t.txt) && looksLikeName(nextContacto.txt)) {
      out.nombre = nextContacto.txt;
    } else if (!out.ciudad && RE_CIUDAD.test(t.txt)) {
      out.ciudad = nextContacto.txt;
    } else if (!out.telefono && RE_TELEFONO.test(t.txt) && /\d{8,}/.test(nextContacto.txt)) {
      // Bug Olga 2026-06-10: si el cliente menciona 2 números ("Mi cel 5512345678
      // y mi oficina 5587654321"), el .replace(/[^\d]/g,'') los concatena en 20 dígitos
      // y slice(-10) se queda con el SEGUNDO. Fix: capturar la PRIMERA secuencia con
      // 10+ dígitos contiguos (permitiendo separadores típicos de teléfono).
      const candidates = nextContacto.txt.match(/(?:\+?\d[\d\s\-().]{7,}\d)/g) || [];
      let picked = '';
      for (const c of candidates) {
        const digits = c.replace(/\D/g, '');
        if (digits.length >= 10 && digits.length <= 13) { picked = digits.slice(-10); break; }
      }
      // Fallback (8-9 dígitos legacy o sin separadores estándar): todos los dígitos.
      if (!picked) {
        const all = nextContacto.txt.replace(/\D/g, '');
        if (all.length >= 8) picked = all.length >= 10 ? all.slice(-10) : all;
      }
      if (picked) out.telefono = picked;
    } else if (RE_EXTRA.test(t.txt) && !['nada','no','ninguno','ninguna'].includes(nextContacto.txt.toLowerCase())) {
      out.extras.push(nextContacto.txt);
    }
  }

  // Primer Contacto = mensaje inicial libre del cliente (ANTES de cualquier pregunta del Asesor)
  for (const t of turnos) {
    if (t.rol === 'contacto') {
      if (t.txt && !out.mensajeCliente && t.txt.length > 1) {
        out.mensajeCliente = t.txt;
      }
      break;
    }
    if (t.rol === 'asesor') break; // ya empezó el bot, no hay mensaje inicial
  }
  // Si no hubo mensaje inicial, usar el primer mensaje libre que no sea datos básicos
  if (!out.mensajeCliente) {
    for (const t of turnos) {
      if (t.rol !== 'contacto') continue;
      const x = t.txt.trim();
      if (!x) continue;
      if (x === out.nombre || x === out.ciudad || x === out.telefono) continue;
      if (/^\d{8,}$/.test(x.replace(/\D/g,''))) continue;
      if (['si','sí','no','ok','gracias','perfecto','bien'].includes(x.toLowerCase())) continue;
      out.mensajeCliente = x;
      break;
    }
  }

  // Interés: detectar por palabras clave en TODO lo que dijo el Contacto
  const allCliente = turnos.filter(t => t.rol === 'contacto').map(t => t.txt).join(' ').toLowerCase();
  out.interes = detectInteres(allCliente);

  return out;
}

const INTERES_KEYWORDS = [
  ['Pasto sintético',     /pasto sint[eé]tico|c[eé]sped sint[eé]tico|grass sint[eé]tico|pasto artificial/i],
  ['Cancha de fútbol 7',  /cancha de f[uú]tbol\s*7|f[uú]tbol\s*7|f7|cancha de futbol|cancha multiusos/i],
  ['Cancha de pádel',     /\bp[aá]del\b|cancha de padel|padel/i],
  ['Cancha de fútbol americano', /futbol americano|f[uú]tbol americano|tochito/i],
  ['Cancha de pickleball',/pickleball/i],
  ['Cancha de tenis',     /\btenis\b/i],
  ['Cancha de béisbol',   /b[eé]isbol|softbol/i],
  ['Putting green',       /putting green|golf/i],
  ['Malla ciclónica',     /malla cicl[oó]nica|malla|cerca cicl[oó]nica/i],
  ['Alumbrado/reflectores', /alumbrado|reflector|iluminaci[oó]n|luminaria/i],
  ['Gradas/bancas',       /grada|banca para jugadores/i],
  ['Porterías',           /porter[ií]a|arco|red de porter/i],
  ['Pintura para canchas',/pintura|pintar la cancha|repintar/i],
  ['Pasto jardín',        /jard[ií]n|residencial|patio|terraza/i],
];
function detectInteres(text) {
  for (const [name, re] of INTERES_KEYWORDS) if (re.test(text)) return name;
  return '';
}

// Decodifica entities HTML en el texto. Cubre acentos español + numéricos + hex.
// Bug Olga 2026-06-10: parsed.text de Cliengo venía con "Jes&uacute;s" sin decodificar.
function decodeEntities(s) {
  if (!s) return s;
  return String(s)
    .replace(/&aacute;/gi, 'á').replace(/&eacute;/gi, 'é').replace(/&iacute;/gi, 'í')
    .replace(/&oacute;/gi, 'ó').replace(/&uacute;/gi, 'ú').replace(/&ntilde;/gi, 'ñ')
    .replace(/&Aacute;/g, 'Á').replace(/&Eacute;/g, 'É').replace(/&Iacute;/g, 'Í')
    .replace(/&Oacute;/g, 'Ó').replace(/&Uacute;/g, 'Ú').replace(/&Ntilde;/g, 'Ñ')
    .replace(/&uuml;/gi, 'ü').replace(/&Uuml;/g, 'Ü')
    .replace(/&iexcl;/g, '¡').replace(/&iquest;/g, '¿')
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&amp;/g, '&'); // último para no re-decodificar
}

// Quita prefijos basura típicos en respuestas de ubicación tipo "en el municipio de X".
// Bug Olga 2026-06-10: ciudad guardada como "En el Municipio de San Andres Tenjapan".
function limpiarPrefijoUbicacion(s) {
  if (!s) return '';
  return s
    .replace(/^\s*(?:en el municipio de|en la ciudad de|en el estado de|en el pueblo de|en\s+|del?\s+)/i, '')
    .trim();
}

function looksLikeName(s) {
  if (!s) return false;
  const t = s.trim();
  if (t.length < 2 || t.length > 60) return false;
  if (/\d{4,}/.test(t)) return false; // tiene un número largo, no es nombre
  // 1-5 palabras, principalmente letras
  const words = t.split(/\s+/);
  if (words.length > 5) return false;
  return /^[A-Za-zÁÉÍÓÚÑáéíóúñ.\s]{2,}$/.test(t);
}

function titleCaseName(s) {
  if (!s) return '';
  return s.toLowerCase().split(/\s+/).map(w => {
    if (!w) return w;
    if (w.length <= 2 && /^(de|la|el|y|del|los|las)$/i.test(w)) return w;
    return w.charAt(0).toUpperCase() + w.slice(1);
  }).join(' ').trim();
}

function titleCaseCity(s) {
  if (!s) return '';
  // mapeo de abreviaturas comunes de estados MX
  const ABBR = {
    'tamps': 'Tamaulipas', 'tamp': 'Tamaulipas',
    'nl': 'Nuevo León', 'n.l.': 'Nuevo León',
    'jal': 'Jalisco',
    'cdmx': 'Ciudad de México', 'df': 'Ciudad de México',
    'edomex': 'Estado de México', 'edo mex': 'Estado de México', 'edo. mex.': 'Estado de México',
    'qro': 'Querétaro', 'sin': 'Sinaloa', 'son': 'Sonora',
    'bc': 'Baja California', 'bcs': 'Baja California Sur',
    'pue': 'Puebla', 'gto': 'Guanajuato', 'mich': 'Michoacán',
    'ver': 'Veracruz', 'oax': 'Oaxaca', 'chih': 'Chihuahua',
    'coah': 'Coahuila', 'yuc': 'Yucatán', 'qroo': 'Quintana Roo',
  };
  const parts = s.split(/[,/·]/).map(x => x.trim()).filter(Boolean);
  const titled = parts.map(p => {
    const lower = p.toLowerCase().replace(/\.$/, '');
    if (ABBR[lower]) return ABBR[lower];
    return titleCaseName(p);
  });
  return titled.join(', ');
}

function parseElementor({ subject, body, sessionId }) {
  if (!/Funciona con:\s*Elementor/i.test(body) && !/URL de la p[aá]gina:/i.test(body)) return null;

  // decodeEntities en TODOS los campos de texto. Bug Olga 2026-06-10:
  // leads Elementor con acentos llegaban como "Jes&uacute;s" / "sint&eacute;tico".
  const nombre = decodeEntities(pick(body, /^\s*Nombre:\s*(.+)$/im));
  const email = decodeEntities(pick(body, /^\s*Email:\s*(.+)$/im));
  const whatsapp = pick(body, /^\s*(?:WhatsApp|Tel[eé]fono|Phone):\s*(.+)$/im);
  // Mensaje: capturar TODO hasta el siguiente campo conocido o el separador "---".
  // ⚠️ NO cortar en línea vacía (eso truncaba mensajes multilínea como "Solicito cotización\n\nCliente potencial...").
  // Olga 2026-06-10: bug Salvador Torres — el "Cliente potencial obtenido desde la Landing Page" se perdía.
  const mensaje = decodeEntities(pick(body, /^\s*(?:Mensaje|Comentarios|Message|Comments):\s*([\s\S]+?)(?=\n\s*---\s*\n|\n\s*Fecha:|\n\s*URL de la p[aá]gina:|\n\s*Agente de usuario:|\n\s*IP remota:|\n\s*Funciona con:|$)/im));
  const url = pick(body, /^\s*URL de la p[aá]gina:\s*(.+)$/im) || '';
  const ua = pick(body, /^\s*Agente de usuario:\s*(.+)$/im) || '';
  const ip = pick(body, /^\s*IP remota:\s*(.+)$/im) || '';

  const params = parseQueryParams(url);
  const gclid = params.gclid || '';
  const gadCampaign = params.gad_campaignid || '';
  const isPaid = !!(gclid || params.gad_source || params.gbraid || params.wbraid);

  const { host, path } = splitUrl(url);
  const fuente = isPaid ? ('google_ads_' + domainSlug(host)) : 'form_organico';
  const landing = (host ? host.replace(/^www\./, '') : '') + (path || '');
  const waNorm = (whatsapp || '').replace(/\D/g, '').slice(-10);

  const comentarios = [
    mensaje ? mensaje.trim() : '',
    email ? `Email: ${email}` : ''
  ].filter(Boolean).join('\n');

  return {
    session_id: sessionId,
    fuente,
    landing: landing || domainSlug(host),
    nombre: nombre || '',
    whatsapp: whatsapp || '',
    wa_norm: waNorm,
    ciudad: '',
    estado: '',
    url,
    gclid,
    campania: gadCampaign,
    comentarios,
    user_agent: ua,
    ip
  };
}

async function saveUnparsed(env, message, raw, reason) {
  try {
    await env.DB.prepare(`
      INSERT INTO leads_unparsed (received_at, sender, recipient, subject, reason, raw)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      new Date().toISOString(),
      message.from || '',
      message.to || '',
      message.headers.get('subject') || '',
      reason,
      raw.slice(0, 64000)
    ).run();
  } catch (_) { /* swallow */ }
}

function pick(s, re) {
  const m = s.match(re);
  return m ? m[1].trim() : '';
}

function splitCityState(ubic) {
  if (!ubic) return { ciudad: '', estado: '' };
  const parts = ubic.split(',').map(p => p.trim()).filter(Boolean);
  return { ciudad: parts[0] || '', estado: parts[1] || '' };
}

function parseQueryParams(url) {
  const out = {};
  if (!url) return out;
  const q = url.split('?')[1];
  if (!q) return out;
  for (const kv of q.split('&')) {
    const [k, v] = kv.split('=');
    if (k) out[decodeURIComponent(k)] = decodeURIComponent(v || '');
  }
  return out;
}

function splitUrl(url) {
  if (!url) return { host: '', path: '' };
  const cleaned = url.split('?')[0].replace(/^https?:\/\//, '');
  const slash = cleaned.indexOf('/');
  if (slash === -1) return { host: cleaned, path: '' };
  return { host: cleaned.slice(0, slash), path: cleaned.slice(slash) };
}

function domainSlug(host) {
  if (!host) return 'desconocido';
  return host.replace(/^www\./, '').split('.')[0];
}

function extractChatTranscript(body) {
  const lines = body.split('\n');
  const out = [];
  let inChat = false;
  for (const ln of lines) {
    if (/^Enviado el /i.test(ln)) { inChat = true; continue; }
    if (/^Gestiona tu contacto/i.test(ln) || /^Datos de contacto/i.test(ln)) break;
    if (inChat && /^(Contacto|Asesor):/i.test(ln)) out.push(ln.trim());
  }
  return out.join('\n');
}

function extractPhoneFromChat(body) {
  const m = body.match(/Contacto:\s*([\d\s\-().+]{8,})/);
  if (!m) return '';
  const digits = m[1].replace(/\D/g, '');
  return digits.length >= 10 ? digits : '';
}

function extractNameFromChat(body) {
  const chat = body.split('\n').filter(l => /^Contacto:/i.test(l));
  for (const l of chat) {
    const t = l.replace(/^Contacto:\s*/i, '').trim();
    if (/^[A-ZÁÉÍÓÚÑa-záéíóúñ.\s]{4,}$/.test(t) && t.split(/\s+/).length <= 5) return t;
  }
  return '';
}

// Heurística: ¿este correo tiene pinta de lead? Solo guarda en leads_unparsed si pasa.
// Estricto por default: descarta todo lo que no parezca claramente un formulario o un mensaje de contacto.
function looksLikeLead(subject, body, fromAddr) {
  const s = (subject + ' ' + fromAddr).toLowerCase();
  const b = (body || '').toLowerCase();

  // EXCEPCIÓN: el código de verificación de reenvío Gmail viene de
  // forwarding-noreply@google.com y caería en el blacklist `noreply@google.com`.
  // Lo dejamos pasar para que se guarde en leads_unparsed y poder leer el código.
  if (s.includes('forwarding-noreply@google.com')) return true;
  if (s.includes('gmail forwarding confirmation') || s.includes('confirmación de reenv') || s.includes('confirmacion de reenv')) return true;

  // Lista negra obvia: si trae alguna de estas pistas en subject o sender, es ruido
  const blacklistSender = [
    'noreply@google.com', 'no-reply@accounts.google.com',
    'mailer-daemon@', 'postmaster@',
    'newsletter', 'campaign', 'marketing',
    'promo', 'offer', 'deals',
    'support@', 'billing@', 'notifications@',
    'security-noreply', 'invoice', 'receipt',
    'linkedin.com', 'facebook.com', 'instagram.com', 'tiktok.com',
    'amazon.', 'mercadolibre', 'paypal', 'stripe',
    'apple.com', 'icloud.com'
  ];
  for (const p of blacklistSender) if (s.includes(p)) return false;

  const blacklistSubject = [
    'unsubscribe', 'newsletter', 'last chance', 'sale ', 'off!', '% off',
    'webinar', 'masterclass', 'curso', 'descarga', 'ebook',
    'recibo', 'factura', 'invoice', 'receipt', 'order', 'pedido',
    'verifica', 'verify your', 'reset your password', 'security alert',
    'login', 'sign in', 'two-factor', '2fa', 'authentication',
    'reunión', 'meeting reminder', 'calendar invitation'
  ];
  for (const p of blacklistSubject) if (s.includes(p)) return false;

  // Lista blanca: si trae alguna de estas señales, parece lead → guarda en unparsed para revisión
  const leadSignals = [
    'tienes un nuevo contacto', 'nuevo contacto', 'nuevo lead', 'new lead',
    'formulario', 'contact form', 'cotiz', 'quotation',
    'whatsapp', 'teléfono:', 'phone:', 'mensaje:', 'message:',
    'me interesa', 'i am interested', 'interested in',
    'funciona con: elementor', 'wpforms', 'gravity forms', 'contact form 7',
    'url de la página:', 'ip remota:', 'agente de usuario:',
    'cliengo', 'tidio', 'tawk', 'crisp',
    'sportmaster', 'canchadefutbol', 'canchasdepadel', 'padelcenter', 'playzone', 'puttinggreen'
  ];
  for (const p of leadSignals) if (b.includes(p) || s.includes(p)) return true;

  // Por default: descarta. Si en el futuro aparece un formato nuevo, agregamos su keyword arriba.
  return false;
}

function stripHtml(html) {
  if (!html) return '';
  // 1) Quitar <script> y <style> ANTES de cualquier decodificación
  //    (evita interpretar entities dentro de código).
  // 2) Convertir <br> y cierres de bloque a \n para preservar saltos de línea.
  // 3) Quitar todos los demás tags.
  // 4) Decodificar entities completas (acentos, numéricos, hex) con decodeEntities.
  //    Bug Olga 2026-06-10: stripHtml viejo solo decodificaba &nbsp;&amp;&lt;&gt;&quot;
  //    → si el correo venía SOLO en HTML (sin parsed.text), los acentos quedaban como
  //    "Jes&uacute;s" antes de pasar a parseCliengo/parseElementor.
  const sinTags = html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|tr|li|h\d)>/gi, '\n')
    .replace(/<[^>]+>/g, '');
  return decodeEntities(sinTags);
}

function simpleHash(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h.toString(36);
}
