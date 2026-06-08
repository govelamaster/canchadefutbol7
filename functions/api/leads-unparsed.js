/**
 * GET /api/leads-unparsed?p=<password>
 * Devuelve los correos que el Email Worker no pudo clasificar.
 * Para tab "Sin clasificar" del admin.
 */

const ADMIN_PASSWORD = "Cancha2026!";
const SECRET = "sm-f7-2026-7Kx9Lm2Qp-secret";

async function sha256hex(s) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, "0")).join("");
}

async function authorized(env, pwd) {
  if (!pwd) return false;
  if (pwd === ADMIN_PASSWORD) return true;
  try {
    const h = await sha256hex(SECRET + ":" + pwd);
    const row = await env.DB.prepare("SELECT 1 FROM users WHERE password_hash = ? LIMIT 1").bind(h).first();
    return !!row;
  } catch (e) { return false; }
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const auth = url.searchParams.get('p') || request.headers.get('x-admin-password');

  if (!(await authorized(env, auth))) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { 'content-type': 'application/json' }
    });
  }

  try {
    const result = await env.DB.prepare(`
      SELECT id, received_at, sender, recipient, subject, reason, raw, reviewed
      FROM leads_unparsed
      ORDER BY received_at DESC
      LIMIT 500
    `).all();

    return new Response(JSON.stringify({ ok: true, count: result.results.length, items: result.results }), {
      headers: { 'content-type': 'application/json', 'cache-control': 'no-store' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 500, headers: { 'content-type': 'application/json' }
    });
  }
}
