#!/usr/bin/env python3
"""Genera /pasto-sintetico-en-{slug-estado}/ pillar pages."""
import os, re, json

STATE_CITIES = json.load(open("/tmp/state-cities.json"))
TPL_HTML = open("pasto-sintetico-en-tampico/index.html").read()
TPL_LLMS = open("pasto-sintetico-en-tampico/llms.txt").read()

# Estados a crear: slug, label, region. Skip aquellos donde slug = ciudad capital
ESTADOS = [
    ("baja-california", "Baja California", "MX-BCN"),
    ("baja-california-sur", "Baja California Sur", "MX-BCS"),
    ("chiapas", "Chiapas", "MX-CHP"),
    ("coahuila", "Coahuila", "MX-COA"),
    ("estado-de-mexico", "Estado de México", "MX-MEX"),
    ("guerrero", "Guerrero", "MX-GRO"),
    ("hidalgo", "Hidalgo", "MX-HID"),
    ("jalisco", "Jalisco", "MX-JAL"),
    ("michoacan", "Michoacán", "MX-MIC"),
    ("morelos", "Morelos", "MX-MOR"),
    ("nayarit", "Nayarit", "MX-NAY"),
    ("nuevo-leon", "Nuevo León", "MX-NLE"),
    ("quintana-roo", "Quintana Roo", "MX-ROO"),
    ("sinaloa", "Sinaloa", "MX-SIN"),
    ("sonora", "Sonora", "MX-SON"),
    ("tabasco", "Tabasco", "MX-TAB"),
    ("tamaulipas", "Tamaulipas", "MX-TAM"),
    ("tlaxcala", "Tlaxcala", "MX-TLA"),
    ("yucatan", "Yucatán", "MX-YUC"),
]

def make_cities_grid(state_label):
    cities = STATE_CITIES.get(state_label, [])
    cities = sorted(cities, key=lambda x: x[1])
    if not cities: return ""
    cards = []
    for slug, city in cities:
        cards.append(f'<a class="city-link" href="/pasto-sintetico-en-{slug}/"><b>{city}</b><span>Pasto sintético en {city}</span></a>')
    grid = "\n          ".join(cards)
    return f"""
    <section class="reveal">
      <div class="wrap">
        <div class="section-head">
          <span class="num">Cobertura</span>
          <h2>Ciudades cubiertas en {state_label} con pasto sintético deportivo.</h2>
          <p class="section-sub">Sportmaster vende e instala pasto sintético para canchas de futbol en {len(cities)} ciudades de {state_label}. Elige tu ciudad para ver detalles, precio por m² y casos reales.</p>
        </div>
        <div class="cities-grid">
          {grid}
        </div>
      </div>
    </section>
"""

CITIES_CSS = """
  .cities-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;margin-top:8px}
  .city-link{display:block;padding:18px 20px;background:#fff;border:1px solid var(--line);border-radius:14px;text-decoration:none;color:var(--ink);transition:all .2s}
  .city-link:hover{border-color:var(--green-bright);transform:translateY(-2px);box-shadow:0 8px 24px rgba(19,157,69,.12)}
  .city-link b{display:block;font-size:17px;letter-spacing:-.01em;margin-bottom:4px;color:var(--ink)}
  .city-link span{display:block;color:var(--muted);font-size:13px;font-weight:600}"""

