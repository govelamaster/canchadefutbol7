/**
 * GET /api/leads?p=<password>
 * Devuelve todos los leads en JSON. Protegido con password simple.
 */

const ADMIN_PASSWORD = "Cancha2026!";

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const auth = url.searchParams.get('p') || request.headers.get('x-admin-password');

  if (auth !== ADMIN_PASSWORD) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'content-type': 'application/json' }
    });
  }

  try {
    const result = await env.DB.prepare(`
      SELECT id, fecha, session_id, estado, nombre, whatsapp, ciudad, m2, timeline, comentarios, fuente,
             vendedor, tipo_cliente, status_proyecto, notas_internas, tocado_por, tocado_fecha
      FROM leads
      ORDER BY fecha DESC
      LIMIT 5000
    `).all();

    return new Response(JSON.stringify({
      ok: true,
      count: result.results.length,
      leads: result.results
    }), {
      headers: {
        'content-type': 'application/json',
        'cache-control': 'no-store'
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 500,
      headers: { 'content-type': 'application/json' }
    });
  }
}
