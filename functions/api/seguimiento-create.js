/**
 * POST /api/seguimiento-create
 * Body: { password, lead_id, tipo, descripcion?, resultado?, proximo_paso?, fecha_proxima_accion? }
 * Devuelve: { ok, id }
 *
 * Auth: password = master "Cancha2026!" o password de usuario en tabla users.
 * El vendedor se toma del username del que envía (validamos contra users).
 */
const MASTER = "Cancha2026!";
const SECRET = "sm-f7-2026-7Kx9Lm2Qp-secret";

const TIPOS_VALIDOS = ['llamada', 'whatsapp', 'email', 'reunion', 'visita', 'otro'];

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

async function authVendedor(env, password, username) {
  if (!password) return null;
  if (password === MASTER) return username || 'Admin';
  try {
    const hash = await sha256hex(SECRET + ":" + password);
    const row = await env.DB
      .prepare("SELECT username FROM users WHERE password_hash = ?")
      .bind(hash).first();
    return row ? row.username : null;
  } catch (e) { return null; }
}

export async function onRequestPost({ request, env }) {
  let p = {};
  try { p = await request.json(); }
  catch { return json({ ok: false, error: "Bad JSON" }, 400); }

  const password = String(p.password || "");
  const lead_id = parseInt(p.lead_id, 10);
  const tipo = String(p.tipo || "").toLowerCase().trim();
  const descripcion = (p.descripcion || "").toString().trim().slice(0, 2000);
  const resultado = (p.resultado || "").toString().trim().slice(0, 100);
  const proximo_paso = (p.proximo_paso || "").toString().trim().slice(0, 500);
  const fecha_proxima_accion = (p.fecha_proxima_accion || "").toString().trim().slice(0, 50);

  if (!password) return json({ ok: false, error: "Falta password" }, 401);
  if (!lead_id || lead_id < 1) return json({ ok: false, error: "lead_id inválido" }, 400);
  if (!TIPOS_VALIDOS.includes(tipo)) return json({ ok: false, error: "tipo inválido (válidos: " + TIPOS_VALIDOS.join(', ') + ")" }, 400);

  const vendedor = await authVendedor(env, password, p.username);
  if (!vendedor) return json({ ok: false, error: "Auth falló" }, 401);

  try {
    const res = await env.DB
      .prepare("INSERT INTO seguimientos (lead_id, vendedor, tipo, descripcion, resultado, proximo_paso, fecha_proxima_accion) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .bind(lead_id, vendedor, tipo, descripcion || null, resultado || null, proximo_paso || null, fecha_proxima_accion || null)
      .run();
    return json({ ok: true, id: res.meta.last_row_id, vendedor });
  } catch (e) {
    return json({ ok: false, error: "DB: " + e.message }, 500);
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "POST, OPTIONS",
      "access-control-allow-headers": "content-type"
    }
  });
}
