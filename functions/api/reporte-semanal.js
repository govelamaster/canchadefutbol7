/**
 * /api/reporte-semanal?token=TOKEN[&dry=1][&only=olga]
 * Genera el resumen de los últimos 7 días y lo envía por correo (Resend):
 *   - A Olga: reporte global (leads nuevos + por fuente + por vendedor).
 *   - A cada vendedor: SU resumen (sus leads nuevos, atendidos, ganados).
 * Protegido por token. dry=1 -> devuelve el HTML sin enviar. only=olga -> solo a Olga (para pruebas).
 *
 * Lo dispara cada lunes 8:00 AM (MX) un Cron Trigger que hace fetch a esta URL.
 */
const REPORT_TOKEN = "sm-reporte-7Kx9-2026";
const OLGA_EMAIL_DEFAULT = "formulariosweb2021@gmail.com";

function txt(s, code) { return new Response(s, { status: code || 200, headers: { "content-type": "text/html;charset=utf-8" } }); }
const esc = (s) => String(s == null ? "" : s).replace(/[<>&]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c]));

function canal(l) {
  if ((l.gclid || "").trim()) return "Google Ads";
  const c = (l.campania || "").toLowerCase();
  if (!c || c === "directo") return "Directo";
  if (/chatgpt|openai|perplexity|gemini|bard|copilot|claude|deepseek|mistral|grok|you\.com|phind|poe/.test(c)) return "IA";
  if (/google\.|bing|yahoo|duckduckgo|ecosia|brave|yandex|search/.test(c)) return "SEO";
  return "Referido";
}
const atendido = (l) => (l.status_proyecto || "Sin atender") !== "Sin atender";
const ganado = (l) => (l.status_proyecto || "") === "Ganado";

async function sendEmail(env, to, subject, html) {
  const from = env.LEADS_FROM || "Leads canchadefutbol7 <leads@canchadefutbol7.mx>";
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, subject, html }),
  });
}

function shell(inner) {
  return `<div style="font-family:system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif;max-width:580px;margin:0 auto;color:#0f172a">
    <div style="background:linear-gradient(135deg,#0b3d1f,#15522c);color:#fff;border-radius:16px 16px 0 0;padding:22px 24px">
      <div style="font-size:13px;opacity:.85;letter-spacing:.04em;text-transform:uppercase">canchadefutbol7.mx · últimos 7 días</div>
      <div style="font-size:22px;font-weight:800;margin-top:2px">Reporte semanal 📊</div>
    </div>
    <div style="border:1px solid #eef2f6;border-top:none;border-radius:0 0 16px 16px;padding:22px 24px;background:#fff">${inner}</div>
    <div style="text-align:center;font-size:12px;color:#94a3b8;margin-top:14px">Panel: <a href="https://canchadefutbol7.mx/admin" style="color:#15803d">canchadefutbol7.mx/admin</a></div>
  </div>`;
}
function stat(n, label, color) {
  return `<div style="flex:1;min-width:90px;background:#f8fafc;border:1px solid #eef2f6;border-radius:12px;padding:12px 14px;text-align:center">
    <div style="font-size:26px;font-weight:800;color:${color || "#0f172a"}">${n}</div>
    <div style="font-size:12px;color:#64748b;margin-top:2px">${label}</div></div>`;
}

