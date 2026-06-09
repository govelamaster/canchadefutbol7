#!/usr/bin/env python3
"""
inject-ads-sections.py v2 — secciones premium 100% self-contained.

Genera 4 secciones (Canchas instaladas + Nuestras canchas + Tipos de pasto + Estadio F7)
con HTML+CSS inline (cero dependencia CSS global del home, cero colisión).
Look inspirado en home, adaptado por grupo de ads.

Uso:
  python3 scripts/inject-ads-sections.py --landing cotizar-pasto-sintetico-precio-m2 --group A
  python3 scripts/inject-ads-sections.py --landing pasto-sintetico-fabricante --group B
"""
import argparse, re, shutil, sys, time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MARKER = "<!-- ADS-SECTIONS-INJECTED-V2 -->"

COPY = {
    "A": {
        "instaladas_eyebrow": "PROYECTOS REALES",
        "instaladas_h2": 'Canchas instaladas con su <span style="color:#0a7a2e">precio por m²</span>',
        "instaladas_sub": "El precio del pasto sintético por m² depende del deporte y la especificación. Mira proyectos reales y cotiza el tuyo.",
        "canchas_eyebrow": "02 — PRECIO POR DEPORTE",
        "canchas_h2": "Precio del pasto sintético por m² según el deporte",
        "canchas_sub": "El precio del pasto sintético por m² cambia con fibra, altura, densidad y rellenos que pide cada deporte.",
        "card_suffix": "Precio por m² instalado",
        "pasto_eyebrow": "03 — PRECIO POR TIPO DE PASTO",
        "pasto_h2": 'Pasto sintético. <span style="color:#0a7a2e">Precio según el tipo de fibra.</span>',
        "pasto_sub": "Cada tipo de pasto sintético tiene un precio por m² distinto. Cotizamos por tipo, altura, densidad y rellenos.",
        "estadio_eyebrow": "04 — CANCHA COMPLETA",
        "estadio_h2": 'Cancha completa. <span style="color:#7ee2a8">Precio claro por m² y por proyecto.</span>',
        "estadio_sub": "Más allá del pasto: gradas, alumbrado, mallas, porterías y marcadores. Te damos el precio del pasto por m² y la cotización del complejo.",
    },
    "B": {
        "instaladas_eyebrow": "PROYECTOS DEL FABRICANTE",
        "instaladas_h2": 'Canchas <span style="color:#0a7a2e">directo del fabricante</span>',
        "instaladas_sub": "Somos fabricante y distribuidor de pasto sintético deportivo. Proyectos reales en México sin intermediarios.",
        "canchas_eyebrow": "02 — PRODUCTOS DEL FABRICANTE",
        "canchas_h2": "Pasto sintético del fabricante para cada deporte",
        "canchas_sub": "Como fabricante y distribuidor profesional, suministramos pasto sintético deportivo para cada tipo de cancha.",
        "card_suffix": "Fabricante directo · Sin intermediarios",
        "pasto_eyebrow": "03 — LÍNEA DEL FABRICANTE",
        "pasto_h2": 'Pasto sintético. <span style="color:#0a7a2e">Línea completa del fabricante.</span>',
        "pasto_sub": "Tres líneas de pasto sintético deportivo del fabricante directo: monofilamento, fibrilado e híbrido.",
        "estadio_eyebrow": "04 — LLAVE EN MANO",
        "estadio_h2": 'Cancha llave en mano. <span style="color:#7ee2a8">Fabricante directo en México.</span>',
        "estadio_sub": "Como fabricante y distribuidor entregamos pasto + accesorios + instalación. Cancha lista para jugar.",
    },
    "C": {
        "instaladas_eyebrow": "CANCHAS INSTALADAS",
        "instaladas_h2": 'Pasto sintético para <span style="color:#0a7a2e">cancha de fútbol</span> — proyectos reales',
        "instaladas_sub": "Más de 3,500 canchas de fútbol con pasto sintético instaladas en México.",
        "canchas_eyebrow": "02 — POR DEPORTE",
        "canchas_h2": "Pasto sintético para cancha de fútbol y otros deportes",
        "canchas_sub": "Pasto sintético para cancha de fútbol 5, fútbol 7, fútbol rápido, soccer y más.",
        "card_suffix": "Pasto sintético deportivo",
        "pasto_eyebrow": "03 — TIPOS PARA CANCHA",
        "pasto_h2": 'Pasto sintético para cancha de fútbol. <span style="color:#0a7a2e">Alta resistencia.</span>',
        "pasto_sub": "Tres tipos de pasto sintético deportivo para canchas de fútbol según uso e intensidad.",
        "estadio_eyebrow": "04 — CANCHA COMPLETA",
        "estadio_h2": 'Cancha de fútbol completa. <span style="color:#7ee2a8">Pasto sintético profesional.</span>',
        "estadio_sub": "Pasto sintético deportivo + gradas + alumbrado + mallas + porterías para canchas de fútbol.",
    },
    "D": {
        "instaladas_eyebrow": "CANCHAS DE FÚTBOL 7",
        "instaladas_h2": 'Canchas de <span style="color:#0a7a2e">fútbol 7</span> instaladas',
        "instaladas_sub": "Construimos canchas de fútbol 7 con pasto sintético en todo México. Medidas oficiales y entrega llave en mano.",
        "canchas_eyebrow": "02 — CANCHAS DE FÚTBOL 7 Y MÁS",
        "canchas_h2": "Cancha de fútbol 7 y otras canchas deportivas",
        "canchas_sub": "Cancha de fútbol 7 con pasto sintético: medidas oficiales, alta resistencia, instalación llave en mano. También fútbol 5, 11 y rápido.",
        "card_suffix": "Cancha lista para jugar",
        "pasto_eyebrow": "03 — PASTO PARA CANCHA FÚTBOL 7",
        "pasto_h2": 'Pasto sintético para cancha de <span style="color:#0a7a2e">fútbol 7</span>',
        "pasto_sub": "El pasto sintético para cancha de fútbol 7 ideal: monofilamento 40-45mm con rellenos de arena sílica y caucho.",
        "estadio_eyebrow": "04 — ESTADIO FÚTBOL 7",
        "estadio_h2": 'Crea tu estadio de <span style="color:#7ee2a8">fútbol 7. Para jugar en serio.</span>',
        "estadio_sub": "Cancha de fútbol 7 completa: gradas, alumbrado, mallas, porterías y marcadores. Cuanto cuesta hacer una cancha de fútbol 7 llave en mano.",
    },
    "E": {
        "instaladas_eyebrow": "CONSTRUCCIONES REALES",
        "instaladas_h2": 'Construcción de canchas deportivas <span style="color:#0a7a2e">llave en mano</span>',
        "instaladas_sub": "Proyectos de construcción de canchas deportivas: futbol, padel, beisbol, americano.",
        "canchas_eyebrow": "02 — POR DEPORTE",
        "canchas_h2": "Construcción de canchas deportivas en México",
        "canchas_sub": "Construimos canchas deportivas con pasto sintético: futbol 5, 7, 11, soccer, padel, beisbol, tochito y americano.",
        "card_suffix": "Construcción llave en mano",
        "pasto_eyebrow": "03 — PASTO PARA CONSTRUCCIÓN",
        "pasto_h2": 'Pasto sintético deportivo. <span style="color:#0a7a2e">Para construcción profesional.</span>',
        "pasto_sub": "Elegimos el sistema ideal de pasto sintético para la construcción de tu cancha según deporte e intensidad.",
        "estadio_eyebrow": "04 — CANCHA COMPLETA",
        "estadio_h2": 'Construcción completa. <span style="color:#7ee2a8">Llave en mano en México.</span>',
        "estadio_sub": "Construcción de canchas deportivas con pasto sintético + complejo: gradas, alumbrado, mallas, porterías y marcadores.",
    },
}

