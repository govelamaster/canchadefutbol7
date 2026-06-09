/**
 * GET /api/cron-seguimiento?token=TOKEN
 * El cron externo puede pegar cada 15 min, pero este endpoint
 * solo TRABAJA una vez al día, en la ventana 9:00–9:30 hora MX (CDMX, UTC-6).
 *
 * Reglas vigentes (decisión Olga · 2026-06-09):
 *   - CERO emails individuales en TODO el sistema. Solo este resumen + reporte semanal.
 *   - 9:00 AM hora MX → resumen del DÍA ANTERIOR a cada vendedor con sus leads
 *     (todos los recibidos ayer + estatus: atendidos / sin atender).
 *   - El dashboard /admin sigue siendo la fuente única en tiempo real.
 *
 * Override de pruebas: ?force=1 ignora la ventana horaria.
 * Dry run: ?dry=1 devuelve HTML sin enviar.
 */
const CRON_TOKEN = "sm-cron-7Kx9-2026";
const RESULT_SECRET = "sm-result-7Kx9-2026";

function txt(s, code) { return new Response(s, { status: code || 200, headers: { "content-type": "text/plain;charset=utf-8" } }); }
function html(s) { return new Response(s, { headers: { "content-type": "text/html;charset=utf-8" } }); }
const esc = s => String(s || "").replace(/[<>&]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c]));

async function sha256hex(s) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, "0")).join("");
}

// Hora local MX (CDMX, UTC-6, sin DST desde 2022)
function horaMX(d) {
  const m = new Date(d.getTime() - 6 * 3600 * 1000);
  return { h: m.getUTCHours(), min: m.getUTCMinutes(), ymd: m.toISOString().slice(0, 10) };
}

async function leadCard(l) {
  const nombre = esc(l.nombre_real || l.nombre || "Cliente");
  const wa = String(l.whatsapp || "").replace(/\D/g, "");
  const tel = wa.startsWith("52") ? wa.slice(2) : wa;
  const waMsg = encodeURIComponent(`Hola ${(l.nombre_real || l.nombre || "").split(' ')[0]}, te escribo de Sportmaster 👋 ¿Sigues con interés en tu cancha${l.ciudad ? ' en ' + l.ciudad : ''}?`);
  const waLink = wa.length >= 10 ? `https://wa.me/52${tel}?text=${waMsg}` : "";
  const t = (await sha256hex(RESULT_SECRET + ":" + l.id)).slice(0, 24);
  const urlA = `https://canchadefutbol7.mx/api/lead-atendido?id=${l.id}&t=${t}`;
  const asig = l.asignado_fecha ? new Date(String(l.asignado_fecha).replace(' ', 'T') + 'Z') : null;
  const horas = asig ? Math.max(0, Math.round((Date.now() - asig.getTime()) / 3600000)) : null;

  const atendido = !!l.atendido_fecha || (l.status_proyecto && l.status_proyecto !== 'Sin atender');
  const statusBadge = atendido
    ? `<span style="display:inline-block;background:#dcfce7;color:#15803d;font-size:11px;font-weight:700;padding:3px 8px;border-radius:6px">✅ ${esc(l.status_proyecto || 'Atendido')}</span>`
    : `<span style="display:inline-block;background:#fef3c7;color:#b45309;font-size:11px;font-weight:700;padding:3px 8px;border-radius:6px">⏳ Sin atender</span>`;

  return `
    <div style="border:1px solid #e2e8f0;border-radius:12px;padding:14px 16px;margin:10px 0;background:#fff">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap">
        <div style="font-size:15px;font-weight:800;color:#0f172a">${nombre}${l.ciudad ? ` · <span style="color:#64748b;font-weight:600">${esc(l.ciudad)}</span>` : ''}</div>
        ${statusBadge}
      </div>
      ${atendido ? '' : `
      <div style="margin-top:10px">
        ${waLink ? `<a href="${waLink}" style="display:inline-block;background:#25d366;color:#fff;text-decoration:none;font-weight:700;font-size:13px;padding:9px 14px;border-radius:8px;margin-right:6px">💬 WhatsApp</a>` : ''}
        <a href="${urlA}" style="display:inline-block;background:#15803d;color:#fff;text-decoration:none;font-weight:700;font-size:13px;padding:9px 14px;border-radius:8px">✅ Ya lo atendí</a>
      </div>`}
    </div>`;
}

