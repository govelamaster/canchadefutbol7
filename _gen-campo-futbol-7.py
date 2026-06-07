#!/usr/bin/env python3
"""Genera /campo-de-futbol-7-en-{ciudad}/ × 349.
Angle: campo (espacio deportivo futbol 7) vs construccion (servicio integral).
"""
import os, re, json

STATE_CITIES = json.load(open("/tmp/state-cities.json"))
TPL_HTML = open("pasto-sintetico-en-tampico/index.html").read()

# Mapa slug → (label, state, region)
city_info = {}
for state, cities in STATE_CITIES.items():
    for slug, label in cities:
        # Leer geo.region
        try:
            h = open(f"construccion-de-canchas-de-futbol-en-{slug}/index.html").read(4000)
            m = re.search(r'geo\.region"\s+content="([^"]+)"', h)
            region = m.group(1) if m else "MX"
        except:
            region = "MX"
        city_info[slug] = (label, state, region)

def gen(slug):
    label, state, region = city_info[slug]
    dst = f"campo-de-futbol-7-en-{slug}"
    os.makedirs(dst, exist_ok=True)
    h = TPL_HTML

    # Normalizar archivos (mismas reglas que pasto-sintetico)
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
    for o,n in norms.items(): h = h.replace(o, n)

    # URLs
    h = h.replace("pasto-sintetico-en-tampico", f"campo-de-futbol-7-en-{slug}")
    h = h.replace("/construccion-de-canchas-de-futbol-en-tampico/", f"/construccion-de-canchas-de-futbol-en-{slug}/")
    h = re.sub(r'(assets/[^"\']*?)tampico', rf'\1{slug}', h)

    # Geo
    h = re.sub(r'(geo\.region"\s+content=")[^"]+(")', rf'\1{region}\2', h)
    h = re.sub(r'(geo\.placename"\s+content=")[^"]+(")', rf'\1{label}, {state}\2', h)

    # Title, meta, OG, Twitter
    TITLE = f"Campo de Futbol 7 en {label} | Medidas, Precio e Instalación"
    DESC = f"Campo de futbol 7 en {label} con pasto sintético deportivo: medidas oficiales (50-60×30 m), líneas, accesorios y garantía 9 años UV. Cotiza por WhatsApp."
    KW = f"campo de futbol 7 en {label}, campo futbol 7 {label}, cancha futbol 7 {label}, medidas campo futbol 7, futbol 7 {label}, instalacion campo futbol 7 {label}, pasto sintetico campo futbol 7 {label}, precio campo futbol 7 {label}, espacio futbol 7 {label}, complejo futbol 7 {label}"
    h = re.sub(r'<title>[^<]+</title>', f'<title>{TITLE}</title>', h, count=1)
    h = re.sub(r'(<meta name="description" content=")[^"]+(">)', rf'\1{DESC}\2', h, count=1)
    h = re.sub(r'(<meta name="keywords" content=")[^"]+(">)', rf'\1{KW}\2', h, count=1)
    h = re.sub(r'(<meta property="og:title" content=")[^"]+(">)', rf'\1{TITLE}\2', h, count=1)
    h = re.sub(r'(<meta property="og:description" content=")[^"]+(">)', rf'\1{DESC}\2', h, count=1)
    h = re.sub(r'(<meta name="twitter:title" content=")[^"]+(">)', rf'\1Campo de Futbol 7 en {label} | Medidas y Precio\2', h, count=1)
    h = re.sub(r'(<meta name="twitter:description" content=")[^"]+(">)', rf'\1Campo de futbol 7 con pasto sintetico en {label}: medidas oficiales, precio, accesorios y garantia.\2', h, count=1)

    # H1
    h = re.sub(r'<h1[^>]*>.*?</h1>', f'<h1>Campo de futbol 7 en <span class="accent">{label}</span></h1>', h, count=1, flags=re.DOTALL)

    # State-specific frases
    h = h.replace("Tamaulipas", state)
    h = h.replace("Tampico, Ciudad Madero, Altamira, Zona Centro, Lomas del Chairel y Universidad", f"{label} y zona metropolitana")
    h = h.replace("Tampico, Ciudad Madero, Altamira y toda la zona conurbada del sur de " + state, f"{label} y zona metropolitana de {state}")
    h = h.replace("Tampico, Ciudad Madero, Altamira y zona metropolitana", f"{label} y zona metropolitana")
    h = h.replace(f"zona conurbada del sur de {state}", f"zona metropolitana de {state}")
    h = re.sub(r'\bTampico\b', label, h)
    h = h.replace(f"en {label} y zona metropolitana", f"en {label} y zona metropolitana")

    # Copy custom (angle CAMPO no servicio integral)
    h = h.replace("Vendemos e instalamos <strong>pasto sintético deportivo</strong> en " + label + " por metro cuadrado",
                  f"Instalamos <strong>campos de futbol 7</strong> con pasto sintético deportivo en {label}: medidas oficiales (50-60×30 m), líneas reglamentarias, porterías y accesorios")
    h = h.replace("Cotizar pasto sintético", "Cotizar campo de futbol 7")
    h = h.replace(f"El pasto sintético se elige por uso, tráfico y deporte.", "El campo de futbol 7 se decide por medidas, uso y nivel de juego.")
    h = h.replace(f"Pasto sintético en {label} para diferentes proyectos.", f"Campo de futbol 7 en {label} para diferentes proyectos.")
    h = h.replace(f"Qué incluye el pasto sintético instalado en {label}.", f"Qué incluye un campo de futbol 7 en {label}.")
    h = h.replace(f"¿Cuánto cuesta el pasto sintético en {label} por m²?", f"¿Cuánto cuesta un campo de futbol 7 en {label}?")
    h = h.replace(f"El precio del pasto sintético en {label} va desde <strong>$250 a $350 MXN por m² instalado</strong>",
                  f"El precio de un campo de futbol 7 en {label} va desde <strong>$425,000 a $720,000 MXN</strong> según medidas y accesorios")
    h = h.replace(f"Pasto sintético en {label} con garantía por escrito.", f"Campo de futbol 7 en {label} con garantía por escrito.")

    # Schema Product → Service para campo (angle servicio integral CON pasto)
    h = h.replace('"@type": "Product",', '"@type": "Service",')
    h = re.sub(r'("@id": "https://canchadefutbol7\.mx/campo-de-futbol-7-en-[^"]+/)#product"', r'\1#service"', h)

    # FAQs específicas campo futbol 7
    NEW_FAQS = f'''
        {{"@type":"Question","name":"¿Cuáles son las medidas oficiales de un campo de futbol 7 en {label}?","acceptedAnswer":{{"@type":"Answer","text":"Las medidas oficiales de un campo de futbol 7 son 50-60 m de largo × 30 m de ancho (área jugable). Con 1.5 m de contracancha por lado, el terreno total mínimo es 53×33 m y máximo 63×33 m. Es el formato más solicitado en {label} para colegios, clubes y municipios."}}}},
        {{"@type":"Question","name":"¿Cuánto cuesta construir un campo de futbol 7 en {label}?","acceptedAnswer":{{"@type":"Answer","text":"El precio de un campo de futbol 7 en {label} va desde $425,000 a $720,000 MXN según medidas (1,500-2,400 m²), tipo de pasto sintético (monofilamento, fibrilado o híbrido) y accesorios. Cotizamos por proyecto al recibir medidas exactas."}}}},
        {{"@type":"Question","name":"¿Cuánto tarda construirse un campo de futbol 7?","acceptedAnswer":{{"@type":"Answer","text":"Un campo de futbol 7 con pasto sintético se instala en 7 a 9 días una vez que el área está lista y nivelada. La base (concreto, asfalto o tepetate compactado) la prepara el contratista local antes de nuestra instalación."}}}},
        {{"@type":"Question","name":"¿Qué incluye un campo de futbol 7 en {label}?","acceptedAnswer":{{"@type":"Answer","text":"El campo puede incluir: suministro e instalación de pasto sintético deportivo, líneas de juego reglamentarias, arena sílica, caucho sintético, adhesivos, uniones, trazo deportivo, cepillado final, porterías oficiales (2×6 m) y entrega listo para jugar. Accesorios como malla, alumbrado, gradas y bancas se cotizan aparte."}}}},
        {{"@type":"Question","name":"¿Qué pasto sintético se recomienda para un campo de futbol 7?","acceptedAnswer":{{"@type":"Answer","text":"Para campo de futbol 7 en {label} se recomienda pasto sintético deportivo de 40 a 50 mm de altura. Monofilamento para mejor apariencia y juego profesional, fibrilado para alto uso escolar/comercial, o híbrido para equilibrio entre ambos."}}}},
        {{"@type":"Question","name":"¿Atienden {label} y zona metropolitana?","acceptedAnswer":{{"@type":"Answer","text":"Sí. Instalamos campos de futbol 7 con pasto sintético en {label} y toda la zona metropolitana de {state} para escuelas, colegios, clubes, municipios, fraccionamientos, academias y complejos deportivos."}}}},
        {{"@type":"Question","name":"¿Cuál es la diferencia entre un campo de futbol 7 y una cancha de futbol 7?","acceptedAnswer":{{"@type":"Answer","text":"Son sinónimos: ambos términos se refieren al espacio deportivo reglamentario de futbol 7. En México, 'cancha' es más común en habla cotidiana, mientras que 'campo' se usa más en contexto formal o federativo. Las medidas y especificaciones técnicas son las mismas."}}}},
        {{"@type":"Question","name":"¿Qué medidas tiene la portería de un campo de futbol 7?","acceptedAnswer":{{"@type":"Answer","text":"La portería oficial de futbol 7 es de 2 metros de alto × 6 metros de ancho. Área grande: 13×9 m. Área chica: 6×5 m. Punto penal a 9 m del centro de la portería. Círculo central radio 7 m. Todo según reglamento oficial."}}}},
        {{"@type":"Question","name":"¿Pueden cotizar porterías, malla, alumbrado y gradas para el campo?","acceptedAnswer":{{"@type":"Answer","text":"Sí. Cotizamos porterías deportivas oficiales 2×6 m, malla ciclónica y redes perimetrales, alumbrado deportivo LED, gradas y bancas, junto con el campo de futbol 7 en {label} o como alcance separado según presupuesto."}}}},
        {{"@type":"Question","name":"¿Qué garantía tiene el campo de futbol 7?","acceptedAnswer":{{"@type":"Answer","text":"9 años contra decoloración por rayos UV del pasto sintético deportivo + 2 años en mano de obra de instalación. Garantía emitida por escrito con folio del proyecto."}}}},
        {{"@type":"Question","name":"¿Necesito base de concreto para el campo de futbol 7?","acceptedAnswer":{{"@type":"Answer","text":"La base puede ser concreto, asfalto o tepetate compactado bien nivelado. La base NO se incluye en nuestro precio del campo: la realiza el contratista local antes de nuestra instalación del pasto y accesorios."}}}},
        {{"@type":"Question","name":"¿Qué información necesitan para cotizar el campo de futbol 7 en {label}?","acceptedAnswer":{{"@type":"Answer","text":"Necesitamos medidas aproximadas del área, ubicación dentro de {label}, uso esperado (escuela, club, recreativo, comercial), si ya tienes base lista, fotos del lugar y si quieres accesorios incluidos (porterías, malla, alumbrado, gradas)."}}}}
      '''
    h = re.sub(r'("mainEntity":\s*\[).*?(\]\s*\})', rf'\1{NEW_FAQS}\2', h, count=1, flags=re.DOTALL)

    open(f"{dst}/index.html","w").write(h)
    return f"OK {slug}"

if __name__ == "__main__":
    for slug in city_info.keys():
        gen(slug)
    print(f"Total: {len(city_info)}")
