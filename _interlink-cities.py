#!/usr/bin/env python3
"""Agrega seccion 'Tambien construimos en otras ciudades' (chips) a las 28 paginas de ciudad.
Curado ~9 por pagina: mismo region + hubs (CDMX/GDL/MTY) + relleno nacional. Links reales. Idempotente.
"""
import os, glob, re, sys

DISPLAY = {
 "aguascalientes":"Aguascalientes","cancun":"Cancún","cdmx":"CDMX","chihuahua":"Chihuahua",
 "colima":"Colima","culiacan":"Culiacán","durango":"Durango","guadalajara":"Guadalajara",
 "hermosillo":"Hermosillo","irapuato":"Irapuato","leon":"León","merida":"Mérida",
 "mexicali":"Mexicali","monterrey":"Monterrey","morelia":"Morelia","oaxaca":"Oaxaca",
 "pachuca":"Pachuca","playa-del-carmen":"Playa del Carmen","puebla":"Puebla","queretaro":"Querétaro",
 "saltillo":"Saltillo","san-luis-potosi":"San Luis Potosí","tijuana":"Tijuana","toluca":"Toluca",
 "torreon":"Torreón","veracruz":"Veracruz","zacatecas":"Zacatecas","zapopan":"Zapopan",
 "san-pedro-garza-garcia":"San Pedro Garza García","puerto-vallarta":"Puerto Vallarta",
 "los-cabos":"Los Cabos","mazatlan":"Mazatlán","tampico":"Tampico","reynosa":"Reynosa",
 "ciudad-juarez":"Ciudad Juárez","apodaca":"Apodaca","san-nicolas-de-los-garza":"San Nicolás de los Garza",
 "santa-catarina":"Santa Catarina","guadalupe-nuevo-leon":"Guadalupe",
 "naucalpan-de-juarez":"Naucalpan de Juárez","cuautitlan-izcalli":"Cuautitlán Izcalli",
 "tlalnepantla-de-baz":"Tlalnepantla de Baz","ensenada":"Ensenada","rosarito":"Rosarito",
 "la-paz":"La Paz","celaya":"Celaya","ciudad-obregon":"Ciudad Obregón","los-mochis":"Los Mochis",
 "santiago-de-queretaro":"Santiago de Querétaro",
 "ciudad-del-carmen":"Ciudad del Carmen","tepic":"Tepic","xalapa":"Xalapa","cordoba":"Córdoba",
 "orizaba":"Orizaba","nuevo-laredo":"Nuevo Laredo","piedras-negras":"Piedras Negras","monclova":"Monclova",
 "matamoros":"Matamoros","ciudad-acuna":"Ciudad Acuña","san-luis-rio-colorado":"San Luis Río Colorado",
 "guaymas":"Guaymas","navojoa":"Navojoa","salamanca":"Salamanca","lagos-de-moreno":"Lagos de Moreno","uruapan":"Uruapan",
 "coatzacoalcos":"Coatzacoalcos","poza-rica":"Poza Rica","delicias":"Delicias","nogales":"Nogales","cuautla":"Cuautla",
 "chetumal":"Chetumal","chalco":"Chalco","ixtapaluca":"Ixtapaluca","ecatepec-de-morelos":"Ecatepec de Morelos",
 "nezahualcoyotl":"Nezahualcóyotl","cuautitlan":"Cuautitlán","comitan-de-dominguez":"Comitán de Domínguez",
 "tapachula":"Tapachula","tuxtla-gutierrez":"Tuxtla Gutiérrez","chilpancingo-de-los-bravo":"Chilpancingo de los Bravo",
 "ciudad-guzman":"Ciudad Guzmán","fresnillo":"Fresnillo","apatzingan":"Apatzingán",
 # ===== GRUPO 1 (ene-abr 2026 alta conv Google Ads) =====
 "tehuacan":"Tehuacán","san-martin-texmelucan":"San Martín Texmelucan","atlixco":"Atlixco",
 "san-pedro-cholula":"San Pedro Cholula","huauchinango":"Huauchinango","izucar-de-matamoros":"Izúcar de Matamoros",
 "teziutlan":"Teziutlán","cuautlancingo":"Cuautlancingo","amozoc":"Amozoc",
 "minatitlan-veracruz":"Minatitlán","tuxpan-veracruz":"Tuxpan","boca-del-rio":"Boca del Río","papantla":"Papantla",
 "zamora":"Zamora","lazaro-cardenas":"Lázaro Cárdenas","patzcuaro":"Pátzcuaro","la-piedad":"La Piedad",
 "ciudad-hidalgo-michoacan":"Ciudad Hidalgo","zitacuaro":"Zitácuaro","sahuayo":"Sahuayo",
 "tulancingo":"Tulancingo","tula-de-allende":"Tula de Allende","tizayuca":"Tizayuca","huejutla":"Huejutla",
 "ixmiquilpan":"Ixmiquilpan","mineral-de-la-reforma":"Mineral de la Reforma","actopan":"Actopan",
 "tepeji-del-rio":"Tepeji del Río","apan":"Apan",
 "soledad-de-graciano-sanchez":"Soledad de Graciano Sánchez","ciudad-valles":"Ciudad Valles",
 "matehuala":"Matehuala","rio-verde":"Río Verde","tamazunchale":"Tamazunchale","ebano":"Ébano",
 "tamuin":"Tamuín","salinas-slp":"Salinas","cardenas-slp":"Cárdenas",
 "guadalupe-zacatecas":"Guadalupe","jerez":"Jerez","sombrerete":"Sombrerete","pinos":"Pinos",
 "rio-grande":"Río Grande","loreto-zacatecas":"Loreto","calera":"Calera","ojocaliente":"Ojocaliente",
}
REGION = {
 "cdmx":"centro","toluca":"centro","puebla":"centro","pachuca":"centro","queretaro":"centro",
 "guadalajara":"occidente","zapopan":"occidente","colima":"occidente","morelia":"occidente",
 "leon":"bajio","irapuato":"bajio","aguascalientes":"bajio","san-luis-potosi":"bajio","zacatecas":"bajio",
 "monterrey":"noreste","saltillo":"noreste","torreon":"noreste","durango":"noreste",
 "chihuahua":"noroeste","mexicali":"noroeste","tijuana":"noroeste","hermosillo":"noroeste","culiacan":"noroeste",
 "merida":"sureste","cancun":"sureste","playa-del-carmen":"sureste",
 "veracruz":"golfo","oaxaca":"golfo",
 "san-pedro-garza-garcia":"noreste","apodaca":"noreste","san-nicolas-de-los-garza":"noreste",
 "santa-catarina":"noreste","guadalupe-nuevo-leon":"noreste","tampico":"noreste","reynosa":"noreste",
 "puerto-vallarta":"occidente","los-cabos":"noroeste","mazatlan":"noroeste","ciudad-juarez":"noroeste",
 "naucalpan-de-juarez":"centro","cuautitlan-izcalli":"centro","tlalnepantla-de-baz":"centro",
 "santiago-de-queretaro":"centro","celaya":"bajio",
 "ensenada":"noroeste","rosarito":"noroeste","la-paz":"noroeste","ciudad-obregon":"noroeste","los-mochis":"noroeste",
 "ciudad-del-carmen":"sureste","tepic":"occidente","lagos-de-moreno":"occidente","uruapan":"occidente",
 "xalapa":"golfo","cordoba":"golfo","orizaba":"golfo",
 "nuevo-laredo":"noreste","matamoros":"noreste","piedras-negras":"noreste","monclova":"noreste","ciudad-acuna":"noreste",
 "san-luis-rio-colorado":"noroeste","guaymas":"noroeste","navojoa":"noroeste","salamanca":"bajio",
 "coatzacoalcos":"golfo","poza-rica":"golfo","delicias":"noroeste","nogales":"noroeste","cuautla":"centro",
 "chalco":"centro","ixtapaluca":"centro","ecatepec-de-morelos":"centro","nezahualcoyotl":"centro",
 "cuautitlan":"centro","chilpancingo-de-los-bravo":"centro","chetumal":"sureste","comitan-de-dominguez":"sureste",
 "tapachula":"sureste","tuxtla-gutierrez":"sureste","ciudad-guzman":"occidente","apatzingan":"occidente","fresnillo":"bajio",
 # ===== GRUPO 1 regiones =====
 "tehuacan":"centro","san-martin-texmelucan":"centro","atlixco":"centro","san-pedro-cholula":"centro",
 "huauchinango":"centro","izucar-de-matamoros":"centro","teziutlan":"centro","cuautlancingo":"centro","amozoc":"centro",
 "minatitlan-veracruz":"golfo","tuxpan-veracruz":"golfo","boca-del-rio":"golfo","papantla":"golfo",
 "zamora":"occidente","lazaro-cardenas":"occidente","patzcuaro":"occidente","la-piedad":"occidente",
 "ciudad-hidalgo-michoacan":"occidente","zitacuaro":"occidente","sahuayo":"occidente",
 "tulancingo":"centro","tula-de-allende":"centro","tizayuca":"centro","huejutla":"centro",
 "ixmiquilpan":"centro","mineral-de-la-reforma":"centro","actopan":"centro","tepeji-del-rio":"centro","apan":"centro",
 "soledad-de-graciano-sanchez":"bajio","ciudad-valles":"bajio","matehuala":"bajio","rio-verde":"bajio",
 "tamazunchale":"bajio","ebano":"bajio","tamuin":"bajio","salinas-slp":"bajio","cardenas-slp":"bajio",
 "guadalupe-zacatecas":"bajio","jerez":"bajio","sombrerete":"bajio","pinos":"bajio","rio-grande":"bajio",
 "loreto-zacatecas":"bajio","calera":"bajio","ojocaliente":"bajio",
}
HUBS = ["cdmx","guadalajara","monterrey"]
FILL = ["puebla","queretaro","leon","toluca","merida","cancun","tijuana","san-luis-potosi",
        "aguascalientes","morelia","veracruz","hermosillo","culiacan","saltillo","chihuahua","zapopan"]