PROYECTOS = [
    ("/assets/proyectos/proyecto-01.jpg", "Cancha de futbol con pasto sintético instalada", "Más solicitado"),
    ("/assets/proyectos/proyecto-02.jpg", "Construcción de cancha deportiva con pasto sintético profesional", "Profesional"),
    ("/assets/proyectos/proyecto-03.jpg", "Instalación de pasto sintético para cancha de futbol 7", "Fútbol 7"),
    ("/assets/proyectos/proyecto-04.jpg", "Cancha de pasto sintético instalada — proyecto Sportmaster", "Comercial"),
    ("/assets/proyectos/proyecto-05.jpg", "Construcción llave en mano de cancha con pasto sintético", "Llave en mano"),
    ("/assets/proyectos/proyecto-06.jpg", "Proyecto de pasto sintético deportivo en México", "Premium"),
]

CANCHAS_DEPORTES = [
    ("Cancha de Futbol 7", "Pasto 40-45mm · Medidas oficiales", "Más solicitado", "/assets/cancha-futbol-7-monterrey-hero.webp"),
    ("Cancha de Soccer / Futbol 11", "Pasto 45-55mm · Estándar profesional", "Profesional", "/assets/cancha-soccer-futbol-11-monterrey.webp"),
    ("Cancha de Futbol 5 / Rápido", "Pasto 30-35mm · Alta intensidad", "Comercial", "/assets/cancha-futbol-5-monterrey.webp"),
    ("Cancha de Padel", "Pasto 12mm · Acabado uniforme", "Rentable", "/assets/cancha-padel-monterrey.webp"),
    ("Beisbol", "Pasto 30-40mm · Diamante completo", "Premium", "/assets/campo-beisbol-monterrey.webp"),
    ("Tochito / Flag / Americano", "Pasto 45-55mm · Líneas oficiales", "Escolar", "/assets/cancha-tochito-flag-football-monterrey.webp"),
]

