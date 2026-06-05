/**
 * GET /api/bot-config?path=/bancas-para-jugadores/
 * Devuelve la configuración del chatbot para esa URL.
 * Si no encuentra match -> 200 { ok: true, config: null } -> chatbot.js cae al bot genérico.
 * Siempre responde rápido y nunca falla con error: si la DB explota, devuelve null (fallback seguro).
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
    if (!env.DB) return json({ ok: true, config: null });

    // Busca match EXACTO primero, después por prefijo (para futuros patterns con *)
    let row = null;
    try {
      row = await env.DB.prepare(
        "SELECT bot_name, teaser_titulo, teaser_sub, pasos_json, fuente_label FROM bot_configs WHERE url_pattern = ? AND activo = 1 LIMIT 1"
      ).bind(path).first();
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
