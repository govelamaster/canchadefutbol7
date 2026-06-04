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
  "Quijano": "manijoe.quom@gmail.com",
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

    // Aviso al vendedor cuando se le asigna un lead. Correo = tabla "vendedores" (editable en panel) o fallback al mapa.
    if (field === "vendedor" && value && env.RESEND_API_KEY) {
      let to = "";
      try {
        const vr = await env.DB.prepare("SELECT email FROM vendedores WHERE nombre = ?").bind(value).first();
        to = (vr && vr.email) ? String(vr.email).trim() : (VENDOR_EMAILS[value] || "");
      } catch (e) { to = VENDOR_EMAILS[value] || ""; }
      if (to) {
        const lead = await env.DB.prepare(
          "SELECT nombre, nombre_real, whatsapp, ciudad, m2, timeline, comentarios FROM leads WHERE id = ?"
        ).bind(id).first();
        if (lead) {
          const send = notifyVendor(env, to, value, lead);
          if (context.waitUntil) context.waitUntil(send); else await send;
        }
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

// Frases inspiradoras SOLO para proyectos grandes (>=3000 m²). Rotan al azar.
const FRASES_VIP = [
  "Los proyectos importantes no llegan todos los días. Trátalo como tal.",
  "Un proyecto grande puede cambiar tu mes. Una visita puede cambiar el proyecto.",
  "Los clientes que invierten fuerte buscan confianza, no solo precio.",
  "Los proyectos más rentables suelen comenzar con una llamada atendida a tiempo.",
  "Las grandes ventas se construyen antes de que llegue la cotización.",
  "Cada proyecto grande merece atención inmediata.",
  "El tamaño del proyecto exige el mismo nivel de compromiso.",
  "Las oportunidades extraordinarias requieren acciones extraordinarias.",
  "No todos los días aparece un proyecto capaz de transformar tus resultados.",
  "Los clientes importantes perciben quién realmente quiere ganar el proyecto.",
  "Una visita oportuna vale más que diez llamadas de seguimiento.",
  "Los grandes proyectos rara vez se ganan por WhatsApp.",
  "El cliente está evaluando proveedores. Asegúrate de que recuerde tu nombre.",
  "Los proyectos de alto valor exigen vendedores de alto nivel.",
  "Las mejores comisiones suelen esconderse detrás de las visitas o zooms que otros no hacen.",
  "Los proyectos grandes no se persiguen. Se conquistan."
];

// Manda el correo al vendedor con los datos del cliente. Silencioso ante errores.
async function notifyVendor(env, to, vendedor, l) {
  try {
    const from = env.LEADS_FROM || "Leads canchadefutbol7 <leads@canchadefutbol7.mx>";
    const esc = (s) => String(s || "—").replace(/[<>&]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c]));
    const wa = String(l.whatsapp || "").replace(/\D/g, "");
    const urgente = /lo antes posible/i.test(l.timeline || "");
    const nombre = l.nombre_real || l.nombre || "Cliente";
    // Contador de prospectos de HOY para ESTE vendedor (incluye el actual)
    let nDia = 1;
    try {
      const hoyD = new Date(Date.now()).toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' });
      const rs = await env.DB.prepare("SELECT tocado_fecha FROM leads WHERE vendedor = ?").bind(vendedor).all();
      const cnt = (rs.results || []).filter(r => {
        const f = r.tocado_fecha; if (!f) return false;
        return new Date(String(f).replace(' ', 'T') + 'Z').toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' }) === hoyD;
      }).length;
      if (cnt > 0) nDia = cnt;
    } catch (e) { nDia = 1; }
    const ordN = ({ 1: '1er', 2: '2do', 3: '3er', 4: '4to', 5: '5to', 6: '6to', 7: '7mo', 8: '8vo', 9: '9no', 10: '10mo' })[nDia] || (nDia + 'º');
    const tituloHdr = nDia <= 1 ? '¡Un cliente es tuyo! 🎯' : `¡Tu ${ordN} prospecto de hoy! 🔥`;
    const kickerHdr = nDia <= 1 ? 'Nueva asignación' : `Asignación #${nDia} de hoy`;
    const saludoTxt = nDia <= 1 ? 'Te comparto una <b>asignación para ti</b>… ¡A cerrarla! 💪' : `Te pasamos el <b>${ordN} prospecto del día</b>… ¡vas con todo! 💪`;
    const com = String(l.comentarios || "");
    const tipo = (com.match(/Tipo:\s*([^·]+)/i) || [,""])[1].trim();
    const accesorios = (com.match(/Accesorios:\s*(.+)$/i) || [,""])[1].trim();
    // Proyecto grande (>=3000 m²): frase inspiradora rotativa
    const m2num = parseInt(String(l.m2 || "").replace(/[^\d]/g, ""), 10) || 0;
    const esBig = m2num >= 3000;
    // Frase inspiradora: se leen de la tabla "frases" (editable desde el panel). Fallback al array.
    let fraseVip = "";
    if (esBig) {
      try {
        const rs = await env.DB.prepare("SELECT texto FROM frases").all();
        const pool = (rs.results || []).map(r => r.texto).filter(Boolean);
        const arr = pool.length ? pool : FRASES_VIP;
        fraseVip = arr[Math.floor(Math.random() * arr.length)];
      } catch (e) { fraseVip = FRASES_VIP[Math.floor(Math.random() * FRASES_VIP.length)]; }
    }
    // Banner destacado según prioridad: alto valor + urgente > alto valor > urgente
    const destacado = (esBig && urgente)
      ? `<div style="background:linear-gradient(135deg,#fef3c7,#fde68a);border:1px solid #f59e0b;border-radius:12px;padding:14px 16px;margin-bottom:18px"><div style="font-weight:800;color:#92400e;font-size:15px">🏆⚡ Proyecto que cumple con TODO</div><div style="font-size:13px;color:#b45309;margin-top:3px">Alto valor <b>y</b> el cliente quiere empezar <b>ya</b>. Esta merece tu atención inmediata.</div></div>`
      : esBig
      ? `<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:14px 16px;margin-bottom:18px"><div style="font-weight:800;color:#92400e;font-size:15px">🏆 Proyecto de alto valor</div><div style="font-size:13px;color:#b45309;margin-top:3px">Más de 3,000 m². Una oportunidad de las que cambian el mes.</div></div>`
      : urgente
      ? `<div style="background:#fef2f2;color:#dc2626;border:1px solid #fecaca;border-radius:10px;padding:11px 14px;font-weight:700;font-size:14px;margin-bottom:18px">🔴 URGENTE — quiere empezar lo antes posible</div>`
      : "";
    const subject = `${urgente ? "🔴 URGENTE — " : ""}${nDia > 1 ? `Tu ${ordN} prospecto de hoy` : "Lead asignado"}: ${nombre}${l.ciudad ? " (" + l.ciudad + ")" : ""}`;
    const firstName = (nombre || 'el cliente').split(' ')[0];
    const waMsg = encodeURIComponent(`Hola ${firstName}, soy ${vendedor} de Sportmaster 👋 Vi que te interesa una cancha de fútbol. ¿Te ayudo con tu cotización?`);
    const waLink = wa ? `https://wa.me/52${wa.slice(-10)}?text=${waMsg}` : '';
    const row = (k, v) => `<tr><td style="padding:9px 18px;color:#64748b;font-size:13px;border-bottom:1px solid #eef2f6">${k}</td><td style="padding:9px 18px;font-weight:700;font-size:14px;color:#0f172a;border-bottom:1px solid #eef2f6;text-align:right">${v}</td></tr>`;
    const html = `
      <div style="background:#eef2f6;padding:26px 12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif">
        <table align="center" width="500" style="max-width:500px;width:100%;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 12px 38px rgba(2,6,23,.14)">
          <tr><td style="background:linear-gradient(135deg,#139D45,#0a7a2e);padding:30px 30px;color:#ffffff">
            <div style="font-size:12px;letter-spacing:1.2px;text-transform:uppercase;opacity:.85;font-weight:700">${kickerHdr}</div>
            <div style="font-size:24px;font-weight:800;margin-top:6px;line-height:1.15">${tituloHdr}</div>
          </td></tr>
          <tr><td style="padding:26px 30px 8px">
            <p style="font-size:16px;margin:0 0 4px;color:#0f172a">Buen día <b>${esc(vendedor)}</b>,</p>
            <p style="font-size:15px;color:#475569;margin:0 0 18px">${saludoTxt}</p>
            ${destacado}
            <table width="100%" style="border-collapse:collapse;background:#f8fafc;border:1px solid #eef2f6;border-radius:12px;overflow:hidden">
              ${row('Cliente', esc(nombre))}
              ${row('Ciudad', esc(l.ciudad))}
              ${row('m²', esc(l.m2))}
              ${row('Inicio', esc(l.timeline))}
              ${row('Tipo de cancha', esc(tipo || '-'))}
              ${row('Accesorios', esc(accesorios || '-'))}
            </table>
            ${waLink ? `<a href="${waLink}" style="display:block;text-align:center;background:#25D366;color:#ffffff;text-decoration:none;font-weight:700;font-size:16px;padding:16px;border-radius:12px;margin-top:22px;box-shadow:0 8px 22px rgba(37,211,102,.34)">💬 Contactar a ${esc(firstName)} por WhatsApp</a>` : ''}
            ${fraseVip ? `<p style="text-align:center;font-size:12.5px;color:#64748b;font-style:italic;line-height:1.5;margin:16px 14px 2px">“${esc(fraseVip)}”</p>` : ''}
            <p style="text-align:center;font-size:12px;color:#94a3b8;margin:14px 0 6px">o entra al panel: <a href="https://canchadefutbol7.mx/admin" style="color:#94a3b8">canchadefutbol7.mx/admin</a></p>
          </td></tr>
          <tr><td style="background:#0f172a;color:#cbd5e1;padding:16px 30px;font-size:12px;text-align:center">Sportmaster · Canchas de Fútbol 7 — ¡Mucho éxito! 🌟</td></tr>
        </table>
      </div>`;
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