TIPOS_PASTO = [
    {
        "name": "Pasto Sintético MONOFILAMENTO",
        "tag": "Óptimo para fútbol 7 y 11",
        "desc": "Pasto sintético de fibra única recta de alto rendimiento. Ideal para construcción de canchas de fútbol 7, 11 y soccer.",
        "bullets": ["Excelente resistencia", "Protección UV 9 años", "Alta durabilidad y recuperación"],
        "img": "/assets/monofilamento.webp",
    },
    {
        "name": "Pasto Sintético FIBRILADO",
        "tag": "Óptimo para fútbol 5 y renta",
        "desc": "Pasto sintético de fibra cortada en tiras que se entrelazan. Mayor durabilidad y resistencia al uso intensivo. Ideal para canchas de fútbol 5, comerciales y fútbol rápido.",
        "bullets": ["Máxima resistencia al desgaste", "Mejor tracción y estabilidad", "Bajo mantenimiento y más rentabilidad"],
        "img": "/assets/fibrilado.webp",
    },
    {
        "name": "Pasto Sintético HÍBRIDO",
        "tag": "Óptimo para uso intensivo",
        "desc": "Pasto sintético que combina monofilamento y fibrilado. Lo mejor de ambos mundos: rendimiento profesional y durabilidad superior. Recomendado para canchas con uso intensivo escolar y municipal.",
        "bullets": ["Rendimiento profesional", "Larga vida útil comprobada", "Excelente desempeño en todo clima"],
        "img": "/assets/hibrido.webp",
    },
]

ESTADIO_CARDS = [
    ("01", "Gradas", "Gradas metálicas con techo curvo de policarbonato translúcido. Capacidad 25-200 espectadores."),
    ("02", "Bancas de jugadores", "Bancas con respaldo techado para banca local, visitante y árbitros. Estructura metálica anticorrosiva."),
    ("03", "Porterías oficiales", "Porterías de aluminio reforzado para fútbol 5, 7 y soccer. Medidas oficiales, red de polietileno alta resistencia."),
    ("04", "Malla ciclónica", "Malla ciclónica perimetral hasta 8 metros de altura. Postes galvanizados, calibre comercial o industrial."),
    ("05", "Alumbrado LED deportivo", "Reflectores LED 200W-400W alta eficiencia para iluminación uniforme. Postes 8-12m galvanizados."),
    ("06", "Marcadores digitales", "Marcadores deportivos digitales para control de tiempo y puntuación. Visibilidad clara y estructura lista para instalación."),
]


