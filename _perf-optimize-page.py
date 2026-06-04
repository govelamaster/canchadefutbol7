#!/usr/bin/env python3
"""Optimiza una pagina programatica (misma receta validada en Puebla):
 1. Backup de assets (idempotente).
 2. Google Fonts bloqueante -> carga async (preload+onload+noscript).
 3. <img src="assets/..."> -> width/height reales + loading=lazy (salvo hero fetchpriority).
 4. Recompresion: resize ancho>1366 a 1366, re-encode q80, SOLO si queda mas chico (nunca inflar).
Uso: python3 _perf-optimize-page.py <dir-pagina>   (dir contiene index.html y assets/)
"""
import sys, re, os, io, glob, shutil
from PIL import Image

d = sys.argv[1].rstrip("/")
html_path = os.path.join(d, "index.html")
assets = os.path.join(d, "assets")
html = open(html_path, encoding="utf-8").read()
report = {"fonts": "skip", "imgs": 0, "img_before_kb": 0, "img_after_kb": 0}

# 1. backup
bdir = os.path.join(d, ".backup-assets-perf-20260529")
if not os.path.isdir(bdir):
    os.makedirs(bdir)
    for f in glob.glob(os.path.join(assets, "*")):
        if os.path.isfile(f):
            shutil.copy2(f, bdir)

# 2. fonts async
if "this.onload=null;this.rel='stylesheet'" not in html:
    m = re.search(r'<link\s+href="(https://fonts\.googleapis\.com/css[^"]+)"\s+rel="stylesheet"\s*>', html)
    if m:
        href = m.group(1)
        new = (f'<link rel="preload" as="style" href="{href}" onload="this.onload=null;this.rel=\'stylesheet\'">'
               f'\n<noscript><link href="{href}" rel="stylesheet"></noscript>')
        html = html[:m.start()] + new + html[m.end():]
        report["fonts"] = "async OK"
    else:
        report["fonts"] = "NO match (revisar)"
else:
    report["fonts"] = "ya async"

# 3. img attrs
def dims(src):
    fn = src.split("?")[0]
    fp = os.path.join(d, fn)
    if not os.path.exists(fp): return None
    with Image.open(fp) as im: return im.size

def repl(mm):
    tag = mm.group(0)
    sm = re.search(r'src="([^"]+)"', tag)
    if not sm or not sm.group(1).startswith("assets/"): return tag
    if re.search(r'\bwidth=', tag) or re.search(r'\bheight=', tag): return tag
    dd = dims(sm.group(1))
    if not dd: return tag
    add = f' width="{dd[0]}" height="{dd[1]}"'
    if "fetchpriority" not in tag and "loading=" not in tag:
        add += ' loading="lazy"'
    report["imgs"] += 1
    return tag[:-1] + add + ">"

html = re.sub(r'<img\b[^>]*>', repl, html, flags=re.IGNORECASE)
open(html_path, "w", encoding="utf-8").write(html)

# 4. recompress (resize>1366, keep-smaller)
CAP = 1366
for f in glob.glob(os.path.join(assets, "*.jpg")) + glob.glob(os.path.join(assets, "*.webp")):
    before = os.path.getsize(f); report["img_before_kb"] += before // 1024
    im = Image.open(f); w, h = im.size
    if w > CAP:
        im = im.resize((CAP, round(h * CAP / w)), Image.LANCZOS)
    ext = f.lower().rsplit(".", 1)[1]
    buf = io.BytesIO()
    if ext == "jpg":
        im.convert("RGB").save(buf, "JPEG", quality=80, optimize=True, progressive=True)
    else:
        im.save(buf, "WEBP", quality=80, method=6)
    if buf.tell() < before:
        open(f, "wb").write(buf.getvalue()); report["img_after_kb"] += buf.tell() // 1024
    else:
        report["img_after_kb"] += before // 1024

print(f"{os.path.basename(d):50s} fonts={report['fonts']:14s} imgs+attrs={report['imgs']:2d}  "
      f"assets {report['img_before_kb']}KB->{report['img_after_kb']}KB")
