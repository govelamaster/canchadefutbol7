/**
 * GET /api/bot-config?path=/bancas-para-jugadores/&domain=canchadefutbol7.mx
 * Devuelve la configuración del chatbot para ese (dominio, URL).
 * Si no encuentra match -> 200 { ok: true, config: null } -> chatbot.js cae al bot genérico.
 * Siempre responde rápido y nunca falla con error: si la DB explota, devuelve null (fallback seguro).
 *
 * MULTI-TENANT: columna `domain` en bot_configs identifica la empresa.
 *   Default = 'canchadefutbol7.mx' (back-compat con filas existentes).
 *   Fallback en orden:
 *     1) (domain, path) exacto
 *     2) (domain, '/') = bot por default de ese dominio
 *     3) (canchadefutbol7.mx, path) compat con filas viejas sin domain
 */
function json(o, s) {
  return new Response(JSON.stringify(o), {
    status: s || 200,
    headers: {
      "content-type": "application/json",
      "access-control-allow-origin": "*",
      "cache-control": "public, max-age=300, s-maxage=300"
    }
  });
}

export async function onRequestGet({ request, env }) {
  try {
    const url = new URL(request.url);
    const path = (url.searchParams.get("path") || "/").toLowerCase();
    const domain = (url.searchParams.get("domain") || "canchadefutbol7.mx").toLowerCase().replace(/^www\./, "");
    if (!env.DB) return json({ ok: true, config: null });

    const SELECT = "SELECT bot_name, teaser_titulo, teaser_sub, pasos_json, fuente_label, cta_label FROM bot_configs";
    let row = null;
    try {
      // 1) match exacto (domain + path)
      row = await env.DB.prepare(
        SELECT + " WHERE domain = ? AND url_pattern = ? AND activo = 1 LIMIT 1"
      ).bind(domain, path).first();

      // 2) default por dominio (url_pattern = '/')
      if (!row && path !== "/") {
        row = await env.DB.prepare(
          SELECT + " WHERE domain = ? AND url_pattern = '/' AND activo = 1 LIMIT 1"
        ).bind(domain).first();
      }

      // 3) compat backward: filas viejas sin domain
      if (!row) {
        row = await env.DB.prepare(
          SELECT + " WHERE url_pattern = ? AND activo = 1 LIMIT 1"
        ).bind(path).first();
      }
    } catch (e) { row = null; }

    if (!row) return json({ ok: true, config: null });

    let pasos = [];
    try { pasos = JSON.parse(row.pasos_json || "[]"); }
    catch (e) { return json({ ok: true, config: null }); }

    if (!Array.isArray(pasos) || !pasos.length) return json({ ok: true, config: null });

    return json({
      ok: true,
      config: {
        botName: row.bot_name,
        teaserTitulo: row.teaser_titulo || "",
        teaserSub: row.teaser_sub || "",
        cta: row.cta_label || "",
        fuenteLabel: row.fuente_label || "Chatbot",
        pasos
      }
    });
  } catch (e) {
    // Cualquier error inesperado -> null -> bot genérico (NUNCA tira el chatbot)
    return json({ ok: true, config: null });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET, OPTIONS",
      "access-control-allow-headers": "content-type"
    }
  });
}
