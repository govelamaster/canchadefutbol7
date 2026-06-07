#!/usr/bin/env python3
"""Hyperlinka 'Servicios y accesorios opcionales' en TODAS las landings."""
import os, glob

REPLACES = [
    ('<li><span class="mark xmark">·</span> Porterías deportivas</li>',
     '<li><span class="mark xmark">·</span> <a href="https://canchadefutbol7.mx/porterias-para-canchas-de-futbol/">Porterías deportivas</a></li>'),
    ('<li><span class="mark xmark">·</span> Malla ciclónica y redes perimetrales</li>',
     '<li><span class="mark xmark">·</span> <a href="https://canchadefutbol7.mx/malla-ciclonica-para-canchas-de-futbol/">Malla ciclónica y redes perimetrales</a></li>'),
    ('<li><span class="mark xmark">·</span> Alumbrado deportivo</li>',
     '<li><span class="mark xmark">·</span> <a href="https://canchadefutbol7.mx/alumbrado-para-canchas-de-futbol/">Alumbrado deportivo</a></li>'),
    ('<li><span class="mark xmark">·</span> Gradas, bancas y marcadores</li>',
     '<li><span class="mark xmark">·</span> <a href="https://gradasdefutbol.mx/">Gradas</a>, <a href="https://canchadefutbol7.mx/bancas-para-jugadores/">bancas</a> y marcadores</li>'),
    ('<li><span class="mark xmark">·</span> Mantenimiento o renovación de cancha existente</li>',
     '<li><span class="mark xmark">·</span> <a href="https://canchadefutbol7.mx/mantenimiento-de-canchas-de-pasto-sintetico/">Mantenimiento</a> o <a href="https://canchadefutbol7.mx/renovacion-de-canchas-de-pasto-sintetico/">renovación</a> de cancha existente</li>'),
]

changed = 0
for f in glob.glob("**/index.html", recursive=True):
    if "node_modules" in f: continue
    with open(f) as fp: h = fp.read()
    if "Porterías deportivas</li>" not in h and "Porterías deportivas</a>" not in h:
        continue
    new = h
    for old, repl in REPLACES:
        new = new.replace(old, repl)
    if new != h:
        with open(f,"w") as fp: fp.write(new)
        changed += 1
print(f"Modificados: {changed}")
