/**
 * POST /api/lead-update
 * Actualiza campos editables de un lead: vendedor, tipo_cliente,
 * status_proyecto, notas_internas. Requiere password y auto-marca
 * tocado_por + tocado_fecha.
 *
 * Body (FormData o JSON):
 *   p:            admin password
 *   id:           lead id
 *   asistente:    nombre de quien edita (Olga / Maribel / ...)
 *   field:        vendedor | tipo_cliente | status_proyecto | notas_internas
 *   value:        nuevo valor (string)
 */

const ADMIN_PASSWORD = "Cancha2026!";
const ALLOWED_FIELDS = new Set([
  "vendedor",
  "tipo_cliente",
  "status_proyecto",
  "notas_internas",
  "nombre_real",
  "proxima_accion",
  "proxima_fecha",
  "razon_perdida",
  "ultimo_contacto_quien",
  "ultimo_contacto_fecha"
]);

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

  const field = String(payload.field || "");
  if (!ALLOWED_FIELDS.has(field)) {
    return jsonError("Invalid field: " + field, 400);
  }

  const value = String(payload.value ?? "");
  const asistente = String(payload.asistente || "anónimo").slice(0, 40);
  const now = new Date().toISOString().replace("T", " ").slice(0, 19);

  try {
    // SQL injection safe: field is whitelisted, value is parameterized
    const sql = `UPDATE leads SET ${field} = ?, tocado_por = ?, tocado_fecha = ? WHERE id = ?`;
    const result = await env.DB.prepare(sql)
      .bind(value, asistente, now, id)
      .run();

    return new Response(
      JSON.stringify({
        ok: true,
        changes: result.meta.changes,
        tocado_por: asistente,
        tocado_fecha: now
      }),
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