def gen_instaladas(copy):
    cards = []
    for src, alt, tag in PROYECTOS:
        cards.append(f'''<a class="ads-card-photo" href="#cotizar" data-wa-intent="Quiero cotizar una cancha como esta.">
  <img src="{src}" alt="{alt}" loading="lazy" decoding="async">
  <span class="ads-card-tag">{tag}</span>
  <span class="ads-card-name">Proyecto real</span>
  <span class="ads-card-sub">{copy['card_suffix']}</span>
</a>''')
    cards_html = "\n        ".join(cards)
    return f'''
<section class="ads-section" id="instaladas" style="padding:96px 20px;background:#fafafa">
  <div style="max-width:1240px;margin:0 auto">
    <div style="text-align:center;margin-bottom:56px">
      <span style="display:inline-block;background:#e8f5ec;color:#0a7a2e;padding:8px 18px;border-radius:999px;font-size:12px;font-weight:900;letter-spacing:.14em;text-transform:uppercase">{copy["instaladas_eyebrow"]}</span>
      <h2 style="font-size:clamp(32px,4.5vw,52px);font-weight:900;letter-spacing:-.02em;color:#111614;margin:18px 0 14px;line-height:1.1">{copy["instaladas_h2"]}</h2>
      <p style="max-width:720px;margin:0 auto;color:#5f6964;font-size:17px;line-height:1.55;font-weight:600">{copy["instaladas_sub"]}</p>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(310px,1fr));gap:20px">
        {cards_html}
    </div>
  </div>
</section>'''


def gen_canchas(copy):
    cards = []
    for name, sub, tag, img in CANCHAS_DEPORTES:
        cards.append(f'''<a class="ads-card-deporte" href="#cotizar" data-wa-intent="Quiero cotizar {name.lower()}.">
  <div class="ads-card-deporte-img" style="background-image:url('{img}')"></div>
  <span class="ads-card-tag" style="background:#0a7a2e">{tag}</span>
  <h3 class="ads-card-deporte-title">{name}</h3>
  <p class="ads-card-deporte-sub">{sub}</p>
</a>''')
    cards_html = "\n        ".join(cards)
    return f'''
<section class="ads-section" id="ads-canchas" style="padding:96px 20px;background:#fff">
  <div style="max-width:1240px;margin:0 auto">
    <div style="text-align:center;margin-bottom:56px">
      <span style="display:inline-block;color:#0a7a2e;font-size:12px;font-weight:900;letter-spacing:.14em;text-transform:uppercase">{copy["canchas_eyebrow"]}</span>
      <h2 style="font-size:clamp(32px,4.5vw,52px);font-weight:900;letter-spacing:-.02em;color:#111614;margin:14px 0 14px;line-height:1.15">{copy["canchas_h2"]}</h2>
      <p style="max-width:760px;margin:0 auto;color:#5f6964;font-size:17px;line-height:1.55;font-weight:600">{copy["canchas_sub"]}</p>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(310px,1fr));gap:20px">
        {cards_html}
    </div>
  </div>
</section>'''


