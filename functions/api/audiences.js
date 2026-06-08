/**
 * Audience Manager — exports listos para subir a plataformas de Ads.
 *
 * GET /api/audiences?p=PWD                            → JSON con stats + 5 segmentos predefinidos
 * GET /api/audiences?p=PWD&segment=X&platform=Y       → CSV listo para subir
 *
 * Segmentos:
 *   - solo_visitas       → vieron pero NO dejaron datos (remarketing)
 *   - leads_completos    → llenaron form (excluir / lookalike base)
 *   - leads_calientes    → hot prospects (con WhatsApp + reciente)
 *   - leads_ganados      → cerraron compra (lookalike GOLD)
 *   - todos              → todo el universo
 *
 * Plataformas:
 *   - google    → CSV con gclid (Customer Match formato Google Ads)
 *   - meta      → CSV con SHA-256 de email + phone (Facebook/Instagram Custom Audiences)
 *   - tiktok    → CSV mismo formato que Meta (compatible)
 *   - raw       → CSV completo sin transformar
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

// Normaliza email para hashing (lowercase + trim)
function normalizeEmail(e) { return String(e || '').trim().toLowerCase(); }

// Normaliza phone a E.164 sin "+" (Meta/Google requirement)
function normalizePhone(p, defaultCountry = '52') {
  let d = String(p || '').replace(/\D/g, '');
  if (!d) return '';
  // Si empieza con código de país (52, 1, 34, etc.) lo respetamos; si no, asumimos México
  if (d.length === 10) d = defaultCountry + d;
  return d;
}

function csvEsc(v) {
  const s = (v == null ? '' : String(v));
  if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const auth = url.searchParams.get('p') || request.headers.get('x-admin-password');
  if (!(await authorized(env, auth))) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { 'content-type': 'application/json' }
    });
  }

  const segment = url.searchParams.get('segment') || '';
  const platform = url.searchParams.get('platform') || '';

  // === MODO STATS (sin segment): devolver overview JSON ===
  if (!segment) {
    try {
      const stats = await env.DB.prepare(`
        SELECT
          (SELECT COUNT(*) FROM visitor_clicks WHERE NOT EXISTS(
              SELECT 1 FROM leads l WHERE l.gclid = visitor_clicks.gclid AND l.gclid != ''
            )) as solo_visitas,
          (SELECT COUNT(*) FROM leads WHERE (whatsapp != '' OR nombre != '') AND status_proyecto NOT IN ('Ganado','Perdido')) as leads_activos,
          (SELECT COUNT(*) FROM leads WHERE status_proyecto = 'Ganado') as leads_ganados,
          (SELECT COUNT(*) FROM leads WHERE wa_norm != '') as leads_con_whatsapp,
          (SELECT COUNT(*) FROM leads WHERE gclid != '' AND gclid IS NOT NULL) as leads_con_gclid,
          (SELECT COUNT(*) FROM visitor_clicks) as total_visitas
      `).first();
      return new Response(JSON.stringify({ ok: true, stats }), {
        headers: { 'content-type': 'application/json', 'cache-control': 'no-store' }
      });
    } catch (err) {
      return new Response(JSON.stringify({ ok: false, error: err.message }), { status: 500 });
    }
  }

  // === MODO EXPORT (con segment + platform): generar CSV ===
  try {
    let rows = [];
    if (segment === 'solo_visitas') {
      const r = await env.DB.prepare(`
        SELECT v.gclid, v.gbraid, v.wbraid, v.domain, v.path, v.gad_campaignid, v.received_at, '' as nombre, '' as whatsapp, '' as ciudad
        FROM visitor_clicks v
        WHERE v.gclid != '' AND NOT EXISTS(SELECT 1 FROM leads l WHERE l.gclid = v.gclid AND l.gclid != '')
        ORDER BY v.received_at DESC
        LIMIT 50000
      `).all();
      rows = r.results || [];
    } else if (segment === 'leads_completos') {
      const r = await env.DB.prepare(`
        SELECT gclid, '' as gbraid, '' as wbraid, '' as domain, '' as path, campania as gad_campaignid, fecha as received_at, nombre, whatsapp, ciudad
        FROM leads
        WHERE (whatsapp != '' OR nombre != '')
        ORDER BY fecha DESC
        LIMIT 50000
      `).all();
      rows = r.results || [];
    } else if (segment === 'leads_calientes') {
      const r = await env.DB.prepare(`
        SELECT gclid, '' as gbraid, '' as wbraid, '' as domain, '' as path, campania as gad_campaignid, fecha as received_at, nombre, whatsapp, ciudad
        FROM leads
        WHERE wa_norm != '' AND status_proyecto IN ('Sin atender','Contactado','Cotizado','Negociación')
          AND fecha >= datetime('now','-30 days')
        ORDER BY fecha DESC
        LIMIT 50000
      `).all();
      rows = r.results || [];
    } else if (segment === 'leads_ganados') {
      const r = await env.DB.prepare(`
        SELECT gclid, '' as gbraid, '' as wbraid, '' as domain, '' as path, campania as gad_campaignid, fecha as received_at, nombre, whatsapp, ciudad
        FROM leads
        WHERE status_proyecto = 'Ganado'
        ORDER BY fecha DESC
        LIMIT 50000
      `).all();
      rows = r.results || [];
    } else if (segment === 'todos') {
      // Union: leads + visitor_clicks que NO son leads
      const r1 = await env.DB.prepare(`
        SELECT gclid, '' as gbraid, '' as wbraid, '' as domain, '' as path, campania as gad_campaignid, fecha as received_at, nombre, whatsapp, ciudad
        FROM leads ORDER BY fecha DESC LIMIT 25000
      `).all();
      const r2 = await env.DB.prepare(`
        SELECT v.gclid, v.gbraid, v.wbraid, v.domain, v.path, v.gad_campaignid, v.received_at, '' as nombre, '' as whatsapp, '' as ciudad
        FROM visitor_clicks v
        WHERE v.gclid != '' AND NOT EXISTS(SELECT 1 FROM leads l WHERE l.gclid = v.gclid AND l.gclid != '')
        LIMIT 25000
      `).all();
      rows = (r1.results || []).concat(r2.results || []);
    }

    // === Transformar según plataforma ===
    let csv = '';
    const ts = new Date().toISOString().slice(0,10);

    if (platform === 'google') {
      // Google Ads Customer Match — formato gclid (Click ID Match)
      const headers = ['Google Click ID','Conversion Time','Conversion Name','Conversion Value','Conversion Currency'];
      const lines = rows
        .filter(r => r.gclid)
        .map(r => [r.gclid, (r.received_at||'').replace(' ','T'), 'Lead', '', 'MXN'].map(csvEsc).join(','));
      csv = headers.join(',') + '\n' + lines.join('\n');
      return new Response(csv, {
        headers: {
          'content-type': 'text/csv;charset=utf-8',
          'content-disposition': `attachment; filename="google-ads-${segment}-${ts}.csv"`
        }
      });
    }

    if (platform === 'meta' || platform === 'tiktok') {
      // Meta Custom Audiences — SHA-256 de phone + email + ciudad
      const headers = ['phone','email','fn','city','country'];
      const lines = [];
      for (const r of rows) {
        const phone = normalizePhone(r.whatsapp);
        const phoneHash = phone ? await sha256hex(phone) : '';
        const fn = (r.nombre || '').toLowerCase().trim().split(' ')[0] || '';
        const fnHash = fn ? await sha256hex(fn) : '';
        const city = (r.ciudad || '').toLowerCase().trim().split(',')[0] || '';
        const cityHash = city ? await sha256hex(city) : '';
        const country = await sha256hex('mx');
        // Meta NO acepta filas sin al menos un identificador
        if (!phoneHash && !fnHash) continue;
        lines.push([phoneHash, '', fnHash, cityHash, country].map(csvEsc).join(','));
      }
      csv = headers.join(',') + '\n' + lines.join('\n');
      return new Response(csv, {
        headers: {
          'content-type': 'text/csv;charset=utf-8',
          'content-disposition': `attachment; filename="${platform}-${segment}-${ts}.csv"`
        }
      });
    }

    // RAW
    const headers = ['fecha','nombre','whatsapp','ciudad','gclid','gbraid','wbraid','dominio','path','campania'];
    const lines = rows.map(r => [r.received_at, r.nombre, r.whatsapp, r.ciudad, r.gclid, r.gbraid, r.wbraid, r.domain, r.path, r.gad_campaignid].map(csvEsc).join(','));
    csv = '﻿' + headers.join(',') + '\n' + lines.join('\n');
    return new Response(csv, {
      headers: {
        'content-type': 'text/csv;charset=utf-8',
        'content-disposition': `attachment; filename="audiencia-${segment}-${ts}.csv"`
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 500, headers: { 'content-type': 'application/json' }
    });
  }
}
