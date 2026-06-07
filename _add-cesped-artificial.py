#!/usr/bin/env python3
"""Inyecta 'césped artificial' como sinónimo SEO en landings existentes."""
import re, glob

PATHS = [
    "pasto-sintetico-en-*/index.html",
    "construccion-de-canchas-de-futbol-en-*/index.html",
    "venta-pasto-sintetico/index.html",
    "pasto-sintetico-azul/index.html",
]

# 1) Hero subtitle: agregar "También conocido como césped artificial deportivo." al final del <p class="hero-sub">
RGX_HERO = re.compile(r'(<p class="hero-sub">[^<]*(?:<[^p][^>]*>[^<]*</[^>]+>[^<]*)*?)(\.</p>)')
HERO_ADD = r'\1. También conocido como <strong>césped artificial deportivo</strong>\2'

# 2) Marquee: agregar entries de césped artificial y pasto artificial (idempotente: solo si no existe)
MARQUEE_PATTERN = re.compile(r'(<div class="marquee">\s*(?:<span>[^<]+</span>\s*)+)')
NEW_SPANS = '<span>Césped artificial</span><span>Pasto artificial</span>'

# 3) Meta description: agregar "(césped artificial)" después del primer "pasto sintético" 
META_RGX = re.compile(r'(<meta name="description" content="[^"]*?pasto sintético)( [^"]*">)', re.IGNORECASE)
META_ADD = r'\1 (también césped artificial)\2'

changed = 0
for pattern in PATHS:
    for f in glob.glob(pattern):
        h = open(f).read()
        new = h
        modified = False

        # Meta description
        if "(también césped artificial)" not in new and "(césped artificial)" not in new:
            tmp = META_RGX.sub(META_ADD, new, count=1)
            if tmp != new:
                new = tmp; modified = True

        # Hero subtitle
        if "césped artificial deportivo" not in new:
            tmp = RGX_HERO.sub(HERO_ADD, new, count=1)
            if tmp != new:
                new = tmp; modified = True

        # Marquee — agregar entries solo una vez
        if "Césped artificial</span>" not in new:
            def inj(m):
                return m.group(1) + NEW_SPANS
            tmp = MARQUEE_PATTERN.sub(inj, new, count=2)  # marquee duplica el contenido, modificar ambos
            if tmp != new:
                new = tmp; modified = True

        if modified:
            open(f,"w").write(new)
            changed += 1
print(f"Files updated: {changed}")
