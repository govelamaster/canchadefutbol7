/**
 * GET /api/cron-seguimiento?token=TOKEN
 * Disparado por Cron cada 15 min.
 *
 * Reglas (decisión de Olga):
 *   - Lead asignado a vendedor + sin atender (atendido_fecha NULL) + status "Sin atender"
 *   - Recordatorio cada 30 min al vendedor con botones (compromiso + "Ya lo atendí")
 *   - A las 2 h (120 min) sin atender → avisar a OLGA con botón "Reasignar"
 *   - Cada cron incrementa `recordatorios` para no spamear
 */
const CRON_TOKEN = "sm-cron-7Kx9-2026";
const RESULT_SECRET = "sm-result-7Kx9-2026";

function txt(s){return new Response(s,{headers:{"content-type":"text/plain;charset=utf-8"}});}
const esc=s=>String(s||"").replace(/[<>&]/g,c=>({"<":"&lt;",">":"&gt;","&":"&amp;"}[c]));
async function sha256hex(s){const b=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("");}

async function actionButtons(leadId, nombre){
  const t = (await sha256hex(RESULT_SECRET + ":" + leadId)).slice(0, 24);
  const urlC = (m) => `https://canchadefutbol7.mx/api/lead-compromiso?id=${leadId}&t=${t}&min=${m}`;
  const urlA = `https://canchadefutbol7.mx/api/lead-atendido?id=${leadId}&t=${t}`;
  const btn = (href,bg,color,txt)=>`<a href="${href}" style="display:inline-block;background:${bg};color:${color};text-decoration:none;font-weight:800;font-size:13px;padding:11px 14px;border-radius:9px;margin:4px 4px 0 0">${txt}</a>`;
  return `
    <div style="margin:14px 0 0">
      ${btn(urlC(0),"#dcfce7","#15803d","✋ Ahora")}
      ${btn(urlC(15),"#fef3c7","#b45309","⏱ 15 min")}
      ${btn(urlC(30),"#fed7aa","#9a3412","⏱ 30 min")}
      ${btn(urlC(60),"#fecaca","#991b1b","⏱ 1 h")}
    </div>
    <a href="${urlA}" style="display:inline-block;margin-top:14px;background:#15803d;color:#fff;text-decoration:none;font-weight:800;font-size:15px;padding:13px 22px;border-radius:10px">✅ Ya lo atendí</a>`;
}

async function correoRecordatorio(env, to, vendedor, l, minsTotal){
  try {
    const from = env.LEADS_FROM || "Leads canchadefutbol7 <leads@canchadefutbol7.mx>";
    const nombre = l.nombre_real || l.nombre || "tu prospecto";
    const wa = String(l.whatsapp || "").replace(/\D/g,"");
    const tel = wa.startsWith("52") ? wa.slice(2) : wa;
    const waMsg = encodeURIComponent(`Hola ${nombre.split(' ')[0]}, soy ${vendedor} de Sportmaster 👋 Me quedé pendiente de tu cancha${l.ciudad ? ' en ' + l.ciudad : ''}. ¿Cómo te puedo apoyar?`);
    const waLink = wa.length >= 10 ? `https://wa.me/52${tel}?text=${waMsg}` : "";
    const html = `
      <div style="font-family:system-ui,-apple-system,Arial,sans-serif;max-width:520px;margin:0 auto;color:#0f172a">
        <div style="background:linear-gradient(135deg,#b45309,#d97706);color:#fff;border-radius:16px 16px 0 0;padding:22px 26px">
          <div style="font-size:12px;opacity:.9;text-transform:uppercase;letter-spacing:.05em;font-weight:700">Recordatorio</div>
          <div style="font-size:21px;font-weight:800;margin-top:3px">⏰ ${esc(nombre)} sigue esperando</div>
        </div>
        <div style="border:1px solid #fde68a;border-top:none;border-radius:0 0 16px 16px;padding:22px 26px;background:#fff">
          <p style="font-size:14.5px;margin:0 0 14px">Hola <b>${esc(vendedor)}</b>, <b>${esc(nombre)}</b>${l.ciudad ? ' (' + esc(l.ciudad) + ')' : ''} fue asignado hace <b>${minsTotal} min</b> y aún no lo has marcado como atendido.</p>
          ${waLink ? `<a href="${waLink}" style="display:inline-block;background:#25d366;color:#fff;text-decoration:none;font-weight:800;font-size:14px;padding:12px 20px;border-radius:10px">💬 Contactar por WhatsApp</a>` : ''}
          <div style="margin-top:18px;font-size:13.5px;font-weight:800;color:#92400e">¿Cuándo lo atiendes?</div>
          ${await actionButtons(l.id, nombre)}
          <p style="font-size:11.5px;color:#94a3b8;margin-top:18px">Si no respondes, en breve avisaremos a la jefa para reasignar.</p>
        </div>
      </div>`;
    await fetch("https://api.resend.com/emails",{method:"POST",headers:{"Authorization":`Bearer ${env.RESEND_API_KEY}`,"Content-Type":"application/json"},body:JSON.stringify({from,to,subject:`⏰ Recordatorio: ${nombre} sigue esperando`,html})});
  } catch(e){}
}

