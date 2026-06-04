/**
 * /api/frases  — Frases motivacionales para proyectos >=3000 m² (correo al vendedor).
 * GET  ?p=PASSWORD              -> lista
 * POST {p, texto}              -> agrega
 * POST {p, action:'delete', id} -> elimina
 * Solo el Super Admin (contraseña maestra) gestiona.
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
    const rs = await env.DB.prepare("SELECT id, texto FROM frases ORDER BY id").all();
    return json({ ok: true, frases: rs.results || [] });
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
      await env.DB.prepare("DELETE FROM frases WHERE id = ?").bind(id).run();
      return json({ ok: true });
    }
    const texto = String(p.texto || "").trim();
    if (!texto) return json({ ok: false, error: "Texto vacío" }, 400);
    await env.DB.prepare("INSERT INTO frases (texto) VALUES (?)").bind(texto.slice(0, 300)).run();
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
