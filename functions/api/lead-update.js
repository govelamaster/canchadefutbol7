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
const SECRET = "sm-f7-2026-7Kx9Lm2Qp-secret";

async function sha256hex(s) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, "0")).join("");
}
async function authorized(env, pwd) {
  if (!pwd) return false;
  if (pwd === ADMIN_PASSWORD) return true;
  try {
    const h = await sha256hex(SECRET + ":" + pwd);
    const row = await env.DB.prepare("SELECT 1 FROM users WHERE password_hash = ? LIMIT 1").bind(h).first();
    return !!row;
  } catch (e) { return false; }
}

// Correo de cada vendedor para avisarle al asignarle un lead.
// ⬇️ Olga: pon aquí el correo de cada quien (deja "" a los que no tengan).
const VENDOR_EMAILS = {
  "Jorge Dantes": "jorgedantes@gmail.com",
  "Blanca López": "blancaelopezm@gmail.com",
  "Susana": "susanalopezlara@hotmail.com",
  "Carolina": "",
  "Paola Ramos": "karypao29@gmail.com",
  "Quijano": "",
  "Jorge Padilla": "jorgepadillamoreno1966@gmail.com",
  "Estefanía": "Ehq.artesvisuales@gmail.com",
  "Maribel": "maribelcardona469@gmail.com",
  "Yolanda": "lopezhdezyoli@gmail.com",
  "Gaby": "laet.glm95@gmail.com",
  "Gloria": "Glorialeiva024@gmail.com",
  "Melissa": "",
  "Arellano": "aeae581020@gmail.com"
};

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

  if (!(await authorized(env, payload.p))) {
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

    // Aviso al vendedor cuando se le asigna un lead (si tenemos su correo + Resend).
    if (field === "vendedor" && value && env.RESEND_API_KEY && VENDOR_EMAILS[value]) {
      const lead = await env.DB.prepare(
        "SELECT nombre, nombre_real, whatsapp, ciudad, m2, timeline, comentarios FROM leads WHERE id = ?"
      ).bind(id).first();
      if (lead) {
        const send = notifyVendor(env, VENDOR_EMAILS[value], value, lead);
        if (context.waitUntil) context.waitUntil(send); else await send;
      }
    }

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

// Manda el correo al vendedor con los datos del cliente. Silencioso ante errores.
async function notifyVendor(env, to, vendedor, l) {
  try {
    const from = env.LEADS_FROM || "Leads canchadefutbol7 <leads@canchadefutbol7.mx>";
    const esc = (s) => String(s || "—").replace(/[<>&]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c]));
    const wa = String(l.whatsapp || "").replace(/\D/g, "");
    const urgente = /lo antes posible/i.test(l.timeline || "");
    const nombre = l.nombre_real || l.nombre || "Cliente";
    const subject = `${urgente ? "🔴 URGENTE — " : ""}Lead asignado: ${nombre}${l.ciudad ? " (" + l.ciudad + ")" : ""}`;
    const html = `
      <h2 style="font-family:system-ui,sans-serif">Te asignaron un lead${urgente ? " 🔴 URGENTE" : ""}</h2>
      <p style="font-family:system-ui,sans-serif">Hola ${esc(vendedor)}, este cliente es tuyo — contáctalo cuanto antes:</p>
      <table style="font-family:system-ui,sans-serif;font-size:14px;border-collapse:collapse">
        <tr><td><b>Cliente</b></td><td>${esc(nombre)}</td></tr>
        <tr><td><b>WhatsApp</b></td><td>${esc(l.whatsapp)}${wa ? ` &nbsp;<a href="https://wa.me/52${wa.slice(-10)}">abrir chat</a>` : ""}</td></tr>
        <tr><td><b>Ciudad</b></td><td>${esc(l.ciudad)}</td></tr>
        <tr><td><b>m²</b></td><td>${esc(l.m2)}</td></tr>
        <tr><td><b>Cuándo empieza</b></td><td>${esc(l.timeline)}</td></tr>
        <tr><td><b>Notas del cliente</b></td><td>${esc(l.comentarios)}</td></tr>
      </table>
      <p style="font-family:system-ui,sans-serif;font-size:12px;color:#64748b">Panel: https://canchadefutbol7.mx/admin</p>`;
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject, html })
    });
  } catch (e) { /* silencioso: nunca rompe el guardado */ }
}

function jsonError(msg, status) {
  return new Response(JSON.stringify({ ok: false, error: msg }), {
    status,
    headers: { "content-type": "application/json" }
  });
}
