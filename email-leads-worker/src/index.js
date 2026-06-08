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

    try {
      await env.DB.prepare(`
        INSERT INTO leads
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
  const nombre = pick(body, /^\s*Nombre:\s*(.+)$/im) || extractNameFromChat(body);
  const telefono = pick(body, /^\s*Tel[eé]fono:\s*(.+)$/im) || extractPhoneFromChat(body);
  const ubicacion = pick(body, /^\s*Ubicaci[oó]n:\s*(.+)$/im);
  const page = pick(body, /^\s*Page:\s*(.+)$/im);
  const fuenteCliengo = (pick(body, /^\s*Fuente:\s*(.+)$/im) || '').toLowerCase();
  const medio = (pick(body, /^\s*Medio:\s*(.+)$/im) || '').toLowerCase();

  let fuente = 'cliengo_web';
  if (fuenteCliengo.includes('facebook') || medio.includes('facebook')) fuente = 'cliengo_facebook';
  else if (fuenteCliengo.includes('instagram') || medio.includes('instagram')) fuente = 'cliengo_instagram';

  const { ciudad, estado } = splitCityState(ubicacion);
  const waNorm = (telefono || '').replace(/\D/g, '').slice(-10);
  const chatText = extractChatTranscript(body);

  return {
    session_id: sessionId,
    fuente,
    landing,
    nombre: nombre || '',
    whatsapp: telefono || '',
    wa_norm: waNorm,
    ciudad,
    estado,
    url: page || '',
    campania: landing,
    comentarios: chatText,
    user_agent: '',
    ip: ''
  };
}

function parseElementor({ subject, body, sessionId }) {
  if (!/Funciona con:\s*Elementor/i.test(body) && !/URL de la p[aá]gina:/i.test(body)) return null;

  const nombre = pick(body, /^\s*Nombre:\s*(.+)$/im);
  const email = pick(body, /^\s*Email:\s*(.+)$/im);
  const whatsapp = pick(body, /^\s*(?:WhatsApp|Tel[eé]fono|Phone):\s*(.+)$/im);
  const mensaje = pick(body, /^\s*(?:Mensaje|Comentarios|Message|Comments):\s*([\s\S]+?)(?=\n---|\nFecha:|\nURL de|\n\s*$)/im);
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
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|tr|li|h\d)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"');
}

function simpleHash(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h.toString(36);
}