def gen_pasto(copy):
    cards = []
    for t in TIPOS_PASTO:
        bullets = "".join(f'<li style="display:flex;align-items:center;gap:8px;padding:6px 0;color:#2c3a32;font-weight:700;font-size:14px"><span style="width:6px;height:6px;background:#0a7a2e;border-radius:50%"></span>{b}</li>' for b in t["bullets"])
        cards.append(f'''<div style="background:#fff;border:1px solid #e6ebe8;border-radius:24px;overflow:hidden;box-shadow:0 18px 54px rgba(8,18,12,.04)">
  <div style="aspect-ratio:16/10;background:url('{t["img"]}') center/cover no-repeat;position:relative">
    <span style="position:absolute;top:14px;left:14px;display:inline-block;background:#fff;color:#0a7a2e;padding:6px 12px;border-radius:999px;font-size:11px;font-weight:900;letter-spacing:.11em;text-transform:uppercase;box-shadow:0 4px 12px rgba(0,0,0,.15)">{t["tag"]}</span>
  </div>
  <div style="padding:28px 26px">
    <h3 style="font-size:22px;font-weight:900;color:#111614;margin:0 0 12px;letter-spacing:-.01em">{t["name"]}</h3>
    <p style="color:#5f6964;font-size:15px;line-height:1.55;font-weight:600;margin:0 0 18px">{t["desc"]}</p>
    <ul style="list-style:none;padding:0;margin:0;border-top:1px solid #e6ebe8;padding-top:16px">{bullets}</ul>
  </div>
</div>''')
    cards_html = "\n        ".join(cards)
    return f'''
<section class="ads-section" id="ads-pasto" style="padding:96px 20px;background:#fafafa">
  <div style="max-width:1240px;margin:0 auto">
    <div style="text-align:center;margin-bottom:56px">
      <span style="display:inline-block;color:#0a7a2e;font-size:12px;font-weight:900;letter-spacing:.14em;text-transform:uppercase">{copy["pasto_eyebrow"]}</span>
      <h2 style="font-size:clamp(32px,4.5vw,52px);font-weight:900;letter-spacing:-.02em;color:#111614;margin:14px 0 14px;line-height:1.15">{copy["pasto_h2"]}</h2>
      <p style="max-width:760px;margin:0 auto;color:#5f6964;font-size:17px;line-height:1.55;font-weight:600">{copy["pasto_sub"]}</p>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(310px,1fr));gap:22px">
        {cards_html}
    </div>
  </div>
</section>'''


def gen_estadio(copy):
    cards = []
    for num, name, desc in ESTADIO_CARDS:
        cards.append(f'''<div style="background:#1a2420;border:1px solid #2a3530;border-radius:18px;padding:24px;color:#fff">
  <span style="display:inline-block;background:#0a7a2e;color:#fff;padding:6px 12px;border-radius:8px;font-size:12px;font-weight:900;margin-bottom:14px">{num}</span>
  <h3 style="font-size:18px;font-weight:900;color:#7ee2a8;margin:0 0 10px">{name}</h3>
  <p style="color:#b6c5be;font-size:14px;line-height:1.55;font-weight:600;margin:0">{desc}</p>
</div>''')
    cards_html = "\n        ".join(cards)
    return f'''
<section class="ads-section" id="ads-estadio" style="padding:96px 20px;background:#0d1411;color:#fff">
  <div style="max-width:1240px;margin:0 auto">
    <div style="text-align:center;margin-bottom:56px">
      <span style="display:inline-block;color:#7ee2a8;font-size:12px;font-weight:900;letter-spacing:.14em;text-transform:uppercase">{copy["estadio_eyebrow"]}</span>
      <h2 style="font-size:clamp(32px,4.5vw,52px);font-weight:900;letter-spacing:-.02em;color:#fff;margin:14px 0 14px;line-height:1.15">{copy["estadio_h2"]}</h2>
      <p style="max-width:760px;margin:0 auto;color:#b6c5be;font-size:17px;line-height:1.55;font-weight:600">{copy["estadio_sub"]}</p>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:18px">
        {cards_html}
    </div>
  </div>
</section>'''


