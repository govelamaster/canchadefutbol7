// 1) Bloquea archivos internos de trabajo para que NO sean accesibles públicamente.
//    No borra ni mueve nada: solo responde 404 si alguien pide estas rutas.
//    Futuro-proof: cualquier script .py, carpeta /audit, notas PENDIENTES-*.md o backups.
// 2) Inyecta el chatbot (/chatbot.js) en TODAS las páginas HTML, automáticamente,
//    incluidas las que se publiquen en el futuro. Cero edición por página.
export async function onRequest({ request, next }) {
  const p = new URL(request.url).pathname.toLowerCase();
  const blocked =
    p.endsWith(".py") ||
    p === "/audit" || p.startsWith("/audit/") ||
    (p.startsWith("/pendientes-") && p.endsWith(".md")) ||
    p.endsWith(".bak") || p.includes(".backup-");
  if (blocked) {
    return new Response("Not Found", { status: 404 });
  }

  const res = await next();

  // Solo tocamos respuestas HTML; el resto (imágenes, JS, etc.) pasa intacto.
  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("text/html")) return res;

  // NO inyectar el chatbot en el panel interno /admin: ahí los botones "Responder"
  // son links de WhatsApp y el chatbot los interceptaba (no se podía responder a clientes).
  if (p === "/admin" || p === "/admin.html" || p.startsWith("/admin/") || p.startsWith("/api/")) return res;

  // Inserta <script src="/chatbot.js?v=..." defer> justo antes de </body>.
  // ⚠️ Los .js se cachean 1 año (immutable). chatbot.js es nombre fijo → versiona la URL
  // con CHATBOT_VER (cámbialo cada vez que edites chatbot.js) para romper la caché al instante.
  // chatbot.js se auto-protege: si la página ya trae el bot inline (la home), no duplica.
  const CHATBOT_VER = "20260622wa";
  return new HTMLRewriter()
    .on("body", {
      element(el) {
        el.append(`<script src="/chatbot.js?v=${CHATBOT_VER}" defer></script>`, { html: true });
      },
    })
    .transform(res);
}
