/**
 * /api/plantillas — Plantillas de WhatsApp con campos {nombre} {ciudad} {m2} {vendedor}.
 * GET                                  -> lista (abierto: los vendedores las necesitan para responder)
 * POST {p, action:'add', emoji, titulo, mensaje}     -> agrega (solo Super Admin)
 * POST {p, action:'update', id, emoji, titulo, mensaje} -> edita
 * POST {p, action:'delete', id}                      -> elimina
 */
const MASTER = "Cancha2026!";

function json(o, s) {
  return new Response(JSON.stringify(o), {
    status: s || 200,
    headers: { "content-type": "application/json", "access-control-allow-origin": "*" }
  });
}

export async function onRequestGet({ env }) {
  try {
    const rs = await env.DB.prepare("SELECT id, emoji, titulo, mensaje, orden FROM plantillas ORDER BY orden, id").all();
    return json({ ok: true, plantillas: rs.results || [] });
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
      await env.DB.prepare("DELETE FROM plantillas WHERE id = ?").bind(id).run();
      return json({ ok: true });
    }
    const emoji = String(p.emoji || "").trim().slice(0, 8);
    const titulo = String(p.titulo || "").trim().slice(0, 60);
    const mensaje = String(p.mensaje || "").trim().slice(0, 600);
    if (!titulo || !mensaje) return json({ ok: false, error: "Falta título o mensaje" }, 400);

    if (p.action === "update") {
      const id = parseInt(p.id, 10);
      if (!id) return json({ ok: false, error: "Missing id" }, 400);
      await env.DB.prepare("UPDATE plantillas SET emoji=?, titulo=?, mensaje=? WHERE id=?")
        .bind(emoji, titulo, mensaje, id).run();
      return json({ ok: true });
    }
    // add
    const row = await env.DB.prepare("SELECT COALESCE(MAX(orden),0)+1 AS n FROM plantillas").first();
    await env.DB.prepare("INSERT INTO plantillas (emoji, titulo, mensaje, orden) VALUES (?, ?, ?, ?)")
      .bind(emoji, titulo, mensaje, (row && row.n) || 1).run();
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
