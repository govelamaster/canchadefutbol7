#!/usr/bin/env python3
"""Genera spokes nacionales /venta-pasto-sintetico/ y /pasto-sintetico-azul/."""
import os, re
TPL = open("pasto-sintetico-en-tampico/index.html").read()
TPL_LLMS = open("pasto-sintetico-en-tampico/llms.txt").read()

def gen(slug, h1, title, desc, keywords, kw_alt, copy_intro, faqs_json, replacements):
    dst = slug
    os.makedirs(dst, exist_ok=True)
    h = TPL
    # URLs canonical/og/etc → cambian a este pillar nacional
    h = h.replace("pasto-sintetico-en-tampico", slug)
    # Geo: dejar MX sin estado específico
    h = re.sub(r'(geo\.region"\s+content=")[^"]+(")', r'\1MX\2', h)
    h = re.sub(r'(geo\.placename"\s+content=")[^"]+(")', r'\1México\2', h)
    # Title + description + keywords + og + twitter
    h = re.sub(r'<title>[^<]+</title>', f'<title>{title}</title>', h, count=1)
    h = re.sub(r'(<meta name="description" content=")[^"]+(">)', rf'\1{desc}\2', h, count=1)
    h = re.sub(r'(<meta name="keywords" content=")[^"]+(">)', rf'\1{keywords}\2', h, count=1)
    h = re.sub(r'(<meta property="og:title" content=")[^"]+(">)', rf'\1{title}\2', h, count=1)
    h = re.sub(r'(<meta property="og:description" content=")[^"]+(">)', rf'\1{desc}\2', h, count=1)
    h = re.sub(r'(<meta name="twitter:title" content=")[^"]+(">)', rf'\1{title}\2', h, count=1)
    h = re.sub(r'(<meta name="twitter:description" content=")[^"]+(">)', rf'\1{desc}\2', h, count=1)
    # H1
    h = re.sub(r'<h1[^>]*>.*?</h1>', f'<h1>{h1}</h1>', h, count=1, flags=re.DOTALL)
    # State-specific
    h = h.replace("Tamaulipas", "México")
    h = h.replace("Tampico, Ciudad Madero, Altamira, Zona Centro, Lomas del Chairel y Universidad", "toda la República Mexicana")
    h = h.replace("Tampico, Ciudad Madero, Altamira y toda la zona conurbada del sur de México", "toda la República Mexicana")
    h = h.replace("Tampico, Ciudad Madero, Altamira y zona metropolitana", "toda la República Mexicana")
    h = h.replace("zona conurbada del sur de México", "México")
    h = re.sub(r'\bTampico\b', "México", h)
    h = h.replace("en México y zona metropolitana", "en México")
    h = h.replace("zona metropolitana de México", "México")
    # Copy custom
    for old, new in replacements.items():
        h = h.replace(old, new)
    # Schema Product: areaServed Country MX, sin ciudad
    h = re.sub(r'"areaServed":\s*\[[^\]]*\]',
               '"areaServed": [{ "@type": "Country", "name": "México" }]',
               h, count=1)
    # FAQs: reemplazar 12 preguntas
    if faqs_json:
        h = re.sub(r'("mainEntity":\s*\[).*?(\]\s*\})', rf'\1{faqs_json}\2', h, count=1, flags=re.DOTALL)
    with open(f"{dst}/index.html","w") as f: f.write(h)

    l = TPL_LLMS.replace("Tamaulipas","México").replace("pasto-sintetico-en-tampico", slug)
    l = re.sub(r'\bTampico\b', "México", l)
    with open(f"{dst}/llms.txt","w") as f: f.write(l)
    return f"OK {slug}"