def gen_estado(slug, label, region):
    dst = f"pasto-sintetico-en-{slug}"
    if os.path.exists(f"{dst}/index.html"):
        return f"SKIP {slug}: exists"
    os.makedirs(dst, exist_ok=True)

    # Mapeo archivos Tamaulipas-specific → genéricos
    norms = {
        "pasto-sintetico-en-tampico.jpg": "construccion-cancha-futbol-tampico-pasto-sintetico.webp",
        "cancha-de-futbol-7-en-tampico.jpg": "pasto-sintetico-tampico-cancha-futbol-7.webp",
        "construccion-de-canchas-de-futbol-en-tampico.jpg": "pasto-sintetico-tampico-cancha-de-futbol.webp",
        "cancha-de-futbol-5-en-tampico.webp": "instalacion-pasto-sintetico-cancha-futbol-5.webp",
        "cancha-de-futbol-11-en-tampico.webp": "instalacion-pasto-sintetico-cancha-futbol-11.webp",
        "cancha-futbol-rapido-en-tampico.webp": "cancha-futbol-rapido-pasto-sintetico-instalado.webp",
        "pasto-sintetico-hibrido-en-tampico.webp": "pasto-sintetico-hibrido-para-canchas.webp",
        "pasto-sintetico-monofilamento-en-tampico.webp": "pasto-sintetico-monofilamento-para-canchas.webp",
        "cancha-de-futbol-para-escuelas-en-tampico.jpg": "obra-real-pasto-sintetico-cancha-futbol-04.jpg",
        "cancha-de-futbol-para-clubes-en-tampico.jpg": "obra-real-pasto-sintetico-cancha-futbol-05.jpg",
        "cancha-de-futbol-para-municipios-en-tampico.jpg": "obra-real-pasto-sintetico-cancha-futbol-06.jpg",
    }

    h = TPL_HTML
    # NO normalizar: tampico/assets ya tiene los archivos renombrados con sufijo -en-tampico
    # URLs propias del slug pillar
    h = h.replace("pasto-sintetico-en-tampico", f"pasto-sintetico-en-{slug}")
    # Geo
    h = re.sub(r'(geo\.region"\s+content=")[^"]+(")', rf'\1{region}\2', h)
    h = re.sub(r'(geo\.placename"\s+content=")[^"]+(")', rf'\1{label}, México\2', h)
    # State: Tamaulipas → label (state)
    h = h.replace("Tamaulipas", label)
    # Frases muy específicas
    h = h.replace("Tampico, Ciudad Madero, Altamira, Zona Centro, Lomas del Chairel y Universidad", f"todas las ciudades de {label}")
    h = h.replace(f"Tampico, Ciudad Madero, Altamira y toda la zona conurbada del sur de {label}", f"todas las ciudades principales de {label}")
    h = h.replace("Tampico, Ciudad Madero, Altamira y zona metropolitana", f"todas las ciudades principales de {label}")
    h = h.replace(f"zona conurbada del sur de {label}", f"todas las regiones de {label}")
    # H1 + label de la ciudad Tampico → estado label
    h = re.sub(r'\bTampico\b', label, h)
    # Cambiar el angle ciudad → estado en algunas frases:
    h = h.replace(f"en {label} y zona metropolitana", f"en todo el estado de {label}")
    h = h.replace(f"zona metropolitana de {label}", f"todo el estado de {label}")
    # Schema: City → State
    h = h.replace('{ "@type": "City", "name": "' + label + '" }', '{ "@type": "State", "name": "' + label + '" }')
    # Inyectar CSS de cities-grid antes de </style>
    h = h.replace("</style>", CITIES_CSS + "\n  </style>", 1)
    # Inyectar sección de ciudades cubiertas antes de "</main>"
    cities_section = make_cities_grid(label)
    h = h.replace("  </main>", cities_section + "  </main>")

    with open(f"{dst}/index.html","w") as f: f.write(h)

    # llms.txt
    l = TPL_LLMS
    l = l.replace("Tamaulipas", label)
    l = re.sub(r'\bTampico\b', label, l)
    l = l.replace("pasto-sintetico-en-tampico", f"pasto-sintetico-en-{slug}")
    cities = STATE_CITIES.get(label, [])
    if cities:
        city_list = "\n".join(f"- [{city}](https://canchadefutbol7.mx/pasto-sintetico-en-{cslug}/)" for cslug, city in sorted(cities, key=lambda x:x[1]))
        l += f"\n\n## Ciudades cubiertas en {label}\n\n{city_list}\n"
    with open(f"{dst}/llms.txt","w") as f: f.write(l)
    return f"OK {slug} → {label} [{region}] ({len(cities)} ciudades)"

if __name__ == "__main__":
    for slug, label, region in ESTADOS:
        print(gen_estado(slug, label, region))
