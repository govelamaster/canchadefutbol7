/**
 * POST /api/track-visit
 * Recibe visita con gclid (u otros Google Ads click IDs) desde JS embebido en landings.
 * Guarda en visitor_clicks para luego cruzar con leads y exportar audiencias.
 *
 * Body JSON esperado:
 *   { gclid, gbraid, wbraid, gad_source, gad_campaignid, url, referrer, session_id }
 *
 * CORS abierto (sirve a cualquier dominio que tenga el snippet).
 */

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'POST, OPTIONS',
  'access-control-allow-headers': 'content-type',
  'access-control-max-age': '86400'
};

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const body = await request.json().catch(() => ({}));
    const gclid = String(body.gclid || '').slice(0, 200);
    const gbraid = String(body.gbraid || '').slice(0, 200);
    const wbraid = String(body.wbraid || '').slice(0, 200);

    // Si no trae NINGÚN click ID Google Ads, no guardamos (no es visita pagada)
    if (!gclid && !gbraid && !wbraid) {
      return new Response(JSON.stringify({ ok: false, error: 'no_click_id' }), {
        status: 200, headers: { ...CORS, 'content-type': 'application/json' }
      });
    }

    const url = String(body.url || '').slice(0, 1000);
    let domain = '', path = '';
    try { const u = new URL(url); domain = u.hostname.replace(/^www\./,''); path = u.pathname; } catch (_) {}

    const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-real-ip') || '';
    const ua = request.headers.get('user-agent') || '';

    await env.DB.prepare(`
      INSERT OR IGNORE INTO visitor_clicks
        (gclid, gbraid, wbraid, gad_source, gad_campaignid, url, domain, path, referrer, ip, user_agent, session_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      gclid,
      gbraid,
      wbraid,
      String(body.gad_source || '').slice(0, 50),
      String(body.gad_campaignid || '').slice(0, 50),
      url,
      domain,
      path,
      String(body.referrer || '').slice(0, 500),
      ip,
      ua.slice(0, 500),
      String(body.session_id || '').slice(0, 64)
    ).run();

    return new Response(JSON.stringify({ ok: true }), {
      status: 200, headers: { ...CORS, 'content-type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 500, headers: { ...CORS, 'content-type': 'application/json' }
    });
  }
}
