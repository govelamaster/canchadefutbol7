/**
 * POST /api/lead-delete
 * Elimina un lead de la base D1. Requiere password de admin.
 *
 * Body (FormData o JSON):
 *   p:   admin password
 *   id:  lead id
 */

const ADMIN_PASSWORD = "Cancha2026!";

export async function onRequestPost(context) {
  const { request, env } = context;

  let payload = {};
  const contentType = request.headers.get("content-type") || "";
  try {
    if (contentType.includes("application/json")) {
      payload = await request.json();
    } else {
      const fd = await request.formData();
      for (const [k, v] of fd.entries()) payload[k] = v;
    }
  } catch (err) {
    return jsonError("Bad request: " + err.message, 400);
  }

  if (payload.p !== ADMIN_PASSWORD) {
    return jsonError("Unauthorized", 401);
  }

  const id = parseInt(payload.id, 10);
  if (!id) return jsonError("Missing id", 400);

  try {
    const result = await env.DB.prepare("DELETE FROM leads WHERE id = ?")
      .bind(id)
      .run();

    return new Response(
      JSON.stringify({ ok: true, changes: result.meta.changes }),
      { headers: { "content-type": "application/json" } }
    );
  } catch (err) {
    return jsonError("DB error: " + err.message, 500);
  }
}

function jsonError(msg, status) {
  return new Response(JSON.stringify({ ok: false, error: msg }), {
    status,
    headers: { "content-type": "application/json" }
  });
}
