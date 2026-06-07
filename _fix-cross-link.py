#!/usr/bin/env python3
"""Reescribe cross-link sin base/llave en mano/pagina dedicada."""
import re, glob

# H2: string exacto sin ciudad
OLD_H2 = '<h2 style="color:#fff;">Si necesitas el proyecto llave en mano (base + pasto + accesorios), tenemos página dedicada.</h2>'
NEW_H2 = '<h2 style="color:#fff;">¿Te gustaría una cancha de futbol completa? Contáctanos.</h2>'

# P: regex con ciudad capturada
OLD_P = re.compile(r'<p style="color:#dcfce7;">Aquí cotizas <strong>solo el pasto sintético</strong> \(suministro o con instalación\)\. Si tu proyecto incluye construcción integral de la cancha en ([^,<]+), te llevamos a la página específica de servicio completo\.</p>')
NEW_P_TPL = '<p style="color:#dcfce7;">Aquí cotizas <strong>solo el pasto sintético</strong>. Si tu cancha en {ciudad} también lleva porterías, alumbrado, malla y demás accesorios, te ayudamos a cotizar el conjunto por WhatsApp.</p>'

n = 0
for f in glob.glob("**/index.html", recursive=True):
    if "backups/" in f or "node_modules" in f: continue
    h = open(f).read()
    if OLD_H2 not in h and not OLD_P.search(h): continue
    new = h.replace(OLD_H2, NEW_H2)
    new = OLD_P.sub(lambda m: NEW_P_TPL.format(ciudad=m.group(1)), new)
    if new != h:
        open(f,"w").write(new)
        n += 1
print(f"Fixed {n} files")