export async function onRequest({ request, env }) {
  const url = new URL(request.url);
  if (url.searchParams.get("token") !== REPORT_TOKEN) return txt("No autorizado", 401);
  const dry = url.searchParams.get("dry") === "1";
  const only = url.searchParams.get("only") || "";
  if (!env.RESEND_API_KEY && !dry) return txt("Falta RESEND_API_KEY", 500);

  // Leads de los últimos 7 días
  let leads = [];
  try {
    const rs = await env.DB.prepare(
      "SELECT fecha, nombre, ciudad, vendedor, status_proyecto, gclid, campania FROM leads WHERE estado != 'parcial' AND fecha >= datetime('now','-7 days') ORDER BY fecha DESC"
    ).all();
    leads = rs.results || [];
  } catch (e) { return txt("DB error: " + esc(e.message), 500); }

  // Directorio de vendedores (nombre -> email)
  const emailDe = {};
  try {
    const rv = await env.DB.prepare("SELECT nombre, email FROM vendedores").all();
    (rv.results || []).forEach(v => { if ((v.email || "").trim()) emailDe[(v.nombre || "").trim()] = v.email.trim(); });
  } catch (e) { /* sigue sin correos de vendedor */ }

  // ----- Reporte global (Olga) -----
  const total = leads.length;
  const porFuente = {};
  leads.forEach(l => { const c = canal(l); porFuente[c] = (porFuente[c] || 0) + 1; });
  const porVendedor = {};
  leads.forEach(l => {
    const v = (l.vendedor || "").trim() || "(sin asignar)";
    porVendedor[v] = porVendedor[v] || { asignados: 0, atendidos: 0, ganados: 0 };
    porVendedor[v].asignados++;
    if (atendido(l)) porVendedor[v].atendidos++;
    if (ganado(l)) porVendedor[v].ganados++;
  });
  const fuenteChips = Object.entries(porFuente).sort((a, b) => b[1] - a[1])
    .map(([f, n]) => `<span style="display:inline-block;background:#eafaf1;color:#1f7a3d;border:1px solid #c7ecd5;border-radius:999px;padding:4px 12px;font-size:13px;font-weight:700;margin:0 6px 6px 0">${esc(f)} · ${n}</span>`).join("");
  const vendRows = Object.entries(porVendedor).sort((a, b) => b[1].asignados - a[1].asignados)
    .map(([v, s]) => `<tr><td style="padding:7px 10px;border-bottom:1px solid #f1f5f9;font-weight:700">${esc(v)}</td>
      <td style="padding:7px 10px;border-bottom:1px solid #f1f5f9;text-align:center">${s.asignados}</td>
      <td style="padding:7px 10px;border-bottom:1px solid #f1f5f9;text-align:center">${s.atendidos}</td>
      <td style="padding:7px 10px;border-bottom:1px solid #f1f5f9;text-align:center;font-weight:800;color:#15803d">${s.ganados}</td></tr>`).join("");
  const sinContactar = leads.filter(l => !atendido(l)).length;
  const globalHtml = shell(`
    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:18px">
      ${stat(total, "Leads nuevos", "#15803d")}
      ${stat(sinContactar, "Sin contactar", sinContactar ? "#b91c1c" : "#15803d")}
      ${stat(leads.filter(ganado).length, "Ganados")}
    </div>
    <h3 style="margin:0 0 8px;font-size:15px">📥 De dónde llegaron</h3>
    <div style="margin-bottom:18px">${fuenteChips || '<span style="color:#94a3b8">Sin leads esta semana</span>'}</div>
    <h3 style="margin:0 0 8px;font-size:15px">👥 Por vendedor</h3>
    <table style="width:100%;border-collapse:collapse;font-size:13px">
      <thead><tr style="color:#64748b;font-size:11px;text-transform:uppercase">
        <th style="padding:6px 10px;text-align:left">Vendedor</th><th style="padding:6px 10px">Asignados</th><th style="padding:6px 10px">Atendidos</th><th style="padding:6px 10px">Ganados</th></tr></thead>
      <tbody>${vendRows || '<tr><td colspan="4" style="padding:10px;color:#94a3b8">—</td></tr>'}</tbody>
    </table>`);

  const olgaEmail = env.LEADS_EMAIL || OLGA_EMAIL_DEFAULT;
  if (dry) return txt(globalHtml);

  const enviados = [];
  await sendEmail(env, olgaEmail, `📊 Reporte semanal — ${total} leads nuevos`, globalHtml);
  enviados.push("Olga<" + olgaEmail + ">");

  // ----- Reporte por vendedor (si no es only=olga) -----
  if (only !== "olga") {
    for (const [v, s] of Object.entries(porVendedor)) {
      if (v === "(sin asignar)") continue;
      const to = emailDe[v];
      if (!to) continue;
      const html = shell(`
        <div style="font-size:17px;font-weight:800;margin-bottom:4px">Hola, ${esc(v)} 👋</div>
        <div style="color:#64748b;font-size:13.5px;margin-bottom:16px">Tu resumen de la semana:</div>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          ${stat(s.asignados, "Tus leads", "#15803d")}
          ${stat(s.asignados - s.atendidos, "Sin contactar", (s.asignados - s.atendidos) ? "#b91c1c" : "#15803d")}
          ${stat(s.ganados, "Ganados")}
        </div>
        <p style="font-size:13px;color:#64748b;margin-top:16px">Entra al panel para contactarlos rápido: velocidad = ventas 🟢</p>`);
      await sendEmail(env, to, `📊 Tu semana en Sportmaster — ${s.asignados} leads`, html);
      enviados.push(v + "<" + to + ">");
    }
  }

  return txt("OK · enviados: " + esc(enviados.join(", ")));
}
