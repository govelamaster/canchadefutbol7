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

    return new Response(JSON.stringify({ ok: true }), {
      headers: corsHeaders('application/json')
    });
  } catch (err) {
    return jsonError('DB error: ' + err.message, 500);
  }
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