ALL = list(DISPLAY.keys())
MIN_LINKS = 9

def links_for(slug):
    out = [s for s in ALL if REGION[s] == REGION[slug] and s != slug]
    for h in HUBS:
        if h != slug and h not in out:
            out.append(h)
    for s in FILL:
        if len(out) >= MIN_LINKS:
            break
        if s != slug and s not in out:
            out.append(s)
    return out[:10]

CSS_ANCHOR = "  .related-link span{display:block;color:#65716a;font-size:13px;font-weight:650;margin-top:8px}"
CSS_ADD = """
  .cities-links{display:flex;flex-wrap:wrap;gap:10px}
  .city-chip{display:inline-flex;align-items:center;background:#fff;border:1px solid var(--line);border-radius:100px;padding:11px 18px;text-decoration:none;color:var(--ink);font-weight:800;font-size:14px;transition:.2s ease}
  .city-chip:hover{border-color:rgba(19,157,69,.4);transform:translateY(-2px);box-shadow:0 10px 26px rgba(8,18,12,.07)}
  .city-chip::after{content:"\\2192";color:var(--green);font-weight:900;margin-left:7px}"""
FOOTER_ANCHOR = "  <footer class=\"footer\">"

def section(slug):
    chips = "\n".join(
        f'          <a class="city-chip" href="/construccion-de-canchas-de-futbol-en-{s}/">{DISPLAY[s]}</a>'
        for s in links_for(slug)
    )
    return f"""    <section class="reveal">
      <div class="wrap">
        <div class="section-head">
          <span class="num">13 — Cobertura</span>
          <h2>También construimos en <span class="accent">otras ciudades.</span></h2>
          <p class="section-sub">Llevamos canchas de futbol con pasto sintético deportivo a las principales ciudades de México.</p>
        </div>
        <div class="cities-links">
{chips}
        </div>
      </div>
    </section>

"""

