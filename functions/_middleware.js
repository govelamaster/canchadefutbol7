// Bloquea archivos internos de trabajo para que NO sean accesibles públicamente.
// No borra ni mueve nada: solo responde 404 si alguien pide estas rutas.
// Futuro-proof: cualquier script .py, carpeta /audit, notas PENDIENTES-*.md o backups.
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
  return next();
}
