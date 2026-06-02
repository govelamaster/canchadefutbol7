/**
 * POST /api/login  { username, password }
 * Valida contra la contraseña maestra (jefa) o la tabla `users`.
 * Devuelve { ok, role, nombre }. La contraseña se usa luego como llave de API.
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

export async function onRequestPost({ request, env }) {
  let p = {};
  const ct = request.headers.get("content-type") || "";
  try {
    if (ct.includes("application/json")) p = await request.json();
    else { const fd = await request.formData(); for (const [k, v] of fd.entries()) p[k] = v; }
  } catch (e) { return json({ ok: false, error: "Bad request" }, 400); }

  const username = String(p.username || "").trim();
  const password = String(p.password || "");
  if (!password) return json({ ok: false, error: "Falta la contraseña" }, 400);

  // Llave maestra (jefa) — siempre entra como admin
  if (password === MASTER) return json({ ok: true, role: "admin", nombre: username || "Admin" });

  // Usuario de la tabla
  try {
    const hash = await sha256hex(SECRET + ":" + password);
    const row = await env.DB
      .prepare("SELECT username, role FROM users WHERE username = ? COLLATE NOCASE AND password_hash = ?")
      .bind(username, hash).first();
    if (row) return json({ ok: true, role: row.role || "vendedor", nombre: row.username });
  } catch (e) { return json({ ok: false, error: "DB: " + e.message }, 500); }

  return json({ ok: false, error: "Usuario o contraseña incorrectos" }, 401);
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
