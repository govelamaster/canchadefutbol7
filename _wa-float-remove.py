#!/usr/bin/env python3
"""Quita el boton flotante de WhatsApp (.wa-float) de paginas de ciudad. Idempotente.
Quita: el elemento <a class="wa-float">, la const JS y la linea toggle del scroll.
Deja intacto: sticky CTA, trust floats del hero (.float f1/f2/f3), CSS muerto inofensivo.
Uso: python3 _wa-float-remove.py <dir1> <dir2> ...
"""
import sys, os, re

for d in sys.argv[1:]:
    fp = os.path.join(d, "index.html")
    if not os.path.exists(fp):
        print(f"{d}: SIN index.html"); continue
    txt = open(fp, encoding="utf-8").read()
    if 'class="wa-float"' not in txt and "whatsappFloat" not in txt:
        print(f"{d}: ya quitado (skip)"); continue
    n = 0
    # 1. elemento <a class="wa-float" ...>W</a>
    txt, c = re.subn(r'[ \t]*<a class="wa-float"[^>]*>.*?</a>\n?', "", txt); n += c
    # 2. const whatsappFloat = ...
    txt, c = re.subn(r"[ \t]*const whatsappFloat = document\.querySelector\('\.wa-float'\);\n", "", txt); n += c
    # 3. whatsappFloat.classList.toggle(...)
    txt, c = re.subn(r"[ \t]*whatsappFloat\.classList\.toggle\([^\n]*\);\n", "", txt); n += c
    open(fp, "w", encoding="utf-8").write(txt)
    left = txt.count("wa-float") + txt.count("whatsappFloat")
    print(f"{d}: quitado ({n} piezas) | residuo wa-float={left}")
