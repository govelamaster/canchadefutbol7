#!/usr/bin/env python3
"""Escanea las paginas reales de ciudad y arma dataset: slug -> (label, estado).
Agrupa por estado para vecinas. NO inventa nada: todo sale de geo.placename."""
import os, re, json, glob

data = {}          # slug -> {"label":, "estado":}
by_state = {}      # estado -> [slug,...]

for path in sorted(glob.glob("construccion-de-canchas-de-futbol-en-*/index.html")):
    slug_dir = path.split("/")[0]
    slug = slug_dir.replace("construccion-de-canchas-de-futbol-en-", "")
    try:
        head = open(path, encoding="utf-8").read(6000)
    except Exception:
        continue
    m = re.search(r'geo\.placename"\s+content="([^"]+)"', head)
    if not m:
        continue
    placename = m.group(1).strip()
    if "," in placename:
        label, estado = [x.strip() for x in placename.split(",", 1)]
    else:
        label, estado = placename, "MX"
    data[slug] = {"label": label, "estado": estado}
    by_state.setdefault(estado, []).append(slug)

json.dump(data, open("_motor-seo/ciudades.json","w",encoding="utf-8"), ensure_ascii=False, indent=1)
json.dump(by_state, open("_motor-seo/por_estado.json","w",encoding="utf-8"), ensure_ascii=False, indent=1)

print(f"Ciudades totales: {len(data)}")
print(f"Estados: {len(by_state)}")
print("\nCiudades por estado:")
for est, slugs in sorted(by_state.items(), key=lambda x:-len(x[1])):
    print(f"  {est:28s} {len(slugs)}")
