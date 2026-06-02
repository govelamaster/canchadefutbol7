/**
 * /api/users — gestión de usuarios (solo admin).
 *   GET  ?p=<clave admin>                  → lista usuarios (sin contraseñas)
 *   POST { p, action:'add'|'update'|'delete', id?, username?, password?, role? }
 * Admin = contraseña maestra o un usuario con role 'admin'.
 */
const MASTER = "Cancha2026!";
const SECRET = "sm-f7-2026-7Kx9Lm2Qp-secret";

async function sha(s) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, "0")).join("");
}
function json(o, s) {
  return new Response(JSON.stringify(o), {
    status: s || 200,
    headers: { "content-type": "application/json", "access-control-allow-origin": "*" }
  });
}
async function isAdmin(env, pwd) {
  if (!pwd) return false;
  if (pwd === MASTER) return true;
  const h = await sha(SECRET + ":" + pwd);
  const row = await env.DB.prepare("SELECT 1 FROM users WHERE password_hash = ? AND role = 'admin'").bind(h).first();
  return !!row;
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const pwd = url.searchParams.get("p") || request.headers.get("x-admin-password") || "";
  if (!(await isAdmin(env, pwd))) return json({ ok: false, error: "Unauthorized" }, 401);
  const r = await env.DB.prepare("SELECT id, username, role, created_at FROM users ORDER BY role DESC, username").all();
  return json({ ok: true, users: r.results });
}

export async function onRequestPost({ request, env }) {
  let p = {};
  const ct = request.headers.get("content-type") || "";
  try {
    if (ct.includes("application/json")) p = await request.json();
    else { const fd = await request.formData(); for (const [k, v] of fd.entries()) p[k] = v; }
  } catch (e) { return json({ ok: false, error: "Bad request" }, 400); }

  if (!(await isAdmin(env, String(p.p || "")))) return json({ ok: false, error: "Unauthorized" }, 401);

  const action = String(p.action || "add");
  try {
    if (action === "delete") {
      const id = parseInt(p.id, 10);
      if (!id) return json({ ok: false, error: "Falta id" }, 400);
      await env.DB.prepare("DELETE FROM users WHERE id = ?").bind(id).run();
      return json({ ok: true });
    }

    const username = String(p.username || "").trim();
    const password = String(p.password || "");
    const role = String(p.role || "vendedor") === "admin" ? "admin" : "vendedor";
    if (!username) return json({ ok: false, error: "Falta el nombre de usuario" }, 400);

    if (p.id) {
      const id = parseInt(p.id, 10);
      if (password) {
        const h = await sha(SECRET + ":" + password);
        await env.DB.prepare("UPDATE users SET username=?, role=?, password_hash=? WHERE id=?").bind(username, role, h, id).run();
      } else {
        await env.DB.prepare("UPDATE users SET username=?, role=? WHERE id=?").bind(username, role, id).run();
      }
      return json({ ok: true });
    }

    if (!password) return json({ ok: false, error: "Falta la contraseña" }, 400);
    const h = await sha(SECRET + ":" + password);
    await env.DB.prepare("INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)").bind(username, h, role).run();
    return json({ ok: true });
  } catch (e) {
    if (String(e.message).includes("UNIQUE")) return json({ ok: false, error: "Ese usuario ya existe" }, 409);
    return json({ ok: false, error: "DB: " + e.message }, 500);
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET, POST, OPTIONS",
      "access-control-allow-headers": "content-type"
    }
  });
}