# VENTA pasto sintetico
faqs_venta = '''
        {"@type":"Question","name":"¿Cuánto cuesta la venta de pasto sintético en México?","acceptedAnswer":{"@type":"Answer","text":"La venta de pasto sintético deportivo va desde $180 a $420 MXN por m² según tipo (monofilamento, fibrilado o híbrido), altura de fibra (40-60 mm) y cantidad. Suministro como material o con instalación profesional opcional."}},
        {"@type":"Question","name":"¿Venden pasto sintético al por mayor en México?","acceptedAnswer":{"@type":"Answer","text":"Sí. Sportmaster vende pasto sintético deportivo al mayoreo para distribuidores, contratistas, escuelas, clubes y municipios con descuentos por volumen y entrega nacional."}},
        {"@type":"Question","name":"¿Qué tipos de pasto sintético se venden en Sportmaster?","acceptedAnswer":{"@type":"Answer","text":"Tres sistemas: monofilamento (mejor apariencia, recuperación de fibra), fibrilado (alta resistencia al desgaste) e híbrido (equilibrio resistencia + apariencia). Todos para uso deportivo en canchas de futbol."}},
        {"@type":"Question","name":"¿Hacen envíos de pasto sintético a toda la República?","acceptedAnswer":{"@type":"Answer","text":"Sí. Cobertura nacional con tránsito de 15 a 60 días según destino y cantidad. Suministramos a CDMX, GDL, Monterrey, Veracruz, Mérida, Cancún y todas las capitales del país."}},
        {"@type":"Question","name":"¿Puedo comprar solo el pasto sintético sin instalación?","acceptedAnswer":{"@type":"Answer","text":"Sí. La venta puede ser suministro de material solo (rollo de pasto sintético deportivo) o con instalación profesional (rellenos, líneas, uniones, cepillado final). Tú decides el alcance."}},
        {"@type":"Question","name":"¿Qué garantía tiene el pasto sintético que venden?","acceptedAnswer":{"@type":"Answer","text":"9 años contra decoloración por rayos UV del pasto sintético deportivo + 2 años en mano de obra si contratas instalación. Garantía emitida por escrito con folio de proyecto."}},
        {"@type":"Question","name":"¿Cuál es el ancho de los rollos de pasto sintético?","acceptedAnswer":{"@type":"Answer","text":"Los rollos estándar son de 4 m de ancho, con longitud variable según el pedido. Esto reduce el número de uniones en la cancha y mejora el acabado deportivo."}},
        {"@type":"Question","name":"¿Aceptan pagos con factura y crédito?","acceptedAnswer":{"@type":"Answer","text":"Sí. Sportmaster emite factura electrónica y maneja líneas de crédito para escuelas, gobierno municipal, clubes deportivos y contratistas frecuentes. Pago con transferencia, tarjeta o crédito."}},
        {"@type":"Question","name":"¿Cuánto m² puedo pedir mínimo en la venta de pasto sintético?","acceptedAnswer":{"@type":"Answer","text":"No hay mínimo estricto. Recomendamos pedidos desde 100 m² para optimizar logística y precio. Para canchas completas (futbol 5, 7, rápido, 11) cotizamos por proyecto."}},
        {"@type":"Question","name":"¿Tienen showroom o muestras del pasto sintético?","acceptedAnswer":{"@type":"Answer","text":"Sí. Enviamos muestras físicas a clientes en evaluación. También compartimos fichas técnicas, video de obras reales y referencias de proyectos instalados."}},
        {"@type":"Question","name":"¿En cuánto tiempo entregan el pedido de pasto sintético?","acceptedAnswer":{"@type":"Answer","text":"Tiempo de entrega: 15 a 60 días según disponibilidad, cantidad y destino. Pedidos urgentes se cotizan con tiempos especiales según stock disponible."}},
        {"@type":"Question","name":"¿Atienden distribuidores y contratistas en toda la República?","acceptedAnswer":{"@type":"Answer","text":"Sí. Sportmaster maneja programa de distribución para contratistas, instaladores y revendedores en toda la República Mexicana con precios mayoristas y soporte técnico."}}
      '''

