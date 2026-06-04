#!/usr/bin/env python3
"""Agrega indicador de acordeon (+/x) a la FAQ. Idempotente.
Uso: python3 _faq-fix.py <dir1> <dir2> ...
"""
import sys, os

OLD = ("  summary{cursor:pointer;font-weight:900;letter-spacing:-.01em;list-style:none}\n"
       "  summary::-webkit-details-marker{display:none}\n"
       "  details p{margin-top:12px;color:#5b6761;font-weight:650}")
NEW = ("  summary{cursor:pointer;font-weight:900;letter-spacing:-.01em;list-style:none;"
       "display:flex;justify-content:space-between;align-items:flex-start;gap:16px}\n"
       "  summary::-webkit-details-marker{display:none}\n"
       '  summary::after{content:"+";color:var(--green);font-size:1.55em;line-height:.85;'
       "flex-shrink:0;transition:transform .25s ease}\n"
       "  details[open] summary::after{transform:rotate(45deg)}\n"
       "  details p{margin-top:12px;color:#5b6761;font-weight:650}")

for d in sys.argv[1:]:
    fp = os.path.join(d, "index.html")
    if not os.path.exists(fp):
        print(f"{d}: SIN index.html"); continue
    txt = open(fp, encoding="utf-8").read()
    if "summary::after" in txt:
        print(f"{d}: ya tiene el fix (skip)"); continue
    if OLD not in txt:
        print(f"{d}: NO match del CSS esperado (revisar)"); continue
    open(fp, "w", encoding="utf-8").write(txt.replace(OLD, NEW))
    print(f"{d}: fix aplicado OK")
