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

  // Inserta <script src="/chatbot.js" defer> justo antes de </body>.
  // chatbot.js se auto-protege: si la página ya trae el bot inline (la home), no duplica.
  return new HTMLRewriter()
    .on("body", {
      element(el) {
        el.append('<script src="/chatbot.js" defer></script>', { html: true });
      },
    })
    .transform(res);
}