async function correoResumenVendedor(env, to, vendedor, leads) {
  const from = env.LEADS_FROM || "Leads canchadefutbol7 <leads@canchadefutbol7.mx>";
  const cards = (await Promise.all(leads.map(leadCard))).join("");
  const pendientes = leads.filter(l => !l.atendido_fecha && (!l.status_proyecto || l.status_proyecto === 'Sin atender')).length;
  const atendidos = leads.length - pendientes;
  const cuerpo = `
    <div style="font-family:system-ui,-apple-system,Arial,sans-serif;max-width:560px;margin:0 auto;color:#0f172a">
      <div style="background:linear-gradient(135deg,#0b0f14,#1e293b);color:#fff;border-radius:16px 16px 0 0;padding:22px 26px">
        <div style="font-size:12px;opacity:.85;text-transform:uppercase;letter-spacing:.05em;font-weight:700">Resumen de ayer</div>
        <div style="font-size:21px;font-weight:800;margin-top:3px">Buenos días, ${esc(vendedor)} 👋</div>
        <div style="font-size:14px;opacity:.9;margin-top:6px">Ayer recibiste <b>${leads.length}</b> ${leads.length === 1 ? 'lead' : 'leads'}: <b style="color:#a7f3d0">${atendidos} atendido${atendidos === 1 ? '' : 's'}</b> · <b style="color:#fcd34d">${pendientes} pendiente${pendientes === 1 ? '' : 's'}</b>.</div>
      </div>
      <div style="border:1px solid #e2e8f0;border-top:none;border-radius:0 0 16px 16px;padding:18px 22px;background:#f8fafc">
        ${cards}
        ${pendientes > 0 ? `<p style="font-size:11.5px;color:#94a3b8;margin-top:14px">Los pendientes quedaron sin contestar ayer. Hoy es el día.</p>` : ''}
      </div>
    </div>`;
  return fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from, to,
      subject: `📋 Resumen de ayer · ${leads.length} ${leads.length === 1 ? 'lead' : 'leads'} (${pendientes} pendiente${pendientes === 1 ? '' : 's'})`,
      html: cuerpo,
    }),
  });
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  if (url.searchParams.get("token") !== CRON_TOKEN) return new Response("Unauthorized", { status: 401 });
  if (!env.RESEND_API_KEY) return txt("Falta RESEND_API_KEY");

  const force = url.searchParams.get("force") === "1";
  const dry = url.searchParams.get("dry") === "1";

  // Ventana: 9:00–9:30 hora MX. Fuera de eso, no hacer nada.
  const { h, min, ymd } = horaMX(new Date());
  if (!force && !(h === 9 && min < 30)) {
    return txt(`skip · hora MX ${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')} (ventana 9:00-9:30)`);
  }

  // Guard de idempotencia: si ya corrió hoy, no repetir (a menos que ?force=1)
  if (!force) {
    try {
      await env.DB.prepare(`CREATE TABLE IF NOT EXISTS cron_runs (key TEXT PRIMARY KEY, ran_at TEXT)`).run();
      const prev = await env.DB.prepare(`SELECT key FROM cron_runs WHERE key = ?`).bind("resumen-" + ymd).first();
      if (prev) return txt(`skip · ya corrió hoy (${ymd})`);
    } catch (e) { /* si la tabla no existe aún o falla, continuamos */ }
  }

  // Resumen del DÍA ANTERIOR: leads asignados a vendedor cuya fecha de creación
  // (o de asignación) cayó AYER en hora MX. Incluye atendidos y no atendidos
  // para que el vendedor vea su panorama completo del día previo.
  // Ventana: ayer 00:00 → ayer 23:59 hora MX (UTC = ayer 06:00 → hoy 05:59 UTC).
  const ayerYmd = new Date(Date.now() - 24 * 3600 * 1000 - 6 * 3600 * 1000).toISOString().slice(0, 10);
  const desdeUTC = ayerYmd + ' 06:00:00';
  const hastaUTC = ymd + ' 06:00:00';
  let leads = [];
  try {
    const rs = await env.DB.prepare(
      `SELECT id, nombre, nombre_real, whatsapp, ciudad, vendedor,
              asignado_fecha, atendido_fecha, compromiso_fecha, status_proyecto, fecha
       FROM leads
       WHERE TRIM(COALESCE(vendedor,'')) != ''
         AND COALESCE(asignado_fecha, fecha) >= ?
         AND COALESCE(asignado_fecha, fecha) <  ?`
    ).bind(desdeUTC, hastaUTC).all();
    leads = rs.results || [];
  } catch (e) { return txt("DB error: " + e.message); }

  // Email vendedor → email
  const emailDe = {};
  try {
    const rv = await env.DB.prepare("SELECT nombre, email FROM vendedores").all();
    (rv.results || []).forEach(v => { if ((v.email || "").trim()) emailDe[(v.nombre || "").trim()] = v.email.trim(); });
  } catch (e) {}

  // Agrupar por vendedor
  const porVendedor = {};
  for (const l of leads) {
    const v = (l.vendedor || "").trim();
    if (!v) continue;
    (porVendedor[v] = porVendedor[v] || []).push(l);
  }

  if (dry) {
    const parts = [];
    for (const v of Object.keys(porVendedor)) {
      const cards = (await Promise.all(porVendedor[v].map(leadCard))).join("");
      parts.push(`<h2 style="font-family:system-ui">${esc(v)} · ${porVendedor[v].length} leads · ${emailDe[v] || '(sin email)'}</h2>${cards}`);
    }
    return html(parts.join("<hr>") || "<p>Sin leads abandonados</p>");
  }

  let enviados = 0, sinEmail = 0;
  for (const v of Object.keys(porVendedor)) {
    const to = emailDe[v];
    if (!to) { sinEmail++; continue; }
    try {
      await correoResumenVendedor(env, to, v, porVendedor[v]);
      enviados++;
    } catch (e) { /* sigue */ }
  }

  try {
    await env.DB.prepare(`INSERT OR REPLACE INTO cron_runs (key, ran_at) VALUES (?, datetime('now'))`).bind("resumen-" + ymd).run();
  } catch (e) {}

  return txt(`OK · resúmenes enviados: ${enviados} · vendedores sin email: ${sinEmail} · leads abandonados: ${leads.length}`);
}
