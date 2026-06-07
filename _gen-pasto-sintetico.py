#!/usr/bin/env python3
"""Generador masivo /pasto-sintetico-en-{ciudad}/
Uso: python3 _gen-pasto-sintetico.py [slug1 slug2 ...]
Sin args → genera TODAS las ciudades existentes (skip si ya existe destino)."""
import re, os, sys, json

TPL_DIR = "pasto-sintetico-en-tampico"
TPL_HTML = open(f"{TPL_DIR}/index.html").read()
TPL_LLMS = open(f"{TPL_DIR}/llms.txt").read()

def extract_geo(slug):
    p = f"construccion-de-canchas-de-futbol-en-{slug}/index.html"
    if not os.path.exists(p): return None
    h = open(p).read(4000)
    region = re.search(r'geo\.region"\s+content="([^"]+)"', h)
    placename = re.search(r'geo\.placename"\s+content="([^"]+)"', h)
    pn = placename.group(1) if placename else slug.replace("-"," ").title()
    label = pn.split(',')[0].strip()
    state = pn.split(',')[-1].strip() if ',' in pn else 'México'
    return {
        "region": region.group(1) if region else "MX",
        "placename": pn,
        "label": label,
        "state": state,
    }

def gen_city(slug):
    geo = extract_geo(slug)
    if not geo:
        return f"SKIP {slug}: no construccion source"
    label, state, region, placename = geo["label"], geo["state"], geo["region"], geo["placename"]
    dst = f"pasto-sintetico-en-{slug}"
    if os.path.exists(f"{dst}/index.html"):
        return f"SKIP {slug}: already exists"
    os.makedirs(dst, exist_ok=True)

    h = TPL_HTML
    # URLs & paths slug (lowercase) — antes que labels
    h = h.replace("pasto-sintetico-en-tampico", f"pasto-sintetico-en-{slug}")
    h = h.replace("/construccion-de-canchas-de-futbol-en-tampico/", f"/construccion-de-canchas-de-futbol-en-{slug}/")
    # geo
    h = re.sub(r'(geo\.region"\s+content=")[^"]+(")', rf'\1{region}\2', h)
    h = re.sub(r'(geo\.placename"\s+content=")[^"]+(")', rf'\1{placename}\2', h)
    # State-specific copy: cambiar "Tamaulipas" → state real
    h = h.replace("Tamaulipas", state)
    # Frases muy específicas de Tampico
    h = h.replace("Tampico, Ciudad Madero, Altamira, Zona Centro, Lomas del Chairel y Universidad", f"{label} y zona metropolitana")
    h = h.replace("Tampico, Ciudad Madero, Altamira y toda la zona conurbada del sur de Tamaulipas", f"{label} y zona metropolitana de {state}")
    h = h.replace("Tampico, Ciudad Madero, Altamira y zona metropolitana", f"{label} y zona metropolitana")
    h = h.replace("zona conurbada del sur de Tamaulipas", f"zona metropolitana de {state}")
    # Label de la ciudad (palabra completa Tampico)
    h = re.sub(r'\bTampico\b', label, h)
    # Title fallback (por si Title aún contiene "Tampico" mayúscula no atrapado)
    # Description meta: ya cambiado por replaces arriba

    with open(f"{dst}/index.html","w") as f: f.write(h)

    # llms.txt
    l = TPL_LLMS
    l = l.replace("Tampico, Ciudad Madero, Altamira y toda la zona conurbada del sur de Tamaulipas", f"{label} y zona metropolitana de {state}")
    l = l.replace("Tampico, Ciudad Madero, Altamira, Zona Centro, Lomas del Chairel y Universidad", f"{label} y zona metropolitana")
    l = l.replace("Tamaulipas", state)
    l = l.replace("pasto-sintetico-en-tampico", f"pasto-sintetico-en-{slug}")
    l = l.replace("construccion-de-canchas-de-futbol-en-tampico", f"construccion-de-canchas-de-futbol-en-{slug}")
    l = re.sub(r'\bTampico\b', label, l)
    with open(f"{dst}/llms.txt","w") as f: f.write(l)

    return f"OK {slug} → {label}, {state} [{region}]"

if __name__ == "__main__":
    if len(sys.argv) > 1:
        targets = sys.argv[1:]
    else:
        targets = [d.replace("construccion-de-canchas-de-futbol-en-","").rstrip("/")
                   for d in os.listdir(".") if d.startswith("construccion-de-canchas-de-futbol-en-")]
        targets = [t for t in targets if t and t != "tampico"]
    for t in targets:
        print(gen_city(t))
    print(f"\nTotal procesadas: {len(targets)}")
