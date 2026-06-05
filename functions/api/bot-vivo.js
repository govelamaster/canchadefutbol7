/**
 * GET /api/bot-vivo?p=PASSWORD
 * Devuelve los chats del bot de los últimos 30 minutos (parciales y completos).
 * Para el monitoreo en vivo del dashboard.
 * Requiere clave maestra o admin (mismo modelo que /api/leads).
 */
const MASTER = "Cancha2026!";
const SECRET = "sm-f7-2026-7Kx9Lm2Qp-secret";

async function sha(s) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, "0")).join("");
}
function json(o, s) {
  return new Response(JSON.stringify(o), { status: s || 200, headers: { "content-type": "application/json", "access-control-allow-origin": "*" } });
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const pwd = url.searchParams.get("p") || "";
  let ok = pwd === MASTER;
  if (!ok && pwd) {
    try {
      const h = await sha(SECRET + ":" + pwd);
      const row = await env.DB.prepare("SELECT 1 FROM users WHERE password_hash = ? LIMIT 1").bind(h).first();
      ok = !!row;
    } catch (e) {}
  }
  if (!ok) return json({ ok: false, error: "Unauthorized" }, 401);

  try {
    const rs = await env.DB.prepare(
      `SELECT id, fecha, session_id, estado, nombre, whatsapp, ciudad, m2, timeline, comentarios, url, gclid, campania, vendedor, status_proyecto
       FROM leads
       WHERE fecha >= datetime('now','-30 minutes')
       ORDER BY fecha DESC
       LIMIT 100`
    ).all();
    return json({ ok: true, chats: rs.results || [], serverNow: new Date().toISOString() });
  } catch (e) { return json({ ok: false, error: "DB: " + e.message }, 500); }
}
