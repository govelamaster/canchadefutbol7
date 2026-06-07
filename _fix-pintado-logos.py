#!/usr/bin/env python3
"""Fix 'pintado' a 'insertado' SOLO en contexto logo/escudo. NO toca lineas, lamina ni pintura legitima."""
import os, glob

REPLACES = [
    # Frases galería caso real Tamaulipas
    ("logo del Gobierno del Estado pintado directamente sobre el césped",
     "logo del Gobierno del Estado insertado directamente en el césped con pasto sintético del mismo color"),
    ("logo del Estado pintado en pasto sintético",
     "logo del Estado insertado en pasto sintético"),
    ("logo del estado pintado en pasto sintético",
     "logo del estado insertado en pasto sintético"),
    ("logo Tamaulipas pintado en pasto sintético deportivo",
     "logo Tamaulipas insertado en pasto sintético deportivo"),
    ("logo Tamaulipas pintado, construida por Sportmaster",
     "logo Tamaulipas insertado, construida por Sportmaster"),
    ("logo Tamaulipas pintado",
     "logo Tamaulipas insertado"),
    ("logo del Gobierno de Tamaulipas pintado en el césped",
     "logo del Gobierno de Tamaulipas insertado en el césped con pasto sintético"),
    ("logo del estado pintado, obra entregada por Sportmaster",
     "logo del estado insertado, obra entregada por Sportmaster"),
    ("logo del estado pintado",
     "logo del estado insertado"),
    ("Cancha entregada en Tamaulipas con logo del estado pintado en pasto sintético.",
     "Cancha entregada en Tamaulipas con logo del estado insertado en pasto sintético."),
    # FAQs azul
    ("Pintamos escudos del equipo, logos del Gobierno del Estado, escudos institucionales y diseños corporativos directamente sobre el pasto sintético con pintura deportiva resistente al sol.",
     "Insertamos escudos del equipo, logos del Gobierno del Estado, escudos institucionales y diseños corporativos directamente con pasto sintético del color elegido, no usamos pintura. El logo es del mismo pasto, integrado en la cancha."),
    ("¿Pueden pintar escudos o logos sobre pasto sintético?",
     "¿Pueden insertar escudos o logos en pasto sintético?"),
    ("escudos pintados o cosidos en pasto",
     "escudos insertados con pasto sintético del color elegido"),
    ("escudos pintados",
     "escudos insertados"),
    # JSON-LD FAQs azul: escapar
    ("Tienen pasto sintetico rojo, amarillo u otros colores ademas del azul?",
     "Tienen pasto sintetico rojo, amarillo u otros colores ademas del azul?"),  # placeholder
]

changed = 0
total_subs = 0
for f in glob.glob("**/index.html", recursive=True):
    if "node_modules" in f or "backups/" in f: continue
    with open(f) as fp: h = fp.read()
    new = h
    n = 0
    for old, rep in REPLACES:
        if old in new:
            new = new.replace(old, rep)
            n += h.count(old)
    if new != h:
        with open(f,"w") as fp: fp.write(new)
        changed += 1
        total_subs += n

# llms.txt también
for f in glob.glob("**/llms.txt", recursive=True):
    if "backups/" in f: continue
    with open(f) as fp: h = fp.read()
    new = h
    for old, rep in REPLACES:
        new = new.replace(old, rep)
    if new != h:
        with open(f,"w") as fp: fp.write(new)
        changed += 1

print(f"Archivos cambiados: {changed}")
