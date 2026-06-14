#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Inyecta el bloque diferenciado en la pagina real de cada ciudad.
- Seccion nueva (estilo nativo) despues del hero/strip, ANTES del primer reveal.
- Meta description unica.
- 3 FAQ visibles (<details>) + 3 FAQ en el JSON-LD FAQPage.
Respalda el original, es idempotente (no re-inyecta), y valida balance de tags.
Uso: python3 _motor-seo/inyector.py guadalajara        (una)
     python3 _motor-seo/inyector.py --all               (las 10 del lote)
"""
import json, re, os, sys, shutil
from importlib.machinery import SourceFileLoader

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)
motor = SourceFileLoader("motor", "_motor-seo/motor.py").load_module()
CONT  = json.load(open("_motor-seo/contenido_lote1.json", encoding="utf-8"))
CIUD  = motor.CIUD
BACKUP = "_motor-seo/_backups_lote1"
MARK = 'data-motor-seo="1"'

def page(slug): return f"construccion-de-canchas-de-futbol-en-{slug}/index.html"

def vecinas_html(slug):
    est = CIUD[slug]["estado"]
    vs = motor.vecinas(slug, est, 3)
    if not vs: return ""
    links = [f'<a href="/construccion-de-canchas-de-futbol-en-{v}/">{CIUD[v]["label"]}</a>' for v in vs]
    lista = ", ".join(links[:-1]) + (" y " + links[-1] if len(links) > 1 else links[0])
    frase = motor.pick(slug, "vecinas", 10).replace("{lista}", lista).replace("{ciudad}", CIUD[slug]["label"])
    return frase

def build_section(slug):
    c = CONT[slug]; label = CIUD[slug]["label"]
    cards = "\n".join(
        f'          <article class="card"><div class="card-body"><h3>{s["h3"]}</h3><p>{s["texto"]}</p></div></article>'
        for s in c["secciones"])
    vh = vecinas_html(slug)
    vec = f'\n        <p class="section-sub" style="margin-top:1.5rem">{vh}</p>' if vh else ""
    return (f'    <section class="reveal" {MARK}>\n'
            f'      <div class="wrap">\n'
            f'        <div class="section-head">\n'
            f'          <span class="num">Pasto sintético en {label}</span>\n'
            f'          <h2>{c["h2"]}</h2>\n'
            f'        </div>\n'
            f'        <div class="cards">\n{cards}\n        </div>{vec}\n'
            f'      </div>\n'
            f'    </section>\n')

def faq_details(slug):
    return "\n".join(f'          <details><summary>{f["q"]}</summary><p>{f["a"]}</p></details>'
                     for f in CONT[slug]["faq"])

def faq_schema(slug):
    out = []
    for f in CONT[slug]["faq"]:
        q = json.dumps(f["q"], ensure_ascii=False)
        a = json.dumps(f["a"], ensure_ascii=False)
        out.append('        {\n          "@type": "Question",\n'
                   f'          "name": {q},\n'
                   '          "acceptedAnswer": {\n'
                   f'            "@type": "Answer",\n            "text": {a}\n'
                   '          }\n        }')
    return ",\n".join(out) + ",\n"

def check_balance(html):
    for tag in ("section", "details", "div", "article"):
        o = len(re.findall(rf'<{tag}[ >]', html)); c = html.count(f'</{tag}>')
        if o != c: return f"DESBALANCE <{tag}>: {o} abren / {c} cierran"
    return None

def inject(slug):
    p = page(slug)
    if not os.path.exists(p): return f"[!] no existe {p}"
    html = open(p, encoding="utf-8").read()
    if MARK in html: return f"[=] {slug}: ya inyectado, omito"

    os.makedirs(BACKUP, exist_ok=True)
    shutil.copy2(p, f"{BACKUP}/{slug}.orig.html")

    n = 0
    # 1) Seccion de contenido antes del primer reveal
    sec = build_section(slug)
    new = html.replace('    <section class="reveal">', sec + '\n    <section class="reveal">', 1)
    if new != html: n += 1; html = new

    # 2) Meta description unica
    new = re.sub(r'(<meta name="description" content=")[^"]*(">)',
                 lambda m: m.group(1) + CONT[slug]["meta"] + m.group(2), html, count=1)
    if new != html: n += 1; html = new

    # 3) FAQ visibles
    new = html.replace('<div class="faq-grid">',
                       '<div class="faq-grid">\n' + faq_details(slug), 1)
    if new != html: n += 1; html = new

    # 4) FAQ en JSON-LD
    new = html.replace('"mainEntity": [\n', '"mainEntity": [\n' + faq_schema(slug), 1)
    if new != html: n += 1; html = new

    bal = check_balance(html)
    if bal:
        return f"[X] {slug}: {bal} — NO se escribio (restaurado)"
    open(p, "w", encoding="utf-8").write(html)
    return f"[OK] {slug}: {n}/4 inyecciones aplicadas"

if __name__ == "__main__":
    args = sys.argv[1:]
    slugs = list(CONT.keys()) if args == ["--all"] else args
    for s in slugs:
        print(inject(s))
