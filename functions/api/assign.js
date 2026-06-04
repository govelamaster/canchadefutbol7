/**
 * GET /api/assign?id=ID&t=TOKEN[&v=VENDEDOR]
 * Página para asignar un lead a un vendedor DESDE el correo (con token firmado).
 * - Sin v: muestra dropdown de vendedores.
 * - Con v: asigna (reusa /api/lead-update → correo bonito al vendedor) y confirma.
 */
const ASSIGN_SECRET = "sm-assign-7Kx9-2026";
const MASTER = "Cancha2026!";
const VENDEDORES = [
  "Jorge Dantes", "Blanca López", "Susana", "Carolina", "Paola Ramos", "Quijano",
  "Jorge Padilla", "Estefanía", "Maribel", "Yolanda", "Gaby", "Gloria", "Melissa", "Arellano"
];

async function sha256hex(s) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, "0")).join("");
}
async function tokenFor(id) { return (await sha256hex(ASSIGN_SECRET + ":" + id)).slice(0, 24); }
const esc = (s) => String(s == null ? "" : s).replace(/[<>&]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c]));

function page(title, inner) {
  return new Response(
    `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head>
     <body style="margin:0;background:#eef2f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif">
       <div style="max-width:460px;margin:40px auto;padding:0 16px;color:#0f172a">
         <div style="background:#fff;border-radius:18px;box-shadow:0 12px 38px rgba(2,6,23,.12);padding:26px 26px">${inner}</div>
       </div>
     </body></html>`,
    { headers: { "content-type": "text/html;charset=utf-8" } }
  );
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const id = parseInt(url.searchParams.get("id"), 10);
  const t = url.searchParams.get("t") || "";
  const v = url.searchParams.get("v") || "";
  if (!id) return page("Error", "<h2>Falta el lead.</h2>");
  if (t !== (await tokenFor(id))) return page("No autorizado", "<h2>🔒 Enlace inválido</h2><p>Este enlace de asignación no es válido o expiró.</p>");

  let lead = null;
  try { lead = await env.DB.prepare("SELECT nombre, nombre_real, ciudad, m2, vendedor FROM leads WHERE id = ?").bind(id).first(); } catch (e) {}
  if (!lead) return page("No encontrado", "<h2>Lead no encontrado.</h2>");
  const nom = lead.nombre_real || lead.nombre || "Cliente";

  // Con vendedor → asignar
  if (v) {
    if (!VENDEDORES.includes(v)) return page("Error", "<h2>Vendedor no válido.</h2>");
    try {
      await fetch(new URL("/api/lead-update", request.url).toString(), {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ p: MASTER, id: String(id), field: "vendedor", value: v, asistente: "(desde correo)" })
      });
    } catch (e) { return page("Error", "<h2>No se pudo asignar</h2><p>" + esc(e.message) + "</p>"); }
    return page("Asignado", `
      <div style="text-align:center">
        <div style="font-size:46px">✅</div>
        <h2 style="margin:8px 0 6px">¡Asignado!</h2>
        <p style="font-size:16px;margin:0 0 4px"><b>${esc(nom)}</b>${lead.ciudad ? " · " + esc(lead.ciudad) : ""}</p>
        <p style="font-size:15px;color:#475569;margin:0 0 16px">Ahora es de <b style="color:#3f922a">${esc(v)}</b>.</p>
        <p style="font-size:13px;color:#64748b;margin:0 0 18px">Ya le llegó el correo con los datos del cliente. 🎯</p>
        <a href="https://canchadefutbol7.mx/admin" style="display:inline-block;background:#3f922a;color:#fff;text-decoration:none;padding:13px 24px;border-radius:10px;font-weight:700">Ir al panel</a>
      </div>`);
  }

  // Sin vendedor → formulario
  const opts = VENDEDORES.map(x => `<option value="${esc(x)}" ${lead.vendedor === x ? "selected" : ""}>${esc(x)}</option>`).join("");
  return page("Asignar lead", `
    <h2 style="margin:0 0 6px">🎯 Asignar lead</h2>
    <p style="color:#64748b;margin:0 0 18px;font-size:14px"><b style="color:#0f172a">${esc(nom)}</b> · ${esc(lead.ciudad || "—")} · ${esc(lead.m2 || "?")} m²${lead.vendedor ? ` · actual: <b>${esc(lead.vendedor)}</b>` : ""}</p>
    <form method="GET" action="/api/assign">
      <input type="hidden" name="id" value="${id}">
      <input type="hidden" name="t" value="${esc(t)}">
      <select name="v" style="width:100%;padding:13px;border:1px solid #e2e8f0;border-radius:10px;font-size:16px;margin-bottom:14px;background:#fff">${opts}</select>
      <button type="submit" style="width:100%;background:#3f922a;color:#fff;border:none;padding:15px;border-radius:10px;font-size:16px;font-weight:700;cursor:pointer">Asignar vendedor</button>
    </form>`);
}