TARGETS = set(sys.argv[1:])  # si se pasan slugs, solo esos; si no, todas
for d in sorted(glob.glob("construccion-de-canchas-de-futbol-en-*/")):
    slug = d.rstrip("/").replace("construccion-de-canchas-de-futbol-en-", "")
    fp = os.path.join(d, "index.html")
    if slug not in DISPLAY or not os.path.exists(fp):
        continue
    if TARGETS and slug not in TARGETS:
        continue
    t = open(fp, encoding="utf-8").read()
    # strip bloque previo si existe (para regenerar con el pool completo)
    if "cities-links" in t:
        t = t.replace(CSS_ADD, "")
        t = re.sub(r'    <section class="reveal">\s*<div class="wrap">\s*<div class="section-head">\s*<span class="num">13 — Cobertura</span>.*?</section>\n+',
                   "", t, flags=re.DOTALL)
    if CSS_ANCHOR not in t or FOOTER_ANCHOR not in t:
        print(f"{slug}: ANCLA no encontrada (revisar)"); continue
    t = t.replace(CSS_ANCHOR, CSS_ANCHOR + CSS_ADD, 1)
    t = t.replace(FOOTER_ANCHOR, section(slug) + FOOTER_ANCHOR, 1)
    open(fp, "w", encoding="utf-8").write(t)
    print(f"{slug}: OK ({len(links_for(slug))} links)")
