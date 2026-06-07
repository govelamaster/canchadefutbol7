#!/usr/bin/env python3
"""Regex secundario para variantes con nombre de estado/ciudad."""
import re, glob

# Solo aplica a las landings nuevas pasto-sintetico, no toca escuelas/blog
PATHS = [
    "pasto-sintetico-en-*/index.html",
    "pasto-sintetico-en-*/llms.txt",
    "construccion-de-canchas-de-futbol-en-*/index.html",
    "venta-pasto-sintetico/index.html",
    "pasto-sintetico-azul/index.html",
    "pasto-sintetico-en-tampico/index.html",
]

# Reemplazos regex con captura para conservar nombre estado/ciudad
RGX = [
    # "logo de Y pintado" / "logo Y pintado" → insertado
    (re.compile(r'(logo\s+(?:del?\s+(?:Gobierno\s+(?:del\s+|de\s+)?(?:Estado\s+)?(?:de\s+)?)?|de\s+)?[A-ZÁÉÍÓÚÑa-záéíóúñ][\wÁÉÍÓÚÑáéíóúñ ]{1,40}?)\s+pintad([oa])'), r'\1 insertad\2'),
    # "logo X pintado en el césped" → insertado
    (re.compile(r'pintad([oa])\s+en\s+el\s+césped'), r'insertad\1 en el césped'),
    # "pintado, construida" → insertado
    (re.compile(r'pintad([oa])(\s*,\s*construida)'), r'insertad\1\2'),
    # "logos del Gobierno del Estado pintado" → insertados
    (re.compile(r'(logos?\s+del\s+Gobierno\s+del\s+Estado)\s+pintad([oa]s?)'), r'\1 insertad\2'),
    # "Cancha entregada en X con logo del estado pintado" → insertado
    (re.compile(r'(Cancha\s+entregada\s+en\s+[\wÁÉÍÓÚÑáéíóúñ ]+\s+con\s+logo\s+del\s+estado)\s+pintado'), r'\1 insertado'),
    # "escudos pintados" → insertados
    (re.compile(r'\bescudos?\s+pintad([oa]s?)'), r'escudo insertad\1') ,
]

changed_files = 0
for pattern in PATHS:
    for f in glob.glob(pattern):
        with open(f) as fp: h = fp.read()
        new = h
        for rgx, rep in RGX:
            new = rgx.sub(rep, new)
        if new != h:
            with open(f,"w") as fp: fp.write(new)
            changed_files += 1
print(f"Files patched: {changed_files}")