async function correoEscalacion(env, to, l, vendedor, minsTotal){
  try {
    const from = env.LEADS_FROM || "Leads canchadefutbol7 <leads@canchadefutbol7.mx>";
    const nombre = l.nombre_real || l.nombre || "el cliente";
    const html = `
      <div style="font-family:system-ui,-apple-system,Arial,sans-serif;max-width:520px;margin:0 auto;color:#0f172a">
        <div style="background:linear-gradient(135deg,#991b1b,#dc2626);color:#fff;border-radius:16px 16px 0 0;padding:22px 26px">
          <div style="font-size:12px;opacity:.9;text-transform:uppercase;letter-spacing:.05em;font-weight:700">Lead abandonado</div>
          <div style="font-size:20px;font-weight:800;margin-top:3px">🚨 ${esc(vendedor)} no ha atendido a ${esc(nombre)}</div>
        </div>
        <div style="border:1px solid #fecaca;border-top:none;border-radius:0 0 16px 16px;padding:22px 26px;background:#fff">
          <p style="font-size:14.5px;margin:0 0 8px"><b>${esc(nombre)}</b>${l.ciudad?' · '+esc(l.ciudad):''} fue asignado a <b>${esc(vendedor)}</b> hace <b>${Math.floor(minsTotal/60)} h ${minsTotal%60} min</b>.</p>
          <p style="font-size:14px;margin:0 0 16px;color:#64748b">No ha presionado "Ya lo atendí" ni ningún compromiso. Tal vez convenga reasignar.</p>
          <a href="https://canchadefutbol7.mx/admin#leads" style="display:inline-block;background:#0b0f14;color:#fff;text-decoration:none;font-weight:800;font-size:14px;padding:13px 22px;border-radius:10px">🎯 Ir al panel a reasignar</a>
        </div>
      </div>`;
    await fetch("https://api.resend.com/emails",{method:"POST",headers:{"Authorization":`Bearer ${env.RESEND_API_KEY}`,"Content-Type":"application/json"},body:JSON.stringify({from,to,subject:`🚨 ${vendedor} no atendió a ${nombre}`,html})});
  } catch(e){}
}

export async function onRequestGet({request, env}){
  const url=new URL(request.url);
  if (url.searchParams.get("token")!==CRON_TOKEN) return new Response("Unauthorized",{status:401});
  if (!env.RESEND_API_KEY) return txt("Falta RESEND_API_KEY");

  // Candidatos: asignados sin atender, status "Sin atender", entre 30 min y 3 h desde asignación
  let leads = [];
  try {
    const rs = await env.DB.prepare(
      `SELECT id, nombre, nombre_real, whatsapp, ciudad, vendedor, recordatorios, asignado_fecha, compromiso_fecha
       FROM leads
       WHERE TRIM(COALESCE(vendedor,'')) != ''
         AND atendido_fecha IS NULL
         AND status_proyecto = 'Sin atender'
         AND asignado_fecha IS NOT NULL
         AND asignado_fecha <= datetime('now','-30 minutes')
         AND asignado_fecha >= datetime('now','-180 minutes')`
    ).all();
    leads = rs.results || [];
  } catch (e) { return txt("DB error: " + e.message); }

  const emailDe = {};
  try {
    const rv = await env.DB.prepare("SELECT nombre, email FROM vendedores").all();
    (rv.results || []).forEach(v => { if ((v.email || "").trim()) emailDe[(v.nombre || "").trim()] = v.email.trim(); });
  } catch (e) {}
  const olgaEmail = env.LEADS_EMAIL || "formulariosweb2021@gmail.com";

  let recordatorios = 0, escalados = 0;
  const ahoraMs = Date.now();
  for (const l of leads) {
    const asigMs = Date.parse(String(l.asignado_fecha).replace(' ','T')+'Z');
    const minsTotal = Math.max(0, Math.round((ahoraMs - asigMs)/60000));
    const compMs = l.compromiso_fecha ? Date.parse(String(l.compromiso_fecha).replace(' ','T')+'Z') : 0;
    const compVencido = compMs && compMs <= ahoraMs;

    // Solo recordamos si: NO hay compromiso vigente (no marcó nada O ya venció)
    if (l.compromiso_fecha && !compVencido) continue;

    // Escalación a Olga si llevamos >= 120 min y ya van >=3 recordatorios
    if (minsTotal >= 120 && (l.recordatorios||0) >= 3){
      await correoEscalacion(env, olgaEmail, l, l.vendedor, minsTotal);
      try { await env.DB.prepare("UPDATE leads SET recordatorios = recordatorios + 1 WHERE id = ?").bind(l.id).run(); } catch(e){}
      escalados++;
      continue;
    }

    // Throttle: no más de 1 recordatorio cada 30 min → si recordatorios * 30 > minsTotal, skip
    const yaEnviados = l.recordatorios || 0;
    if (yaEnviados > 0 && (minsTotal - 30) < yaEnviados * 30) continue;

    const to = emailDe[(l.vendedor||"").trim()];
    if (!to) continue;
    await correoRecordatorio(env, to, l.vendedor, l, minsTotal);
    try { await env.DB.prepare("UPDATE leads SET recordatorios = recordatorios + 1 WHERE id = ?").bind(l.id).run(); } catch(e){}
    recordatorios++;
  }
  return txt(`OK · recordatorios:${recordatorios} · escalados:${escalados} · candidatos:${leads.length}`);
}
