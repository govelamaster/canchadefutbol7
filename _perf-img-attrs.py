#!/usr/bin/env python3
"""Inyecta width/height reales + loading=lazy en <img src="assets/..."> de un index.html.
- Salta el hero (fetchpriority="high") para no romper LCP.
- No toca imgs que ya tengan width o height (logos).
- Lee dimensiones reales del archivo en disco (ignora ?v=...).
Uso: python3 _perf-img-attrs.py <ruta-index.html> [--write]
"""
import sys, re, os
from PIL import Image

path = sys.argv[1]
write = "--write" in sys.argv
base = os.path.dirname(path)
html = open(path, encoding="utf-8").read()

img_re = re.compile(r'<img\b[^>]*>', re.IGNORECASE)

def dims(src):
    fn = src.split("?")[0]
    fp = os.path.join(base, fn)
    if not os.path.exists(fp):
        return None
    with Image.open(fp) as im:
        return im.size

changed = 0
def repl(m):
    global changed
    tag = m.group(0)
    srcm = re.search(r'src="([^"]+)"', tag)
    if not srcm or not srcm.group(1).startswith("assets/"):
        return tag
    if re.search(r'\bwidth=', tag) or re.search(r'\bheight=', tag):
        return tag  # ya tiene (logos)
    d = dims(srcm.group(1))
    if not d:
        return tag
    w, h = d
    new = tag
    # width/height antes del cierre >
    add = f' width="{w}" height="{h}"'
    # loading=lazy salvo hero
    if "fetchpriority" not in tag and 'loading=' not in tag:
        add += ' loading="lazy"'
    new = tag[:-1] + add + ">"
    changed += 1
    if not write:
        print("ANTES:", tag)
        print("DESP :", new)
        print()
    return new

out = img_re.sub(repl, html)
print(f"imgs modificadas: {changed}")
if write:
    open(path, "w", encoding="utf-8").write(out)
    print("ESCRITO")
