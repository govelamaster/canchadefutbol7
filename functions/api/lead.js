/**
 * POST /api/lead
 * Recibe el form de cotizar.html y guarda en D1.
 * Acepta FormData o JSON.
 */

export async function onRequestPost(context) {
  const { request, env } = context;

  // Parse body (form-data o json)
  let payload = {};
  const contentType = request.headers.get('content-type') || '';
  try {
    if (contentType.includes('application/json')) {
      payload = await request.json();
    } else {
      const fd = await request.formData();
      for (const [k, v] of fd.entries()) payload[k] = v;
    }
  } catch (err) {
    return jsonError('Bad request: ' + err.message, 400);
  }

  try {
    const sid = (payload.session_id || '').trim();
    const waNorm = (payload.whatsapp || '').replace(/\D/g, '').slice(-10); // teléfono normalizado (10 díg.)
    let changed = 0;

    // Si ya existe una fila con este session_id (ej. guardado "parcial"),
    // la actualizamos en vez de crear una duplicada.
    if (sid) {
      const upd = await env.DB.prepare(`
        UPDATE leads SET
          estado = ?, nombre = ?, whatsapp = ?, ciudad = ?, m2 = ?,
          timeline = ?, comentarios = ?, fuente = ?, url = ?, gclid = ?, campania = ?, wa_norm = ?
        WHERE session_id = ?
      `).bind(
        payload.estado || '',
        payload.nombre || '',
        payload.whatsapp || '',
        payload.ciudad || '',
        payload.m2 || '',
        payload.timeline || '',
        payload.comentarios || '',
        payload.fuente || '',
        payload.url || '',
        payload.gclid || '',
        payload.campania || '',
        waNorm,
        sid
      ).run();
      changed = (upd.meta && upd.meta.changes) || 0;
    }

    if (!changed) {
      await env.DB.prepare(`
        INSERT INTO leads
          (session_id, estado, nombre, whatsapp, ciudad, m2, timeline, comentarios, fuente, url, gclid, campania, wa_norm, ip, user_agent)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        sid,
        payload.estado || '',
        payload.nombre || '',
        payload.whatsapp || '',
        payload.ciudad || '',
        payload.m2 || '',
        payload.timeline || '',
        payload.comentarios || '',
        payload.fuente || '',
        payload.url || '',
        payload.gclid || '',
        payload.campania || '',
        waNorm,
        request.headers.get('cf-connecting-ip') || '',
        request.headers.get('user-agent') || ''
      ).run();
    }

    // Aviso por correo (Resend) — NO bloquea la respuesta y es opcional:
    // si falta RESEND_API_KEY simplemente se omite. Solo avisamos en leads
    // "completos" o de formulario para no spamear con los parciales del bot.
    const esParcial = (payload.estado || '').toLowerCase() === 'parcial';
    if (!esParcial) {
      // id del lead recién guardado
      let leadId = null;
      try {
        const row = await env.DB.prepare("SELECT id FROM leads WHERE session_id = ? ORDER BY id DESC LIMIT 1").bind(sid).first();
        leadId = row ? row.id : null;
      } catch (e) { leadId = null; }

      // 🔁 DETECCIÓN DE DUPLICADOS (blindada: si falla, el lead YA quedó guardado)
      // Si el mismo teléfono ya tenía un vendedor, se lo re-asignamos al mismo y marcamos recurrente.
      let recurrenteVendedor = null;
      try {
        if (leadId && /^\d{10}$/.test(waNorm)) {
          const prior = await env.DB.prepare(
            "SELECT id, vendedor FROM leads WHERE wa_norm = ? AND id != ? AND TRIM(COALESCE(vendedor,'')) != '' ORDER BY id DESC LIMIT 1"
          ).bind(waNorm, leadId).first();
          if (prior && prior.vendedor) {
            await env.DB.prepare("UPDATE leads SET vendedor = ?, recurrente = 1, dup_de = ? WHERE id = ?")
              .bind(prior.vendedor, prior.id, leadId).run();
            recurrenteVendedor = prior.vendedor;
          }
        }
      } catch (e) { /* silencioso: nunca rompe la captura */ }

      // Avisos por correo (opcional: si falta RESEND_API_KEY se omite)
      if (env.RESEND_API_KEY) {
        const emailCtx = context.waitUntil ? context : null;
        // MULTI-TENANT: el dominio donde corrió el chatbot lo manda el widget.
        // Si no llega, fallback a canchadefutbol7.mx (compat hacia atrás).
        const leadDomain = (payload.domain || 'canchadefutbol7.mx').toLowerCase().replace(/^www\./,'');
        const send = recurrenteVendedor
          ? notifyRecurrente(env, payload, recurrenteVendedor, leadId, leadDomain)
          : sendLeadEmail(env, payload, request, leadId, leadDomain);
        if (emailCtx) emailCtx.waitUntil(send); else await send;
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: corsHeaders('application/json')
    });
  } catch (err) {
    return jsonError('DB error: ' + err.message, 500);
  }
}

// Envía el lead por correo vía Resend. Silencioso ante errores.
// Secreto para firmar el enlace "Asignar desde el correo" (mismo en assign.js).
const ASSIGN_SECRET = "sm-assign-7Kx9-2026";
async function sha256hex(s) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, "0")).join("");
}

async function sendLeadEmail(env, d, request, leadId, leadDomain) {
  try {
    leadDomain = leadDomain || 'canchadefutbol7.mx';
    const to = env.LEADS_EMAIL || 'formulariosweb2021@gmail.com';
    // El "from" debe ser de un dominio verificado en Resend (canchadefutbol7.mx).
    const from = env.LEADS_FROM || 'Leads canchadefutbol7 <leads@canchadefutbol7.mx>';
    const esc = (s) => String(s || '-').replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));
    const wa = (d.whatsapp || '').replace(/\D/g, '');
    const com = String(d.comentarios || '');
    const tipo = (com.match(/Tipo:\s*([^·]+)/i) || [,''])[1].trim();
    const accesorios = (com.match(/Accesorios:\s*(.+)$/i) || [,''])[1].trim();
    const subject = `Nuevo lead ${leadDomain}${d.fuente ? ' (' + d.fuente + ')' : ''}: ${d.nombre || 'sin nombre'}${d.ciudad ? ' — ' + d.ciudad : ''}`;
    const row = (k, v) => `<tr><td style="padding:4px 14px 4px 0;color:#64748b">${k}</td><td style="padding:4px 0;font-weight:600">${v}</td></tr>`;
    let assignBtn = '';
    if (leadId) {
      const t = (await sha256hex(ASSIGN_SECRET + ':' + leadId)).slice(0, 24);
      assignBtn = `<a href="https://canchadefutbol7.mx/api/assign?id=${leadId}&t=${t}" style="display:inline-block;margin:6px 0 4px;background:#3f922a;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:13px 24px;border-radius:10px">🎯 Asignar a un vendedor</a>`;
    }
    const html = `
      <div style="font-family:system-ui,-apple-system,sans-serif;color:#0f172a">
        <h2 style="margin:0 0 14px">Nuevo lead de ${esc(leadDomain)}</h2>
        <table style="font-size:14px;border-collapse:collapse">
          ${row('Nombre', esc(d.nombre))}
          ${row('WhatsApp', `${esc(d.whatsapp)}${wa ? ` &nbsp;<a href="https://wa.me/52${wa.slice(-10)}">abrir chat</a>` : ''}`)}
          ${row('Ciudad', esc(d.ciudad))}
          ${row('m²', esc(d.m2))}
          ${row('Inicio', esc(d.timeline))}
          ${row('Tipo de cancha', esc(tipo || '-'))}
          ${row('Accesorios', esc(accesorios || '-'))}
          ${row('Fuente', `${esc(d.fuente)}${d.campania ? ' · ' + esc(d.campania) : ''}`)}
        </table>
        ${assignBtn}
        <p style="font-size:12px;color:#64748b;margin-top:16px">Panel de leads: <a href="https://canchadefutbol7.mx/admin">canchadefutbol7.mx/admin</a></p>
      </div>`;

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to, subject, html }),
    });
  } catch (e) { /* silencioso: nunca rompe el guardado del lead */ }
}

// Correo del vendedor (directorio en D1). "" si no tiene.
async function emailDeVendedor(env, nombre) {
  try {
    const row = await env.DB.prepare("SELECT email FROM vendedores WHERE nombre = ? COLLATE NOCASE").bind(nombre).first();
    return row && row.email ? String(row.email).trim() : '';
  } catch (e) { return ''; }
}

// Bloque "¿Cómo te fue?" (4 botones de un clic) usando token firmado.
const RESULT_SECRET = "sm-result-7Kx9-2026";
async function _sha(s) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, "0")).join("");
}
async function resultadoBlock(leadId, nombre) {
  if (!leadId) return "";
  const t = (await _sha(RESULT_SECRET + ":" + leadId)).slice(0, 24);
  const url = (r) => `https://canchadefutbol7.mx/api/lead-resultado?id=${leadId}&t=${t}&r=${r}`;
  const btn = (href, bg, color, txt) => `<a href="${href}" style="display:inline-block;background:${bg};color:${color};text-decoration:none;font-weight:700;font-size:13px;padding:10px 14px;border-radius:9px;margin:4px 4px 0 0;border:1px solid ${bg}">${txt}</a>`;
  const esc = (s) => String(s || "").replace(/[<>&]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c]));
  return `<div style="margin-top:18px;padding:14px;background:#f8fafc;border:1px solid #eef2f6;border-radius:12px">
    <div style="font-size:13px;font-weight:800;color:#0f172a;margin-bottom:6px">¿Cómo te fue con ${esc(nombre || "el cliente")}?</div>
    <div style="font-size:11.5px;color:#64748b;margin-bottom:10px">Un clic = se registra en el panel.</div>
    ${btn(url("interested"), "#dcfce7", "#15803d", "🟢 Interesado")}
    ${btn(url("scheduled"), "#dbeafe", "#1d4ed8", "📅 Agendé")}
    ${btn(url("noresp"), "#fef3c7", "#b45309", "⏰ Sin respuesta")}
    ${btn(url("notinterested"), "#fee2e2", "#b91c1c", "❌ No interesa")}
  </div>`;
}

// 🔁 Aviso al MISMO vendedor de que su cliente volvió a contactar.
// `leadDomain` (multi-tenant) es opcional — solo para logs/subject; el comportamiento sigue igual.
async function notifyRecurrente(env, d, vendedor, leadId, leadDomain) {
  try {
    let to = await emailDeVendedor(env, vendedor);
    if (!to) to = env.LEADS_EMAIL || 'formulariosweb2021@gmail.com'; // fallback: avisa a Olga
    const from = env.LEADS_FROM || 'Leads canchadefutbol7 <leads@canchadefutbol7.mx>';
    const esc = (s) => String(s == null ? '-' : s).replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));
    const nombre = (d.nombre || 'tu cliente').trim();
    const wa = (d.whatsapp || '').replace(/\D/g, '');
    const tel = wa.startsWith('52') ? wa.slice(2) : wa;
    const msg = encodeURIComponent(`Hola ${nombre} 👋 Soy ${vendedor} de Sportmaster, vi que retomaste tu interés en una cancha de fútbol 7${d.ciudad ? ' en ' + d.ciudad : ''}. ¿Cómo te puedo apoyar?`);
    const waLink = wa ? `https://wa.me/52${tel}?text=${msg}` : '';
    const html = `
      <div style="font-family:system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif;max-width:520px;margin:0 auto;color:#0f172a">
        <div style="background:linear-gradient(135deg,#1e3a8a,#1d4ed8);color:#fff;border-radius:16px 16px 0 0;padding:20px 24px">
          <div style="font-size:13px;opacity:.85;text-transform:uppercase;letter-spacing:.04em">Cliente recurrente</div>
          <div style="font-size:21px;font-weight:800;margin-top:2px">🔁 ${esc(nombre)} volvió a contactar</div>
        </div>
        <div style="border:1px solid #eef2f6;border-top:none;border-radius:0 0 16px 16px;padding:22px 24px;background:#fff">
          <p style="font-size:14.5px;margin:0 0 14px">Hola <b>${esc(vendedor)}</b>, este cliente <b>ya es tuyo</b> y acaba de volver a dejar sus datos. Retómalo, ya conoces su historia:</p>
          <div style="background:#f8fafc;border:1px solid #eef2f6;border-radius:12px;padding:14px 16px;font-size:14px">
            <div><b>${esc(nombre)}</b> · 📍 ${esc(d.ciudad || '—')} · <b>${esc(d.m2 || '?')} m²</b></div>
            <div style="color:#64748b;margin-top:4px">WhatsApp: ${esc(d.whatsapp || '—')}</div>
          </div>
          ${waLink ? `<a href="${waLink}" style="display:inline-block;margin-top:16px;background:#25d366;color:#fff;text-decoration:none;font-weight:800;font-size:14px;padding:12px 20px;border-radius:10px">💬 Contactar por WhatsApp</a>` : ''}
          ${await resultadoBlock(leadId, nombre)}
          <p style="font-size:12px;color:#94a3b8;margin-top:16px">No cuenta como lead nuevo — es seguimiento. Panel: <a href="https://canchadefutbol7.mx/admin" style="color:#1d4ed8">canchadefutbol7.mx/admin</a></p>
        </div>
      </div>`;
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to, subject: `🔁 ${nombre} volvió a contactar — es tu cliente`, html }),
    });
  } catch (e) { /* silencioso */ }
}

// CORS preflight
export async function onRequestOptions() {
  return new Response(null, { headers: corsHeaders() });
}

function corsHeaders(contentType) {
  const h = {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'content-type'
  };
  if (contentType) h['content-type'] = contentType;
  return h;
}

function jsonError(msg, status) {
  return new Response(JSON.stringify({ ok: false, error: msg }), {
    status,
    headers: corsHeaders('application/json')
  });
}
