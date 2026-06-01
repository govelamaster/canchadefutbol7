/**
 * POST /api/lead
 * Recibe el form de cotizar.html y guarda en D1.
 * Acepta FormData o JSON.
 */

export async function onRequestPost(context) {
  const { request, env } = context;

  // Parse body (form-data o json)
  let payload = {};
  const contentType = request.headers.get('content-type') || '';
  try {
    if (contentType.includes('application/json')) {
      payload = await request.json();
    } else {
      const fd = await request.formData();
      for (const [k, v] of fd.entries()) payload[k] = v;
    }
  } catch (err) {
    return jsonError('Bad request: ' + err.message, 400);
  }

  try {
    const sid = (payload.session_id || '').trim();
    let changed = 0;

    // Si ya existe una fila con este session_id (ej. guardado "parcial"),
    // la actualizamos en vez de crear una duplicada.
    if (sid) {
      const upd = await env.DB.prepare(`
        UPDATE leads SET
          estado = ?, nombre = ?, whatsapp = ?, ciudad = ?, m2 = ?,
          timeline = ?, comentarios = ?, fuente = ?, url = ?, gclid = ?, campania = ?
        WHERE session_id = ?
      `).bind(
        payload.estado || '',
        payload.nombre || '',
        payload.whatsapp || '',
        payload.ciudad || '',
        payload.m2 || '',
        payload.timeline || '',
        payload.comentarios || '',
        payload.fuente || '',
        payload.url || '',
        payload.gclid || '',
        payload.campania || '',
        sid
      ).run();
      changed = (upd.meta && upd.meta.changes) || 0;
    }

    if (!changed) {
      await env.DB.prepare(`
        INSERT INTO leads
          (session_id, estado, nombre, whatsapp, ciudad, m2, timeline, comentarios, fuente, url, gclid, campania, ip, user_agent)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        sid,
        payload.estado || '',
        payload.nombre || '',
        payload.whatsapp || '',
        payload.ciudad || '',
        payload.m2 || '',
        payload.timeline || '',
        payload.comentarios || '',
        payload.fuente || '',
        payload.url || '',
        payload.gclid || '',
        payload.campania || '',
        request.headers.get('cf-connecting-ip') || '',
        request.headers.get('user-agent') || ''
      ).run();
    }

    // Aviso por correo (Resend) — NO bloquea la respuesta y es opcional:
    // si falta RESEND_API_KEY simplemente se omite. Solo avisamos en leads
    // "completos" o de formulario para no spamear con los parciales del bot.
    const esParcial = (payload.estado || '').toLowerCase() === 'parcial';
    if (!esParcial && env.RESEND_API_KEY) {
      const emailCtx = context.waitUntil ? context : null;
      const send = sendLeadEmail(env, payload, request);
      if (emailCtx) emailCtx.waitUntil(send); else await send;
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: corsHeaders('application/json')
    });
  } catch (err) {
    return jsonError('DB error: ' + err.message, 500);
  }
}

// Envía el lead por correo vía Resend. Silencioso ante errores.
async function sendLeadEmail(env, d, request) {
  try {
    const to = env.LEADS_EMAIL || 'formulariosweb2021@gmail.com';
    // El "from" debe ser de un dominio verificado en Resend (canchadefutbol7.mx).
    const from = env.LEADS_FROM || 'Leads canchadefutbol7 <leads@canchadefutbol7.mx>';
    const esc = (s) => String(s || '-').replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));
    const wa = (d.whatsapp || '').replace(/\D/g, '');
    const subject = `Nuevo lead${d.fuente ? ' (' + d.fuente + ')' : ''}: ${d.nombre || 'sin nombre'}${d.ciudad ? ' — ' + d.ciudad : ''}`;
    const html = `
      <h2 style="font-family:system-ui,sans-serif">Nuevo lead de canchadefutbol7.mx</h2>
      <table style="font-family:system-ui,sans-serif;font-size:14px;border-collapse:collapse">
        <tr><td><b>Nombre</b></td><td>${esc(d.nombre)}</td></tr>
        <tr><td><b>WhatsApp</b></td><td>${esc(d.whatsapp)}${wa ? ` &nbsp;<a href="https://wa.me/52${wa.slice(-10)}">abrir</a>` : ''}</td></tr>
        <tr><td><b>Ciudad</b></td><td>${esc(d.ciudad)}</td></tr>
        <tr><td><b>m²</b></td><td>${esc(d.m2)}</td></tr>
        <tr><td><b>Inicio</b></td><td>${esc(d.timeline)}</td></tr>
        <tr><td><b>Fuente</b></td><td>${esc(d.fuente)}</td></tr>
        <tr><td><b>Comentarios</b></td><td>${esc(d.comentarios)}</td></tr>
        <tr><td><b>Campaña</b></td><td>${esc(d.campania)}</td></tr>
        <tr><td><b>gclid</b></td><td>${esc(d.gclid)}</td></tr>
        <tr><td><b>URL</b></td><td>${esc(d.url)}</td></tr>
      </table>
      <p style="font-family:system-ui,sans-serif;font-size:12px;color:#64748b">Panel de leads: https://canchadefutbol7.mx/admin</p>`;

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to, subject, html }),
    });
  } catch (e) { /* silencioso: nunca rompe el guardado del lead */ }
}

// CORS preflight
export async function onRequestOptions() {
  return new Response(null, { headers: corsHeaders() });
}

function corsHeaders(contentType) {
  const h = {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'content-type'
  };
  if (contentType) h['content-type'] = contentType;
  return h;
}

function jsonError(msg, status) {
  return new Response(JSON.stringify({ ok: false, error: msg }), {
    status,
    headers: corsHeaders('application/json')
  });
}
