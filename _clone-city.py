#!/usr/bin/env python3
"""Clona la programatica de queretaro a una ciudad nueva (parte determinista).
- Copia index.html + llms.txt + assets (sin backups).
- Reemplaza 'Querétaro'->display y 'queretaro'->slug en index.html y llms.txt.
- Renombra las 6 imagenes que llevan el slug de ciudad.
NO toca las zonas locales (El Marqués/Corregidora/Juriquilla) -> eso lo hace el agente.
Uso: python3 _clone-city.py "<Display Name>" <slug>
"""
import sys, os, shutil, glob, re

display = sys.argv[1]
slug = sys.argv[2]
SRC = "construccion-de-canchas-de-futbol-en-queretaro"
DST = f"construccion-de-canchas-de-futbol-en-{slug}"

if os.path.exists(DST):
    print(f"ERROR: {DST} ya existe, abortando"); sys.exit(1)

os.makedirs(os.path.join(DST, "assets"))
# copiar assets (excepto carpeta backup)
for f in glob.glob(os.path.join(SRC, "assets", "*")):
    if os.path.isfile(f):
        shutil.copy2(f, os.path.join(DST, "assets", os.path.basename(f)))
# renombrar las imagenes city-named: queretaro -> slug
for f in glob.glob(os.path.join(DST, "assets", "*queretaro*")):
    new = f.replace("queretaro", slug)
    os.rename(f, new)

# index.html + llms.txt: swap nombre y slug
for fn in ["index.html", "llms.txt"]:
    src_fp = os.path.join(SRC, fn)
    if not os.path.exists(src_fp):
        continue
    txt = open(src_fp, encoding="utf-8").read()
    txt = txt.replace("Querétaro", display).replace("queretaro", slug)
    open(os.path.join(DST, fn), "w", encoding="utf-8").write(txt)

# reporte
idx = open(os.path.join(DST, "index.html"), encoding="utf-8").read()
leftover = len(re.findall(r"[Qq]uer[ée]taro", idx))
imgs_ok = all(
    os.path.exists(os.path.join(DST, m.split("?")[0]))
    for m in re.findall(r'<img[^>]*src="(assets/[^"]+)"', idx)
)
print(f"{DST}  | leftover_queretaro={leftover}  imgs_ok={imgs_ok}  "
      f"zonas_pendientes={len(re.findall(r'El Marqués|Corregidora|Juriquilla', idx))}")