gen("venta-pasto-sintetico",
    h1='Venta de <span class="accent">pasto sintético</span>',
    title="Venta de Pasto Sintético en México | Sportmaster Distribuidor",
    desc="Venta de pasto sintético deportivo en México: tipos, precio por m², mayoreo, distribución nacional, factura, garantía 9 años. Cotiza por WhatsApp.",
    keywords="venta de pasto sintetico, venta pasto sintetico Mexico, venta pasto sintetico mayoreo, distribuidor pasto sintetico, pasto sintetico al mayoreo, pasto sintetico deportivo venta, pasto sintetico para canchas venta, venta pasto sintetico monofilamento, venta pasto sintetico fibrilado, venta pasto sintetico hibrido",
    kw_alt="venta pasto sintetico",
    copy_intro="",
    faqs_json=faqs_venta,
    replacements={
        "Vendemos e instalamos <strong>pasto sintético deportivo</strong> en México por metro cuadrado: monofilamento, fibrilado e híbrido para canchas de futbol 5, 7, rápido y soccer en escuelas, clubes, municipios y complejos deportivos de la zona metropolitana.": "Sportmaster es <strong>distribuidor nacional de pasto sintético deportivo</strong> en México: venta por m², al mayoreo y con instalación opcional. Suministramos monofilamento, fibrilado e híbrido para canchas de futbol 5, 7, rápido, soccer, escuelas, clubes, municipios y contratistas en toda la República.",
        "Pasto sintético en México": "Venta de pasto sintético en México",
        ">Cotizar pasto sintético</a>": ">Cotizar venta de pasto sintético</a>",
        "El pasto sintético se elige por uso, tráfico y deporte.": "La venta de pasto sintético se decide por uso, m², tipo y deporte.",
        "Pasto sintético en México para diferentes proyectos.": "Venta de pasto sintético para diferentes proyectos.",
        "Qué incluye el pasto sintético instalado en México.": "Qué incluye la venta de pasto sintético en México.",
        "¿Cuánto cuesta el pasto sintético en México por m²?": "¿Cuánto cuesta la venta de pasto sintético por m²?",
        "El precio del pasto sintético en México va desde <strong>$250 a $350 MXN por m² instalado</strong>": "El precio de venta del pasto sintético va desde <strong>$180 a $420 MXN por m²</strong> (material suelto) o <strong>$250 a $350 MXN por m² instalado</strong>",
        "Pasto sintético en México con garantía por escrito.": "Venta de pasto sintético con garantía por escrito.",
    })

# PASTO SINTETICO AZUL
faqs_azul = '''
        {"@type":"Question","name":"¿Existe pasto sintético azul en México?","acceptedAnswer":{"@type":"Answer","text":"Sí. Sportmaster maneja pasto sintético azul deportivo para líneas de juego, escudos pintados, áreas de portería y canchas decorativas o multideporte donde se requiere contraste visual diferente al verde estándar."}},
        {"@type":"Question","name":"¿Para qué se usa el pasto sintético azul?","acceptedAnswer":{"@type":"Answer","text":"Principalmente para: líneas de juego dentro de canchas verdes, escudos del equipo pintados o cosidos en pasto, áreas de portería diferenciadas, canchas decorativas, multideporte (hockey, padel, tenis) y diseños corporativos por pedido."}},
        {"@type":"Question","name":"¿Cuánto cuesta el pasto sintético azul por metro cuadrado?","acceptedAnswer":{"@type":"Answer","text":"El pasto sintético azul tiene precio desde $280 a $400 MXN por m² instalado, según altura de fibra, calidad y cantidad. Es ligeramente más caro que el verde estándar por ser producción especial."}},
        {"@type":"Question","name":"¿Qué tipos de pasto sintético azul venden?","acceptedAnswer":{"@type":"Answer","text":"Manejamos monofilamento azul, fibrilado azul y rollos especiales de 4 m de ancho. Altura de fibra de 40 a 60 mm. También combinaciones azul + blanco + verde para diseños deportivos completos."}},
        {"@type":"Question","name":"¿El pasto sintético azul tiene la misma garantía contra UV?","acceptedAnswer":{"@type":"Answer","text":"Sí. 9 años contra decoloración por rayos UV en el pasto sintético azul deportivo, igual que el verde estándar. Tecnología de pigmentación deportiva resistente al sol."}},
        {"@type":"Question","name":"¿Pueden combinar pasto sintético azul con verde y blanco?","acceptedAnswer":{"@type":"Answer","text":"Sí. Hacemos canchas combinadas: campo verde + líneas de juego blancas + áreas o escudos en azul. Diseño deportivo a medida según el deporte y la imagen del cliente."}},
        {"@type":"Question","name":"¿Qué deportes se juegan en cancha de pasto sintético azul?","acceptedAnswer":{"@type":"Answer","text":"Hockey sobre césped (canchas oficiales internacionales son azules), padel (pista azul + líneas blancas), futbol 5 y futbol rápido con diseño decorativo, áreas multideporte y entrenamientos especiales."}},
        {"@type":"Question","name":"¿Hacen envíos de pasto sintético azul a toda México?","acceptedAnswer":{"@type":"Answer","text":"Sí. Cobertura nacional con tránsito de 20 a 60 días por ser producción especial. Suministramos a CDMX, GDL, Monterrey, Mérida, Cancún y todas las capitales con instalación opcional."}},
        {"@type":"Question","name":"¿Cuánto tarda fabricarse el pasto sintético azul?","acceptedAnswer":{"@type":"Answer","text":"Por ser color especial, el pasto sintético azul tarda 20 a 45 días en fabricación + tránsito. Para pedidos urgentes consultamos stock disponible en almacén."}},
        {"@type":"Question","name":"¿Tienen pasto sintético rojo, amarillo u otros colores además del azul?","acceptedAnswer":{"@type":"Answer","text":"Sí. Además de azul deportivo, manejamos rojo, blanco y amarillo bajo pedido para líneas de juego, escudos, áreas técnicas y diseños corporativos personalizados."}},
        {"@type":"Question","name":"¿El pasto sintético azul es para canchas reglamentarias FIFA?","acceptedAnswer":{"@type":"Answer","text":"Las canchas oficiales FIFA son verdes. El pasto azul se usa en hockey (oficial FIH), padel (oficial WPT/FIP) y canchas recreativas o decorativas. Cumple normas según el deporte específico."}},
        {"@type":"Question","name":"¿Pueden pintar escudos o logos sobre pasto sintético?","acceptedAnswer":{"@type":"Answer","text":"Sí. Pintamos escudos del equipo, logos del Gobierno del Estado, escudos institucionales y diseños corporativos directamente sobre el pasto sintético con pintura deportiva resistente al sol."}}
      '''

