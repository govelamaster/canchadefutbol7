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
      // id del lead (para el botón "Asignar desde el correo")
      let leadId = null;
      try {
        const row = await env.DB.prepare("SELECT id FROM leads WHERE session_id = ? ORDER BY id DESC LIMIT 1").bind(sid).first();
        leadId = row ? row.id : null;
      } catch (e) { leadId = null; }
      const emailCtx = context.waitUntil ? context : null;
      const send = sendLeadEmail(env, payload, request, leadId);
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
// Secreto para firmar el enlace "Asignar desde el correo" (mismo en assign.js).
const ASSIGN_SECRET = "sm-assign-7Kx9-2026";
async function sha256hex(s) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, "0")).join("");
}

async function sendLeadEmail(env, d, request, leadId) {
  try {
    const to = env.LEADS_EMAIL || 'formulariosweb2021@gmail.com';
    // El "from" debe ser de un dominio verificado en Resend (canchadefutbol7.mx).
    const from = env.LEADS_FROM || 'Leads canchadefutbol7 <leads@canchadefutbol7.mx>';
    const esc = (s) => String(s || '-').replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));
    const wa = (d.whatsapp || '').replace(/\D/g, '');
    const com = String(d.comentarios || '');
    const tipo = (com.match(/Tipo:\s*([^·]+)/i) || [,''])[1].trim();
    const accesorios = (com.match(/Accesorios:\s*(.+)$/i) || [,''])[1].trim();
    const subject = `Nuevo lead${d.fuente ? ' (' + d.fuente + ')' : ''}: ${d.nombre || 'sin nombre'}${d.ciudad ? ' — ' + d.ciudad : ''}`;
    const row = (k, v) => `<tr><td style="padding:4px 14px 4px 0;color:#64748b">${k}</td><td style="padding:4px 0;font-weight:600">${v}</td></tr>`;
    let assignBtn = '';
    if (leadId) {
      const t = (await sha256hex(ASSIGN_SECRET + ':' + leadId)).slice(0, 24);
      assignBtn = `<a href="https://canchadefutbol7.mx/api/assign?id=${leadId}&t=${t}" style="display:inline-block;margin:6px 0 4px;background:#3f922a;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:13px 24px;border-radius:10px">🎯 Asignar a un vendedor</a>`;
    }
    const html = `
      <div style="font-family:system-ui,-apple-system,sans-serif;color:#0f172a">
        <h2 style="margin:0 0 14px">Nuevo lead de canchadefutbol7.mx</h2>
        <table style="font-size:14px;border-collapse:collapse">
          ${row('Nombre', esc(d.nombre))}
          ${row('WhatsApp', `${esc(d.whatsapp)}${wa ? ` &nbsp;<a href="https://wa.me/52${wa.slice(-10)}">abrir chat</a>` : ''}`)}
          ${row('Ciudad', esc(d.ciudad))}
          ${row('m²', esc(d.m2))}
          ${row('Inicio', esc(d.timeline))}
          ${row('Tipo de cancha', esc(tipo || '-'))}
          ${row('Accesorios', esc(accesorios || '-'))}
          ${row('Fuente', `${esc(d.fuente)}${d.campania ? ' · ' + esc(d.campania) : ''}`)}
        </table>
        ${assignBtn}
        <p style="font-size:12px;color:#64748b;margin-top:16px">Panel de leads: <a href="https://canchadefutbol7.mx/admin">canchadefutbol7.mx/admin</a></p>
      </div>`;

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
