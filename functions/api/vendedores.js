/**
 * /api/vendedores — Directorio del equipo (nombre, correo, WhatsApp). Solo Super Admin.
 * GET  ?p=PASSWORD                                  -> lista
 * POST {p, id, email, whatsapp}                     -> actualiza correo/WhatsApp
 * POST {p, action:'add', nombre, email, whatsapp}   -> agrega
 * POST {p, action:'delete', id}                     -> elimina
 */
const MASTER = "Cancha2026!";

function json(o, s) {
  return new Response(JSON.stringify(o), {
    status: s || 200,
    headers: { "content-type": "application/json", "access-control-allow-origin": "*" }
  });
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  if (url.searchParams.get("p") !== MASTER) return json({ ok: false, error: "Unauthorized" }, 401);
  try {
    const rs = await env.DB.prepare("SELECT id, nombre, email, whatsapp FROM vendedores ORDER BY nombre COLLATE NOCASE").all();
    return json({ ok: true, vendedores: rs.results || [] });
  } catch (e) { return json({ ok: false, error: e.message }, 500); }
}

export async function onRequestPost({ request, env }) {
  let p = {};
  const ct = request.headers.get("content-type") || "";
  try {
    if (ct.includes("application/json")) p = await request.json();
    else { const fd = await request.formData(); for (const [k, v] of fd.entries()) p[k] = v; }
  } catch (e) { return json({ ok: false, error: "Bad request" }, 400); }

  if (p.p !== MASTER) return json({ ok: false, error: "Unauthorized" }, 401);

  try {
    if (p.action === "delete") {
      const id = parseInt(p.id, 10);
      if (!id) return json({ ok: false, error: "Missing id" }, 400);
      await env.DB.prepare("DELETE FROM vendedores WHERE id = ?").bind(id).run();
      return json({ ok: true });
    }
    if (p.action === "add") {
      const nombre = String(p.nombre || "").trim();
      if (!nombre) return json({ ok: false, error: "Falta el nombre" }, 400);
      await env.DB.prepare("INSERT OR IGNORE INTO vendedores (nombre, email, whatsapp) VALUES (?, ?, ?)")
        .bind(nombre.slice(0, 60), String(p.email || "").trim().slice(0, 120), String(p.whatsapp || "").trim().slice(0, 30)).run();
      return json({ ok: true });
    }
    // update email + whatsapp
    const id = parseInt(p.id, 10);
    if (!id) return json({ ok: false, error: "Missing id" }, 400);
    await env.DB.prepare("UPDATE vendedores SET email = ?, whatsapp = ? WHERE id = ?")
      .bind(String(p.email || "").trim().slice(0, 120), String(p.whatsapp || "").trim().slice(0, 30), id).run();
    return json({ ok: true });
  } catch (e) { return json({ ok: false, error: e.message }, 500); }
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