gen("pasto-sintetico-azul",
    h1='Pasto sintético <span class="accent">azul</span>',
    title="Pasto Sintético Azul | Hockey, Padel, Líneas y Escudos Deportivos",
    desc="Pasto sintético azul deportivo en México: hockey, padel, líneas de juego, escudos, áreas diferenciadas. Tipos, precio por m², instalación y garantía 9 años.",
    keywords="pasto sintetico azul, cancha de pasto sintetico azul, pasto sintetico azul precio, pasto sintetico azul hockey, pasto sintetico azul padel, pasto sintetico colores, pasto sintetico azul lineas, pasto sintetico azul deportivo, pasto sintetico azul Mexico, pasto sintetico azul m2",
    kw_alt="pasto sintetico azul",
    copy_intro="",
    faqs_json=faqs_azul,
    replacements={
        "Vendemos e instalamos <strong>pasto sintético deportivo</strong> en México por metro cuadrado: monofilamento, fibrilado e híbrido para canchas de futbol 5, 7, rápido y soccer en escuelas, clubes, municipios y complejos deportivos de la zona metropolitana.": "Vendemos e instalamos <strong>pasto sintético azul deportivo</strong> en México: para canchas de hockey, padel, líneas de juego, escudos pintados, áreas diferenciadas y diseños corporativos. Monofilamento, fibrilado y rollos especiales con garantía 9 años contra UV.",
        ">Cotizar pasto sintético</a>": ">Cotizar pasto sintético azul</a>",
        "El pasto sintético se elige por uso, tráfico y deporte.": "El pasto sintético azul se elige por deporte, uso decorativo y diseño.",
        "Pasto sintético en México para diferentes proyectos.": "Pasto sintético azul para diferentes proyectos.",
        "Qué incluye el pasto sintético instalado en México.": "Qué incluye el pasto sintético azul instalado.",
        "¿Cuánto cuesta el pasto sintético en México por m²?": "¿Cuánto cuesta el pasto sintético azul por m²?",
        "El precio del pasto sintético en México va desde <strong>$250 a $350 MXN por m² instalado</strong>": "El precio del pasto sintético azul va desde <strong>$280 a $400 MXN por m² instalado</strong>",
        "Pasto sintético en México con garantía por escrito.": "Pasto sintético azul con garantía por escrito.",
    })

