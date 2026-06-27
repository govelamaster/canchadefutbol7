/**
 * GET /api/seguimientos?p=PASSWORD&lead_id=N
 *   o
 * GET /api/seguimientos?p=PASSWORD  (todos los seguimientos del vendedor)
 *
 * Auth: master ve todos los seguimientos; vendedor ve solo seguimientos donde vendedor=su username
 * (filtrado por seguridad: cuando se crea, vendedor se guarda según auth)
 *
 * Devuelve: { ok, count, seguimientos: [...] }
 */
const MASTER = "Cancha2026!";
const SECRET = "sm-f7-2026-7Kx9Lm2Qp-secret";

async function sha256hex(s) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
}

function json(o, s) {
  return new Response(JSON.stringify(o), {
    status: s || 200,
    headers: { "content-type": "application/json", "access-control-allow-origin": "*" }
  });
}

async function getAuthInfo(env, password) {
  if (!password) return null;
  if (password === MASTER) return { username: 'admin', role: 'admin', isMaster: true };
  try {
    const hash = await sha256hex(SECRET + ":" + password);
    const row = await env.DB
      .prepare("SELECT username, role FROM users WHERE password_hash = ?")
      .bind(hash).first();
    if (!row) return null;
    return { username: row.username, role: row.role || 'vendedor', isMaster: false };
  } catch { return null; }
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const password = url.searchParams.get('p') || '';
  const lead_id = parseInt(url.searchParams.get('lead_id') || '0', 10);
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '500', 10), 1000);

  const auth = await getAuthInfo(env, password);
  if (!auth) return json({ ok: false, error: "Auth falló" }, 401);

  // Admin (super_admin / admin) ve TODO. Vendedor ve solo los suyos.
  const seeAll = auth.isMaster || auth.role === 'admin' || auth.role === 'super_admin';

  try {
    let q, binds;
    if (lead_id > 0) {
      // Por lead específico — vendedor solo si es el suyo o admin
      if (seeAll) {
        q = "SELECT id, lead_id, vendedor, tipo, descripcion, resultado, proximo_paso, fecha_proxima_accion, created_at FROM seguimientos WHERE lead_id = ? ORDER BY created_at DESC LIMIT ?";
        binds = [lead_id, limit];
      } else {
        q = "SELECT id, lead_id, vendedor, tipo, descripcion, resultado, proximo_paso, fecha_proxima_accion, created_at FROM seguimientos WHERE lead_id = ? AND vendedor = ? COLLATE NOCASE ORDER BY created_at DESC LIMIT ?";
        binds = [lead_id, auth.username, limit];
      }
    } else {
      // Todos los seguimientos visibles para este user
      if (seeAll) {
        q = "SELECT id, lead_id, vendedor, tipo, descripcion, resultado, proximo_paso, fecha_proxima_accion, created_at FROM seguimientos ORDER BY created_at DESC LIMIT ?";
        binds = [limit];
      } else {
        q = "SELECT id, lead_id, vendedor, tipo, descripcion, resultado, proximo_paso, fecha_proxima_accion, created_at FROM seguimientos WHERE vendedor = ? COLLATE NOCASE ORDER BY created_at DESC LIMIT ?";
        binds = [auth.username, limit];
      }
    }
    const res = await env.DB.prepare(q).bind(...binds).all();
    return json({ ok: true, count: res.results.length, seguimientos: res.results });
  } catch (e) {
    return json({ ok: false, error: "DB: " + e.message }, 500);
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET, OPTIONS",
      "access-control-allow-headers": "content-type"
    }
  });
}
