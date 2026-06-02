/**
 * GET /api/leads?p=<password>
 * Devuelve todos los leads en JSON. Protegido con password simple.
 */

const ADMIN_PASSWORD = "Cancha2026!";
const SECRET = "sm-f7-2026-7Kx9Lm2Qp-secret";

async function sha256hex(s) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, "0")).join("");
}
// Autorizado si es la clave maestra O la contraseña de un usuario registrado.
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
      status: 401,
      headers: { 'content-type': 'application/json' }
    });
  }

  try {
    const result = await env.DB.prepare(`
      SELECT id, fecha, session_id, estado, nombre, whatsapp, ciudad, m2, timeline, comentarios, fuente,
             url, gclid, campania,
             vendedor, tipo_cliente, status_proyecto, notas_internas, tocado_por, tocado_fecha
      FROM leads
      ORDER BY fecha DESC
      LIMIT 5000
    `).all();

    return new Response(JSON.stringify({
      ok: true,
      count: result.results.length,
      leads: result.results
    }), {
      headers: {
        'content-type': 'application/json',
        'cache-control': 'no-store'
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 500,
      headers: { 'content-type': 'application/json' }
    });
  }
}
