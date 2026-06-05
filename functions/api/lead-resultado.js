/**
 * GET /api/lead-resultado?id=ID&t=TOKEN&r=RESULTADO
 * Marca el resultado del seguimiento de un lead desde un link firmado (correo del vendedor).
 *
 * Resultados:
 *   open       → "Contactando…" (al presionar 💬/Responder)
 *   interested → "Cotización"     + status panel
 *   scheduled  → "Negociación"
 *   noresp     → mantiene "Contactando…" pero queda anotado
 *   notinterested → "Perdido"
 *
 * Token = sha256("RESULT_SECRET:id").slice(0,24)
 * No requiere login. Idempotente (puedes hacer clic varias veces).
 */
const RESULT_SECRET = "sm-result-7Kx9-2026";

async function sha256hex(s) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, "0")).join("");
}
async function tokenFor(id) { return (await sha256hex(RESULT_SECRET + ":" + id)).slice(0, 24); }
const esc = (s) => String(s == null ? "" : s).replace(/[<>&]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c]));

const RESULTADOS = {
  open:           { status: "Contactado", notaPrefix: "📲 Contacto iniciado",   color: "#1d4ed8", emoji: "📲" },
  interested:     { status: "Cotizado",   notaPrefix: "🟢 Interesado",          color: "#15803d", emoji: "🟢" },
  scheduled:      { status: "Negociación",notaPrefix: "📅 Llamada/reunión agendada", color: "#15803d", emoji: "📅" },
  noresp:         { status: "Contactado", notaPrefix: "⏰ Sin respuesta",       color: "#b45309", emoji: "⏰" },
  notinterested: { status: "Perdido",     notaPrefix: "❌ No interesado",       color: "#b91c1c", emoji: "❌" },
};

function pag(title, inner) {
  return new Response(
    `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head>
    <body style="margin:0;background:#eef2f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif">
      <div style="max-width:440px;margin:40px auto;padding:0 16px;color:#0f172a">
        <div style="background:#fff;border-radius:18px;box-shadow:0 12px 38px rgba(2,6,23,.12);padding:30px 26px;text-align:center">${inner}</div>
      </div>
    </body></html>`,
    { headers: { "content-type": "text/html;charset=utf-8" } }
  );
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const id = parseInt(url.searchParams.get("id"), 10);
  const t  = url.searchParams.get("t") || "";
  const r  = url.searchParams.get("r") || "";
  if (!id) return pag("Error", "<h2>Falta el lead.</h2>");
  if (t !== (await tokenFor(id))) return pag("No autorizado", "<h2>🔒 Enlace inválido</h2><p>Este link no es válido o expiró.</p>");
  if (!RESULTADOS[r]) return pag("Resultado no válido", "<h2>Resultado no válido.</h2>");

  let lead = null;
  try { lead = await env.DB.prepare("SELECT nombre, ciudad, vendedor, status_proyecto FROM leads WHERE id = ?").bind(id).first(); } catch (e) {}
  if (!lead) return pag("No encontrado", "<h2>Lead no encontrado.</h2>");

  const res = RESULTADOS[r];
  // Para "open" no sobrescribir un status ya avanzado (Ganado/Perdido/Cotización/etc.)
  const yaTrabajado = ["Ganado","Perdido","Cotización","Negociación"].includes(lead.status_proyecto || "");
  const nuevoStatus = (r === "open" && yaTrabajado) ? lead.status_proyecto : res.status;
  const ts = new Date().toISOString().replace("T"," ").slice(0,16);
  const nuevaNota = `[${ts}] ${res.notaPrefix} (desde correo)`;

  try {
    // Concatenamos la nota a notas_internas (separada por salto) y registramos tocado.
    const cur = await env.DB.prepare("SELECT notas_internas FROM leads WHERE id = ?").bind(id).first();
    const notas = ((cur && cur.notas_internas) ? cur.notas_internas + "\n" : "") + nuevaNota;
    await env.DB.prepare(
      "UPDATE leads SET status_proyecto = ?, notas_internas = ?, tocado_por = ?, tocado_fecha = datetime('now'), ultimo_contacto_quien = 'vendedor', ultimo_contacto_fecha = datetime('now') WHERE id = ?"
    ).bind(nuevoStatus, notas, lead.vendedor || "(desde correo)", id).run();
  } catch (e) { return pag("Error", "<h2>No se pudo guardar.</h2><p>" + esc(e.message) + "</p>"); }

  const nom = lead.nombre || "el lead";
  return pag("Registrado", `
    <div style="font-size:46px">${res.emoji}</div>
    <h2 style="margin:10px 0 6px;color:${res.color}">${res.notaPrefix.replace(/^[^ ]+ /, "")}</h2>
    <p style="font-size:15px;margin:0 0 4px;color:#0f172a"><b>${esc(nom)}</b>${lead.ciudad ? " · " + esc(lead.ciudad) : ""}</p>
    <p style="font-size:13.5px;color:#64748b;margin:0 0 18px">Quedó registrado en el panel ✓</p>
    <a href="https://canchadefutbol7.mx/admin" style="display:inline-block;background:#0b0f14;color:#fff;text-decoration:none;padding:11px 22px;border-radius:10px;font-weight:700;font-size:14px">Ir al panel</a>
  `);
}
