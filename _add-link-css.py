#!/usr/bin/env python3
import glob
OLD = "  .check-list li{display:flex;gap:10px;color:#4f5a54;font-weight:700}"
NEW = """  .check-list li{display:flex;gap:10px;color:#4f5a54;font-weight:700}
  .check-list a{color:#0a7a2e;text-decoration:underline;text-decoration-color:#76f0a2;text-underline-offset:3px;text-decoration-thickness:2px;transition:all .2s}
  .check-list a:hover{color:#139d45;text-decoration-color:#139d45;background:#dcfce7;padding:1px 4px;margin:-1px -4px;border-radius:4px}"""
changed = 0
for f in glob.glob("**/index.html", recursive=True):
    if "node_modules" in f: continue
    with open(f) as fp: h = fp.read()
    if OLD not in h or NEW in h: continue
    with open(f,"w") as fp: fp.write(h.replace(OLD, NEW))
    changed += 1
print(f"CSS inyectado en: {changed}")
