/**
 * GET /api/cron-seguimiento?token=TOKEN
 * Disparado por Cron cada 15 min.
 * Manda correo de seguimiento al vendedor con los 4 botones "¿Cómo te fue?"
 * para los leads que:
 *   - tienen vendedor asignado
 *   - llevan 30-120 min desde "tocado_fecha"
 *   - siguen en "Contactado" (no marcaron resultado todavía)
 *   - aún no recibieron este recordatorio (notas_internas no contiene marca)
 */
const CRON_TOKEN = "sm-cron-7Kx9-2026";
const RESULT_SECRET = "sm-result-7Kx9-2026";
const RECORDATORIO_TAG = "📨 Recordatorio 30min enviado";

function txt(s) { return new Response(s, { headers: { "content-type": "text/plain;charset=utf-8" } }); }
const esc = (s) => String(s || "").replace(/[<>&]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c]));

async function sha256hex(s) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, "0")).join("");
}

async function resultadoBlock(leadId, nombre) {
  const t = (await sha256hex(RESULT_SECRET + ":" + leadId)).slice(0, 24);
  const url = (r) => `https://canchadefutbol7.mx/api/lead-resultado?id=${leadId}&t=${t}&r=${r}`;
  const btn = (href, bg, color, txt) => `<a href="${href}" style="display:inline-block;background:${bg};color:${color};text-decoration:none;font-weight:700;font-size:14px;padding:11px 16px;border-radius:9px;margin:5px 5px 0 0">${txt}</a>`;
  return `<div style="margin-top:14px">
    ${btn(url("interested"), "#dcfce7", "#15803d", "🟢 Interesado")}
    ${btn(url("scheduled"), "#dbeafe", "#1d4ed8", "📅 Agendé")}
    ${btn(url("noresp"), "#fef3c7", "#b45309", "⏰ Sin respuesta")}
    ${btn(url("notinterested"), "#fee2e2", "#b91c1c", "❌ No interesa")}
  </div>`;
}

async function correoSeguimiento(env, to, vendedor, l) {
  try {
    const from = env.LEADS_FROM || "Leads canchadefutbol7 <leads@canchadefutbol7.mx>";
    const nombre = l.nombre_real || l.nombre || "tu prospecto";
    const wa = String(l.whatsapp || "").replace(/\D/g, "");
    const tel = wa.startsWith("52") ? wa.slice(2) : wa;
    const waMsg = encodeURIComponent(`Hola ${nombre.split(' ')[0]}, soy ${vendedor} de Sportmaster 👋 Me quedé pendiente de tu cancha${l.ciudad ? ' en ' + l.ciudad : ''}. ¿Cómo te puedo apoyar?`);
    const waLink = wa.length >= 10 ? `https://wa.me/52${tel}?text=${waMsg}` : "";
    const html = `
      <div style="font-family:system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif;max-width:500px;margin:0 auto;color:#0f172a">
        <div style="background:linear-gradient(135deg,#b45309,#d97706);color:#fff;border-radius:16px 16px 0 0;padding:22px 26px">
          <div style="font-size:12px;opacity:.9;text-transform:uppercase;letter-spacing:.05em;font-weight:700">Seguimiento rápido</div>
          <div style="font-size:21px;font-weight:800;margin-top:3px">⏰ ¿Cómo te fue con ${esc(nombre)}?</div>
        </div>
        <div style="border:1px solid #fde68a;border-top:none;border-radius:0 0 16px 16px;padding:22px 26px;background:#fff">
          <p style="font-size:14.5px;margin:0 0 14px">Hola <b>${esc(vendedor)}</b>, hace rato abriste el chat de <b>${esc(nombre)}</b>${l.ciudad ? ' (' + esc(l.ciudad) + ')' : ''}. Cuéntame con 1 clic:</p>
          ${await resultadoBlock(l.id, nombre)}
          ${waLink ? `<p style="font-size:13px;color:#64748b;margin:18px 0 6px">¿Aún no le escribes? <a href="${waLink}" style="color:#15803d;font-weight:700;text-decoration:none">💬 Abrir WhatsApp</a></p>` : ''}
          <p style="font-size:11.5px;color:#94a3b8;margin-top:18px">Si ignoras este correo, el lead queda en "Contactado" hasta que actualices. Panel: <a href="https://canchadefutbol7.mx/admin" style="color:#94a3b8">canchadefutbol7.mx/admin</a></p>
        </div>
      </div>`;
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject: `⏰ ¿Cómo te fue con ${nombre}?`, html }),
    });
  } catch (e) { /* silencioso */ }
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  if (url.searchParams.get("token") !== CRON_TOKEN) return new Response("Unauthorized", { status: 401 });
  if (!env.RESEND_API_KEY) return txt("Falta RESEND_API_KEY");

  // Leads candidatos: vendedor asignado + status="Contactado" + tocados hace 30-120 min + sin recordatorio enviado
  let leads = [];
  try {
    const rs = await env.DB.prepare(
      `SELECT id, nombre, whatsapp, ciudad, vendedor, COALESCE(notas_internas,'') AS notas_internas, tocado_fecha
       FROM leads
       WHERE TRIM(COALESCE(vendedor,'')) != ''
         AND status_proyecto = 'Contactado'
         AND tocado_fecha IS NOT NULL
         AND tocado_fecha <= datetime('now','-30 minutes')
         AND tocado_fecha >= datetime('now','-120 minutes')`
    ).all();
    leads = rs.results || [];
  } catch (e) { return txt("DB error: " + e.message); }

  // Email del vendedor (cacheado)
  const emailDe = {};
  try {
    const rv = await env.DB.prepare("SELECT nombre, email FROM vendedores").all();
    (rv.results || []).forEach(v => { if ((v.email || "").trim()) emailDe[(v.nombre || "").trim()] = v.email.trim(); });
  } catch (e) {}

  let enviados = 0;
  for (const l of leads) {
    if (String(l.notas_internas).includes(RECORDATORIO_TAG)) continue; // ya se envió
    const to = emailDe[(l.vendedor || "").trim()];
    if (!to) continue;
    await correoSeguimiento(env, to, l.vendedor, l);
    // Marcar como enviado en notas_internas (no se vuelve a mandar)
    try {
      const nuevasNotas = (l.notas_internas ? l.notas_internas + "\n" : "") + `[${new Date().toISOString().slice(0,16).replace('T',' ')}] ${RECORDATORIO_TAG}`;
      await env.DB.prepare("UPDATE leads SET notas_internas = ? WHERE id = ?").bind(nuevasNotas, l.id).run();
    } catch (e) {}
    enviados++;
  }
  return txt(`OK · seguimientos enviados: ${enviados} / candidatos: ${leads.length}`);
}
