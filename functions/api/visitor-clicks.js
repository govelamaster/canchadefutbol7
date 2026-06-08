/**
 * GET /api/visitor-clicks?p=PASSWORD
 *   → JSON con últimas 1000 visitas pagadas (gclid/gbraid/wbraid)
 *
 * GET /api/visitor-clicks?p=PASSWORD&format=csv
 *   → CSV exportable a Google Ads (Customer Match) o a Facebook/Meta
 *
 * Cruza con leads existentes para marcar has_lead=1 cuando el gclid también está en leads.
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
  } catch (_) { return false; }
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const auth = url.searchParams.get('p') || request.headers.get('x-admin-password');
  const format = url.searchParams.get('format') || 'json';

  if (!(await authorized(env, auth))) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { 'content-type': 'application/json' }
    });
  }

  try {
    // Cruzar con leads: marcamos has_lead=1 si el gclid de la visita coincide con un lead
    const result = await env.DB.prepare(`
      SELECT v.id, v.received_at, v.gclid, v.gbraid, v.wbraid, v.gad_source, v.gad_campaignid,
             v.url, v.domain, v.path, v.referrer, v.ip, v.user_agent,
             CASE WHEN EXISTS(SELECT 1 FROM leads l WHERE l.gclid = v.gclid AND l.gclid != '') THEN 1 ELSE 0 END as has_lead
      FROM visitor_clicks v
      ORDER BY v.received_at DESC
      LIMIT 1000
    `).all();

    const rows = (result && result.results) || [];

    if (format === 'csv') {
      const headers = ['id','fecha','gclid','gbraid','wbraid','gad_source','gad_campaignid','dominio','path','url','referrer','has_lead'];
      const esc = v => {
        const s = (v == null ? '' : String(v));
        if (/[",\n]/.test(s)) return '"' + s.replace(/"/g,'""') + '"';
        return s;
      };
      const lines = rows.map(r => [r.id, r.received_at, r.gclid, r.gbraid, r.wbraid, r.gad_source, r.gad_campaignid, r.domain, r.path, r.url, r.referrer, r.has_lead].map(esc).join(','));
      const csv = '﻿' + headers.join(',') + '\n' + lines.join('\n');
      return new Response(csv, {
        headers: {
          'content-type': 'text/csv;charset=utf-8',
          'content-disposition': 'attachment; filename="visitor-clicks-' + new Date().toISOString().slice(0,10) + '.csv"'
        }
      });
    }

    // Stats agregados para el tab
    const total = rows.length;
    const conLead = rows.filter(r => r.has_lead).length;
    const tasaConv = total > 0 ? Math.round((conLead / total) * 100 * 10) / 10 : 0;
    const porCampania = {};
    for (const r of rows) {
      const k = r.gad_campaignid || '(sin id)';
      if (!porCampania[k]) porCampania[k] = { clicks: 0, leads: 0 };
      porCampania[k].clicks++;
      if (r.has_lead) porCampania[k].leads++;
    }
    const porDominio = {};
    for (const r of rows) {
      const k = r.domain || '(sin dominio)';
      if (!porDominio[k]) porDominio[k] = { clicks: 0, leads: 0 };
      porDominio[k].clicks++;
      if (r.has_lead) porDominio[k].leads++;
    }

    return new Response(JSON.stringify({
      ok: true,
      count: total,
      con_lead: conLead,
      sin_lead: total - conLead,
      tasa_conversion_pct: tasaConv,
      por_campania: porCampania,
      por_dominio: porDominio,
      visits: rows
    }), {
      headers: { 'content-type': 'application/json', 'cache-control': 'no-store' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 500, headers: { 'content-type': 'application/json' }
    });
  }
}
