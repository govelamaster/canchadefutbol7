# Pendientes — Email leads → admin canchadefutbol7

> Estado al cierre 2026-06-08. Retomar mañana.

## ✅ Lo que YA está vivo

- Email Routing `canchadefutbol7.mx` habilitado en Cloudflare
- Email Worker `canchadefutbol7-email-leads` deployado a Workers
- Rule `leads@canchadefutbol7.mx` → worker (id `84de466b48fa…`)
- D1 con columna `landing` + tabla `leads_unparsed`
- Commit `11d1f3d` en GitHub main (sin Co-Authored-By, sin barrer cambios Codex)
- Preview desplegado: <https://preview-email-leads.canchadefutbol7.pages.dev/admin.html>

## ⏸ Pendiente del lado Olga (mañana)

### Paso 0 — Validar preview (2 min)
- Abre <https://preview-email-leads.canchadefutbol7.pages.dev/admin.html>
- Entra con `Cancha2026!`
- Confirma que el botón **📨 Sin clasificar** aparece entre CSV y Salir
- Si OK → decirle a Claude **"dale a main"**

### Paso 1 — Configurar reenvío en Gmail (5 min)
1. gmail.com → engrane → **Ver todos los ajustes**
2. Pestaña **Reenvío y correo POP/IMAP**
3. Agregar dirección de reenvío: `leads@canchadefutbol7.mx` → Siguiente
4. Gmail manda código de confirmación → cae en `leads_unparsed`
5. Abrir <https://canchadefutbol7.mx/api/leads-unparsed?p=Cancha2026!> (solo después del deploy a main)
6. Buscar campo `raw` o `subject` con el código de 9 dígitos
7. Pegarlo en Gmail → Confirmar

### Paso 2 — Crear 2 filtros Gmail (3 min)
gmail.com → engrane → **Filtros y direcciones bloqueadas** → **Crear filtro nuevo**

- **Filtro A:** "Contiene las palabras" = `"Tienes un nuevo contacto en"` → Reenviar a `leads@canchadefutbol7.mx`
- **Filtro B:** "Contiene las palabras" = `"Funciona con: Elementor"` → Reenviar a `leads@canchadefutbol7.mx`

### Paso 3 — Validar (2 min)
1. Reenvía manualmente 1 lead viejo a `leads@canchadefutbol7.mx`
2. Espera 30 seg → abre `canchadefutbol7.mx/admin.html`
3. Debe aparecer el lead con su `fuente` correcta (cliengo_web, form_organico, etc.)
4. Si no aparece, va a estar en `/api/leads-unparsed?p=Cancha2026!` con el motivo

## 🚦 Bloqueo actual

**Yo necesito tu OK explícito para `wrangler pages deploy . --project-name canchadefutbol7 --branch main`** — sin eso, `/api/leads-unparsed` no está vivo en producción y no puedes recoger el código de Gmail.

## 📚 Documentación viva

- Instrucciones detalladas Gmail: `email-leads-worker/INSTRUCCIONES-GMAIL-FORWARD.md`
- Código del worker: `email-leads-worker/src/index.js`
- Endpoints admin: `functions/api/leads.js`, `functions/api/leads-unparsed.js`

## 🛟 Rollback si algo se rompe en main

```bash
# Opción 1: Cloudflare Dashboard → Pages → canchadefutbol7 → Deployments → Rollback (30 seg)
# Opción 2: git revert + redeploy
cd "/Users/olgagovela/Library/CloudStorage/GoogleDrive-govelamaster@gmail.com/My Drive/Proyectos/sportmaster-canchadefut7/"
git revert 11d1f3d
git push origin main
wrangler pages deploy . --project-name canchadefutbol7 --branch main
```