SHARED_CSS = '''<style id="ads-sections-css">
/* Oculta sticky/floating bar que tapa contenido en landings de ads */
#stickyBar,.sticky{display:none!important}
.ads-section .ads-card-photo,.ads-section .ads-card-deporte{position:relative;display:block;border-radius:18px;overflow:hidden;box-shadow:0 12px 36px rgba(8,18,12,.08);transition:transform .3s,box-shadow .3s;background:#1a2420;text-decoration:none;color:inherit}
.ads-section .ads-card-photo:hover,.ads-section .ads-card-deporte:hover{transform:translateY(-4px);box-shadow:0 20px 50px rgba(8,18,12,.14)}
.ads-section .ads-card-photo{aspect-ratio:4/3}
.ads-section .ads-card-photo img{width:100%;height:100%;object-fit:cover;display:block}
.ads-section .ads-card-photo .ads-card-name,.ads-section .ads-card-photo .ads-card-sub{position:absolute;left:18px;color:#fff;font-weight:900;text-shadow:0 2px 8px rgba(0,0,0,.6)}
.ads-section .ads-card-photo .ads-card-name{bottom:36px;font-size:20px;letter-spacing:-.01em}
.ads-section .ads-card-photo .ads-card-sub{bottom:16px;font-size:13px;font-weight:700;opacity:.92}
.ads-section .ads-card-tag{position:absolute;top:14px;left:14px;background:#0a7a2e;color:#fff;padding:6px 12px;border-radius:999px;font-size:11px;font-weight:900;letter-spacing:.1em;text-transform:uppercase}
.ads-section .ads-card-deporte{padding:20px;background:#fff;border:1px solid #e6ebe8;aspect-ratio:auto}
.ads-section .ads-card-deporte-img{aspect-ratio:16/10;background-size:cover!important;background-position:center!important;background-repeat:no-repeat!important;border-radius:14px;margin-bottom:18px;position:relative;overflow:hidden}
.ads-section .ads-card-deporte-title{font-size:20px;font-weight:900;color:#111614;margin:8px 0 6px;letter-spacing:-.01em}
.ads-section .ads-card-deporte-sub{color:#5f6964;font-size:14px;font-weight:700;margin:0}
.ads-section .ads-card-deporte .ads-card-tag{position:absolute;top:14px;left:14px;background:#0a7a2e;color:#fff}
</style>'''


def inject(landing_dir, group, force=False):
    landing_path = ROOT / landing_dir / "index.html"
    if not landing_path.exists():
        print(f"[ERROR] no existe {landing_path}", file=sys.stderr)
        sys.exit(1)
    html = landing_path.read_text(encoding="utf-8")
    if MARKER in html:
        if not force:
            print(f"[skip] {landing_dir} ya inyectado (usa --force para re-inyectar)")
            return
        # Remove previous injection block
        html = re.sub(re.escape(MARKER) + r".*?<!-- /ADS-SECTIONS-INJECTED-V2 -->\s*", "", html, flags=re.DOTALL)
        print(f"[force] bloque previo removido")
    stamp = time.strftime("%Y-%m-%d-%H%M%S")
    backup_path = landing_path.with_suffix(f".bak.{stamp}.html")
    shutil.copy2(landing_path, backup_path)
    print(f"[backup] {backup_path.name}")

    copy = COPY[group]
    injection = f"""
{MARKER}
{SHARED_CSS}
{gen_instaladas(copy)}
{gen_canchas(copy)}
{gen_pasto(copy)}
{gen_estadio(copy)}
<!-- /ADS-SECTIONS-INJECTED-V2 -->
"""
    if "<footer" in html:
        new_html = html.replace("<footer", injection + "\n<footer", 1)
    else:
        new_html = html.replace("</body>", injection + "\n</body>", 1)
    landing_path.write_text(new_html, encoding="utf-8")
    delta = len(new_html) - len(html)
    print(f"[ok] {landing_dir} +{delta:,} bytes")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--landing", required=True)
    ap.add_argument("--group", required=True, choices=list(COPY.keys()))
    ap.add_argument("--force", action="store_true", help="re-inyectar removiendo bloque previo")
    args = ap.parse_args()
    inject(args.landing, args.group, force=args.force)


if __name__ == "__main__":
    main()
