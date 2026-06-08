# Filtro Gmail → Email Worker

Reenvía los correos de leads (Cliengo + formularios Elementor) a `leads@canchadefutbol7.mx`
para que caigan automáticamente al admin con su `fuente` y `landing` identificadas.

## Paso 1 — Verificar dirección de reenvío

1. Entra a https://mail.google.com con `govelamaster@gmail.com`.
2. Engrane (arriba a la derecha) → **Ver todos los ajustes**.
3. Pestaña **Reenvío y correo POP/IMAP**.
4. Botón **Agregar una dirección de reenvío** → escribe `leads@canchadefutbol7.mx` → Siguiente.
5. Gmail te pedirá un código de confirmación que **mandará a esa dirección**.
   - El código va a llegar al admin como un correo "no clasificado" en
     `https://canchadefutbol7.mx/api/leads-unparsed?p=Cancha2026!`
   - Copia el código de ahí (búscalo en `raw` o `subject`) y pégalo en Gmail para confirmar.

## Paso 2 — Crear los 3 filtros

En Gmail: engrane → **Ver todos los ajustes** → pestaña **Filtros y direcciones bloqueadas**
→ **Crear un filtro nuevo**.

### Filtro A — Cliengo (cualquier bot, web o Facebook)

- **Contiene las palabras:** `"Tienes un nuevo contacto en"`
- Crear filtro con esta búsqueda → **Reenviarlo a:** `leads@canchadefutbol7.mx`
- (Opcional) Marcar **No enviar a Spam nunca** + **Aplicar etiqueta "Leads/Cliengo"**

### Filtro B — Formularios Elementor (WordPress, orgánico o Google Ads)

- **Contiene las palabras:** `"Funciona con: Elementor"`
- Crear filtro → **Reenviarlo a:** `leads@canchadefutbol7.mx`
- (Opcional) **Aplicar etiqueta "Leads/Form-Web"**

### Filtro C — Otros formularios web (catch-all opcional)

- **Contiene las palabras:** `"URL de la página:" "Agente de usuario:"`
- Crear filtro → **Reenviarlo a:** `leads@canchadefutbol7.mx`
- (Opcional) **Aplicar etiqueta "Leads/Form-Otro"**

> Si no quieres este tercer filtro, los formularios que NO sean Elementor caerán
> a la tabla `leads_unparsed` y los podrás revisar manualmente desde el admin.

## Cómo se etiquetan en el admin

| Origen del correo | `fuente` que verás | `landing` |
|---|---|---|
| Cliengo web (canchasfutbol.mx) | `cliengo_web` | `canchasfutbol.mx` |
| Cliengo Facebook (Pasto Sintetico…) | `cliengo_facebook` | `Pasto Sintetico Sportmaster` |
| Cliengo padel (canchadepadel.mx, canchasdepadel-lp1) | `cliengo_web` | `canchadepadel.mx` / `canchasdepadel-lp1` |
| Elementor orgánico (padelcenter.mx sin gclid) | `form_organico` | `padelcenter.mx/paddle-cancha-en-…` |
| Elementor Google Ads (sportmaster.mx con gclid) | `google_ads_sportmaster` | `sportmaster.mx/sportmasterlp` |
| Cualquier landing nueva que aparezca | se etiqueta sola con su dominio + path | — |

## Verificar que funciona

1. Manda un correo de prueba a `leads@canchadefutbol7.mx` con el cuerpo de un correo Cliengo real.
2. Espera 30 segundos.
3. Abre `https://canchadefutbol7.mx/admin.html` y busca el lead más reciente.
4. Si no aparece, revisa `https://canchadefutbol7.mx/api/leads-unparsed?p=Cancha2026!` —
   ahí caen los formatos que el worker no reconoció (con el cuerpo crudo).

## Logs del worker

En tu mac:
```bash
cd "/Users/olgagovela/Library/CloudStorage/GoogleDrive-govelamaster@gmail.com/My Drive/Proyectos/sportmaster-canchadefut7/email-leads-worker"
wrangler tail canchadefutbol7-email-leads
```
