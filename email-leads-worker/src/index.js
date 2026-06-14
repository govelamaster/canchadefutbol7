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

    // Merge inteligente (Olga 2026-06-10): en lugar de descartar duplicados,
    // ENRIQUECER el lead existente o crear nuevo con WARNING según el caso.
    // Cubre: cliente que entra a 2 landings del mismo dominio (interés alto),
    // mismo número con distinto nombre (B2B con secretaria), y duplicados puros.
    let notasInternasExtra = '';
    let mergeAlreadyHandled = false;
    try {
      if (lead.wa_norm && lead.wa_norm.length >= 8) {
        const existing = await env.DB.prepare(
          `SELECT id, nombre, url, landing, comentarios, vendedor, fecha
           FROM leads
           WHERE wa_norm = ?
             AND fecha >= datetime('now', '-30 minutes')
           ORDER BY fecha DESC LIMIT 1`
        ).bind(lead.wa_norm).first();

        if (existing) {
          const normName = s => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z\s]/g, '').replace(/\s+/g, ' ').trim();
          const sameName = normName(existing.nombre) === normName(lead.nombre) || !lead.nombre || !existing.nombre;
          const sameUrl = (existing.url || '').trim() === (lead.url || '').trim();
          const sameComentarios = (existing.comentarios || '').trim() === (lead.comentarios || '').trim();
          const sameDomain = (() => {
            try {
              const a = new URL(existing.url || '').hostname.replace(/^www\./, '');
              const b = new URL(lead.url || '').hostname.replace(/^www\./, '');
              return a && b && a === b;
            } catch { return (existing.landing || '').split('/')[0] === (lead.landing || '').split('/')[0]; }
          })();

          // Hora HH:MM México para etiquetar el append
          const hhmm = new Date(Date.now() - 6 * 3600 * 1000).toISOString().slice(11, 16);

          // CASO A — duplicado puro: misma persona, misma página, mismo mensaje
          if (sameName && sameUrl && sameComentarios) {
            mergeAlreadyHandled = true; // no insertar, ignorar silencioso
          }
          // CASO E — mismo número, DISTINTO nombre: B2B con secretaria u oficina compartida
          else if (!sameName && lead.nombre && existing.nombre) {
            notasInternasExtra = `⚠️ MISMO WHATSAPP que ${existing.nombre} (lead #${existing.id}` +
              (existing.vendedor ? `, asignado a ${existing.vendedor}` : '') +
              `, hace minutos). Verificar si es la misma empresa / oficina compartida.`;
            // continúa al INSERT normal con esta nota
          }
          // CASO B/C/D — mismo nombre: enriquecer existente, indicar interés alto si cambió de página
          else {
            let nota;
            if (sameUrl && !sameComentarios) {
              nota = `\n[+ Volvió a contactar ${hhmm}: ${lead.comentarios || '(sin mensaje nuevo)'}]`;
            } else if (sameUrl && sameComentarios) {
              // identical content, distinct sessionId — reenvío legítimo, ignorar
              mergeAlreadyHandled = true;
            } else if (!sameUrl && sameDomain) {
              nota = `\n[+ INTERÉS ALTO ${hhmm} — también entró a ${lead.url || lead.landing || '(otra página)'}: ${lead.comentarios || '(sin mensaje)'}]`;
            } else {
              // distinto dominio (cross-brand: SportMaster + Padel del mismo grupo)
              nota = `\n[+ INTERÉS ALTO ${hhmm} — también desde ${lead.landing || 'otra marca'}: ${lead.comentarios || '(sin mensaje)'}]`;
            }
            if (!mergeAlreadyHandled && nota) {
              try {
                await env.DB.prepare(
                  `UPDATE leads SET comentarios = COALESCE(comentarios, '') || ? WHERE id = ?`
                ).bind(nota, existing.id).run();
                mergeAlreadyHandled = true;
              } catch (e) { /* si falla el UPDATE, insertamos normal abajo */ }
            }
          }
        }
      }
    } catch (e) { /* si todo el merge falla, fallback al INSERT normal */ }

    if (mergeAlreadyHandled) return; // ya enriquecimos o ignoramos

    try {
      // INSERT con session_id UNIQUE. Si conflict por session_id (reenvío idéntico
      // de CF), capturamos la excepción y la loggeamos en leads_unparsed con razón
      // explícita "session_id_conflict" → ya no es silencioso (Olga bug #3 del reporte).
      const insertRes = await env.DB.prepare(`
        INSERT OR IGNORE INTO leads
          (session_id, estado, nombre, whatsapp, ciudad, m2, timeline, comentarios, notas_internas, fuente, tipo_cliente, url, gclid, campania, wa_norm, ip, user_agent, landing)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        lead.session_id,
        lead.estado || '',
        lead.nombre || '',
        lead.whatsapp || '',
        lead.ciudad || '',
        lead.m2 || '',
        lead.timeline || '',
        lead.comentarios || '',
        notasInternasExtra || '',
        lead.fuente || '',
        lead.tipo_cliente || '',
        lead.url || '',
        lead.gclid || '',
        lead.campania || '',
        lead.wa_norm || '',
        lead.ip || '',
        lead.user_agent || '',
        lead.landing || ''
      ).run();

      // Si OR IGNORE silenció el INSERT (session_id duplicado), no hubo cambios.
      // Loggeamos en leads_unparsed para auditoría — ya no es silencioso.
      if (insertRes.meta && insertRes.meta.changes === 0) {
        await saveUnparsed(env, message, raw, 'session_id_conflict (reenvío exacto de CF Email Routing — ya existe lead con este session_id)');
      }
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

  // Analizar TODO lo que dijo el Contacto para extraer info valiosa al CRM.
  // Bug Olga 2026-06-10: el dashboard mostraba "hola" pero el chat tenía m²,
  // tipo de cancha, altura. Ahora capturamos eso y lo estructuramos.
  const allCliente = chat.allCliente || '';
  const m2 = extractM2(allCliente);
  const altura = extractAltura(allCliente);
  const tipoCancha = extractTipoCancha(allCliente);

  // Comentarios estructurados con TODO lo relevante. Decode entities en todos.
  const lineas = [];
  if (chat.interes) lineas.push(`Interés: ${decodeEntities(chat.interes)}`);
  if (tipoCancha) lineas.push(`Tipo: ${tipoCancha}`);
  if (m2) lineas.push(`m²: ${m2}`);
  if (altura) lineas.push(`Altura del pasto: ${altura}`);
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
    m2: m2 || '',                // ← Olga 2026-06-10: capturar m² del chat
    tipo_cliente: tipoCancha,    // ← guarda tipo de cancha si lo detectó
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
      // Usa extractPhone (helper inteligente): toma el PRIMER teléfono válido,
      // ignora medidas ("5440 metros"), maneja +52/separadores, descarta precios.
      const picked = extractPhone(nextContacto.txt);
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

  // Interés: detectar por palabras clave en TODO lo que dijo el Contacto.
  // También exponemos allCliente para que parseCliengo pueda extraer m²/tipo/altura.
  const allCliente = turnos.filter(t => t.rol === 'contacto').map(t => t.txt).join(' ');
  out.allCliente = allCliente;
  out.interes = detectInteres(allCliente.toLowerCase());

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
    // Bug Olga 2026-06-14: medidas tipo "25 &times; 45" salían en crudo en el
    // dashboard. Cliengo codifica × como &times;. Cubrimos la familia medida/mate.
    .replace(/&times;/gi, '×').replace(/&divide;/gi, '÷').replace(/&deg;/gi, '°')
    .replace(/&middot;/gi, '·').replace(/&minus;/gi, '−')
    .replace(/&frac12;/gi, '½').replace(/&frac14;/gi, '¼').replace(/&frac34;/gi, '¾')
    .replace(/&mdash;/gi, '—').replace(/&ndash;/gi, '–').replace(/&hellip;/gi, '…')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&amp;/g, '&'); // último para no re-decodificar
}

// Detecta spam de bots en formularios Elementor. Olga 2026-06-10:
// 40 leads tipo "1win_ypkt" / WhatsApp "0" / URL "Agente de usuario: Mozilla..."
// estaban ensuciando el dashboard. Patrones comunes:
//   - nombre: "1win_ypkt", "seo_master", "casino_bot", "viagra_xyz"
//   - whatsapp: "0", "00", "1111111111"
//   - url: empieza con "Agente de usuario:" (mal parseo por bot que rompe el form)
// Estrategia conservadora: rechazar SOLO si hay señales claras de bot.
function esSpamElementor({ nombre, whatsapp, url, mensaje }){
  // Señal 1: URL claramente corrupta por bot
  if (url && /^\s*Agente de usuario:/i.test(url)) return true;
  // Señal 2: WhatsApp inválido (0, 00, 000, 1111111111, vacío)
  const digits = (whatsapp || '').replace(/\D/g, '');
  if (!digits || digits.length < 7) return true; // muy corto, no es teléfono real
  if (/^0+$/.test(digits)) return true;
  if (/^(\d)\1+$/.test(digits)) return true; // 1111111111
  const nombreTrim = (nombre || '').trim();
  // Señal 3 (Olga 2026-06-13): nombre puro dígitos (típico de bot que copió el WhatsApp como nombre)
  // Ej: "8054002077" como nombre
  if (nombreTrim && /^\d+$/.test(nombreTrim)) return true;
  // Señal 4 (Olga 2026-06-13): nombre IDÉNTICO al WhatsApp (bot llenó el mismo campo en ambos)
  if (nombreTrim && digits && nombreTrim.replace(/\D/g, '') === digits && /^\d+$/.test(nombreTrim)) return true;
  // Señal 5: nombre con marcas spam conocidas
  const n = nombreTrim.toLowerCase();
  if (n) {
    const SPAM_KEYWORDS = [
      '1win','1xbet','bet365','casino','poker','viagra','cialis','crypto',
      'bitcoin','forex','traffic','seo offer','backlink','adult','escort',
      'pharmacy','penis','sex',
    ];
    if (SPAM_KEYWORDS.some(k => n.includes(k))) return true;
    // Señal 6: nombre patrón "palabra_palabra" sin espacios y corto (típico de bots)
    if (/^[a-z0-9]{2,10}_[a-z0-9]{2,10}$/i.test(nombreTrim)) return true;
  }
  // Señal 7 (Olga 2026-06-13): pitch de SEO services en inglés ("Most businesses struggle to get
  // noticed online... rank higher... keywords your customers are typing... send keyword suggestions").
  // Si el mensaje contiene 2+ frases típicas de ese pitch → spam comercial.
  const m = (mensaje || '').toLowerCase();
  if (m && m.length > 50) {
    const PITCH_PHRASES = [
      'noticed online','rank higher','search pages','keywords your customers',
      'keyword suggestions','boost traffic','your competition','above the competition',
      'businesses struggle','search engines','help your business grow','few clients',
      'monthly retainer','seo services','dofollow backlinks','outranking',
      'increase your traffic','first page of google','top of google',
    ];
    const hits = PITCH_PHRASES.filter(p => m.includes(p)).length;
    if (hits >= 2) return true; // claro pitch comercial
  }
  return false;
}

// Quita prefijos basura típicos en respuestas de ubicación tipo "en el municipio de X".
// Bug Olga 2026-06-10: ciudad guardada como "En el Municipio de San Andres Tenjapan".
function limpiarPrefijoUbicacion(s) {
  if (!s) return '';
  let out = s
    .replace(/^\s*(?:en el municipio de|en la ciudad de|en el estado de|en el pueblo de|en la delegaci[oó]n de|en la zona de|en\s+|del?\s+)/i, '')
    .trim();
  // Quitar artículo restante al inicio: "la Universidad", "el Hotel", "los Pinos"
  out = out.replace(/^\s*(?:la|el|los|las)\s+/i, '');
  // Capitalizar primera letra para verse limpio
  return out.replace(/^./, c => c.toUpperCase());
}

// Extrae m² del texto. Reconoce: "1360 m2", "20 metros cuadrados", "100 mts",
// "20 metros" (asume m² aunque no diga "cuadrados"). Devuelve string con el
// número o '' si no hay match plausible.
// CASO LÍMITE: en "544 metros y 4 cm" debe sacar 544 (no el 4 que es altura).
function extractM2(text) {
  if (!text) return '';
  const T = String(text);
  // Patrón 1 (más confiable): número + m² / m2 / metros cuadrados / mts
  const re1 = /(\d{1,5}(?:[.,]\d+)?)\s*(?:m[²2³³2³]|mts?\.?|metros?\s*cuadrados?)/i;
  const m1 = T.match(re1);
  if (m1) return m1[1].replace(',', '.');
  // Patrón 2 (más permisivo): "X metros" sin sufijo "cuadrados". Asume m² si el
  // número es >= 10 (medidas más pequeñas suelen ser linear/altura).
  const re2 = /(\d{2,5})\s*metros?\b/i;
  const m2 = T.match(re2);
  if (m2 && parseInt(m2[1], 10) >= 10) return m2[1];
  return '';
}

// Extrae altura / grosor del pasto. Reconoce: "4 cm", "50mm", "40 mm de pasto".
function extractAltura(text) {
  if (!text) return '';
  const T = String(text);
  const m = T.match(/(\d{1,3}(?:[.,]\d+)?)\s*(cm|mm)\b/i);
  return m ? `${m[1].replace(',', '.')}${m[2].toLowerCase()}` : '';
}

// Detecta el tipo de cancha mencionado en el chat / mensaje. Devuelve canonical name.
function extractTipoCancha(text) {
  if (!text) return '';
  const T = String(text).toLowerCase();
  // Orden importa: más específicos primero
  if (/f[uú]tbol\s*(?:r[aá]pido|5)/.test(T)) return 'Fútbol Rápido';
  if (/f[uú]tbol\s*(?:siete|7)/.test(T)) return 'Fútbol 7';
  if (/f[uú]tbol\s*(?:americano|am)/.test(T)) return 'Fútbol Americano';
  if (/f[uú]tbol\s*(?:sala|sal[oó]n)/.test(T)) return 'Fútbol Sala';
  if (/\bp[aá]del\b/.test(T)) return 'Pádel';
  if (/\bpickleball\b/.test(T)) return 'Pickleball';
  if (/\btenis\b/.test(T)) return 'Tenis';
  if (/\bbasquet|baloncesto|basketball\b/.test(T)) return 'Basquetbol';
  if (/\bvolei|voleibol|volley/.test(T)) return 'Voleibol';
  if (/\bb[eé]isbol|baseball/.test(T)) return 'Béisbol';
  if (/\bsoccer\b/.test(T)) return 'Fútbol';
  if (/\bf[uú]tbol\b/.test(T)) return 'Fútbol'; // genérico al final
  if (/\bputting\s*green\b/.test(T)) return 'Putting Green';
  if (/\bgolf\b/.test(T)) return 'Golf';
  return '';
}

// Reconoce nombres como lo haría un CRM serio: incluye Unicode (Müller, Núñez,
// Çağlar), apóstrofes (D'Angelo, O'Brien), guiones (García-López), puntos de
// abreviatura (J.R., Sr.), números romanos sufijo (Maximiliano III).
// Rechaza solo lo que claramente NO es nombre: puro dígitos, mensajes largos,
// emails, URLs.
function looksLikeName(s) {
  if (!s) return false;
  const t = s.trim();
  if (t.length < 2 || t.length > 80) return false;
  // descarta cualquier cosa que parezca email o URL
  if (/@|https?:\/\/|www\./i.test(t)) return false;
  // descarta secuencias largas de dígitos (no nombre)
  if (/\d{4,}/.test(t)) return false;
  // máximo 6 palabras (nombres compuestos largos existen: "Ana María de los Santos Pérez")
  const words = t.split(/\s+/);
  if (words.length > 6) return false;
  // núcleo del check: usa propiedad Unicode \p{L} para CUALQUIER letra del mundo,
  // permite apóstrofes (rectos y curvos), guiones, puntos de abreviatura y espacios.
  // Permite además sufijos romanos cortos (I, II, III, IV).
  // Requiere que AL MENOS un caracter sea letra (no solo signos).
  if (!/\p{L}/u.test(t)) return false;
  return /^[\p{L}\p{M}.'’\-\s]+(?:\s+(?:I{1,3}|IV|V|VI{0,3}|IX|X))?$/u.test(t);
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

  // FILTRO ANTI-SPAM (Olga 2026-06-10, ampliado 2026-06-13): bots tipo "1win_ypkt" con WhatsApp "0",
  // URL con "Agente de usuario", nombre puro dígitos, y pitches de SEO services en inglés.
  if (esSpamElementor({ nombre, whatsapp, url, mensaje })) return null;

  const params = parseQueryParams(url);
  const gclid = params.gclid || '';
  const gadCampaign = params.gad_campaignid || '';
  const isPaid = !!(gclid || params.gad_source || params.gbraid || params.wbraid);

  const { host, path } = splitUrl(url);
  const fuente = isPaid ? ('google_ads_' + domainSlug(host)) : 'form_organico';
  const landing = (host ? host.replace(/^www\./, '') : '') + (path || '');
  const waNorm = (whatsapp || '').replace(/\D/g, '').slice(-10);

  // Extraer m²/altura/tipo de cancha del mensaje (Olga 2026-06-10: Homer "20 metros")
  const fullText = `${mensaje || ''} ${path || ''}`;
  const m2 = extractM2(fullText);
  const altura = extractAltura(fullText);
  const tipoCancha = extractTipoCancha(fullText);

  // Comentarios enriquecidos
  const lineasC = [];
  if (mensaje && mensaje.trim()) lineasC.push(mensaje.trim());
  if (tipoCancha) lineasC.push(`Tipo: ${tipoCancha}`);
  if (m2) lineasC.push(`m²: ${m2}`);
  if (altura) lineasC.push(`Altura del pasto: ${altura}`);
  if (email) lineasC.push(`Email: ${email}`);
  const comentarios = lineasC.filter(Boolean).join('\n');

  return {
    session_id: sessionId,
    fuente,
    landing: landing || domainSlug(host),
    nombre: nombre || '',
    whatsapp: whatsapp || '',
    wa_norm: waNorm,
    ciudad: '',
    estado: '',
    m2: m2 || '',                // ← Olga 2026-06-10: capturar m² del mensaje
    tipo_cliente: tipoCancha,    // ← tipo de cancha si se detectó
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

// Palabras-unidad que indican que un número NO es teléfono sino medida.
// Si después de la secuencia de dígitos aparece una de éstas, se descarta.
const UNIT_WORDS_RE = /^\s*(metros?|mts|m[²2³3]|cm|cms|mm|km|kg|kilos?|grs?|gramos?|litros?|lts|años?|d[ií]as?|meses|horas?|min(?:utos?)?|pesos?|usd|mxn|d[oó]lares|euros?|cuadrad[oa]s?|amplios?|de\s+ancho|de\s+largo|de\s+alto|x|por|×)\b/i;

// Extrae el PRIMER teléfono válido (10 dígitos MX) de un texto. Inteligente:
//   - Reconoce con/sin prefijo +52, con separadores ( ) - . espacios
//   - Excluye matches seguidos de palabra-unidad ("5440 metros" no es teléfono)
//   - Acepta fallback de 8-9 dígitos solo si no encontró 10
// Devuelve string de dígitos (10 o 8-9) o '' si no hay nada plausible.
function extractPhone(text) {
  if (!text) return '';
  const candidates = [];
  // Match: opcional +52 / 52, primer dígito, hasta 17 chars de [dígitos/separadores], último dígito.
  const re = /(\+?5?2?[\s\-]?)?(\d[\d\s\-().]{6,16}\d)/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const raw = m[0];
    const start = m.index;
    const end = re.lastIndex;
    const digits = raw.replace(/\D/g, '');
    if (digits.length < 8 || digits.length > 13) continue;
    // Excluir si justo después viene una palabra-unidad ("5440 metros y 4cm")
    const after = text.slice(end, end + 25);
    if (UNIT_WORDS_RE.test(after)) continue;
    // Excluir si justo antes viene "$" (es precio, no teléfono)
    const before = text.slice(Math.max(0, start - 3), start);
    if (/\$\s*$/.test(before)) continue;
    candidates.push(digits.slice(-10).length >= 10 ? digits.slice(-10) : digits);
  }
  // Preferir 10 dígitos. Si no hay, devolver el primer 8-9.
  const ten = candidates.find(c => c.length === 10);
  if (ten) return ten;
  return candidates[0] || '';
}

// Wrapper retrocompatible: busca en líneas "Contacto: ..." del chat Cliengo.
// Bug Olga 2026-06-10: el viejo agarraba "Contacto: 5440 metros" como teléfono.
function extractPhoneFromChat(body) {
  // Recorrer cada línea Contacto: para no mezclar entre turnos
  const lineas = String(body || '').split('\n');
  for (const ln of lineas) {
    const m = ln.match(/^\s*Contacto:\s*(.+)$/i);
    if (!m) continue;
    const phone = extractPhone(m[1]);
    if (phone && phone.length >= 10) return phone;
  }
  return '';
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
