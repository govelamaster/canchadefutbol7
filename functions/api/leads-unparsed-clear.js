/**
 * POST /api/leads-unparsed-clear?p=<password>
 * Borra TODOS los correos sin clasificar de la tabla.
 * Solo super_admin.
 */

const ADMIN_PASSWORD = "Cancha2026!";
const SECRET = "sm-f7-2026-7Kx9Lm2Qp-secret";

async function sha256hex(s) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, "0")).join("");
}

async function authorizedSuperAdmin(env, pwd) {
  if (!pwd) return false;
  // Solo super_admin (password maestra) puede limpiar — no usuarios normales
  return pwd === ADMIN_PASSWORD;
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const auth = url.searchParams.get('p') || request.headers.get('x-admin-password');

  if (!(await authorizedSuperAdmin(env, auth))) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { 'content-type': 'application/json' }
    });
  }

  try {
    const before = await env.DB.prepare("SELECT COUNT(*) as n FROM leads_unparsed").first();
    await env.DB.prepare("DELETE FROM leads_unparsed").run();
    return new Response(JSON.stringify({ ok: true, deleted: (before && before.n) || 0 }), {
      headers: { 'content-type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 500, headers: { 'content-type': 'application/json' }
    });
  }
}
