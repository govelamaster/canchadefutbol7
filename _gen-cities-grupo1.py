#!/usr/bin/env python3
"""Grupo 1 (alta conversion Google Ads ene-abr 2026): 46 ciudades nuevas.
Clona la template Queretaro (FAQ fix + sin float + assets optimizados).
Por ciudad: clona, localiza 5 zonas reales, geo.region/placename, swap nombre/slug,
renombra imagenes. Idempotente (skip carpetas existentes).
Estados: Puebla (9), Veracruz (4), Michoacan (7), Hidalgo (9), SLP (9), Zacatecas (8).
"""
import os, re, glob, shutil

SRC = "construccion-de-canchas-de-futbol-en-queretaro"
QZONES = ["Juriquilla", "El Marqués", "Corregidora", "San Juan del Río", "Tequisquiapan"]

# Tuplas: (Display, slug, Estado, ISO, [5 colonias/municipios reales])
CITIES = [
 # ========== PUEBLA (9) ==========
 ("Tehuacán","tehuacan","Puebla","MX-PUE",["San Lorenzo Teotipilco","San Diego Chalma","Santa María Coapan","Santiago Miahuatlán","San Pablo Tepetzingo"]),
 ("San Martín Texmelucan","san-martin-texmelucan","Puebla","MX-PUE",["San Cristóbal Tepatlaxco","San Rafael Tlanalapan","San Lucas Atoyatenco","Moyotzingo","La Magdalena"]),
 ("Atlixco","atlixco","Puebla","MX-PUE",["San Pedro Benito Juárez","Cabrera","San Diego Acapulco","Metepec","Axocopan"]),
 ("San Pedro Cholula","san-pedro-cholula","Puebla","MX-PUE",["San Andrés Cholula","Santa Bárbara Almoloya","San Diego Cuachayotla","San Cristóbal Tepontla","San Gregorio Zacapechpan"]),
 ("Huauchinango","huauchinango","Puebla","MX-PUE",["Xaltepec","Tenango de las Flores","Cuacuila","Chachahuantla","Acalapa"]),
 ("Izúcar de Matamoros","izucar-de-matamoros","Puebla","MX-PUE",["San Juan Epatlán","San Martín Alchichica","Ahuatepec","La Galarza","Matzaco"]),
 ("Teziutlán","teziutlan","Puebla","MX-PUE",["Atoluca","Ixtipan","Mexcalcuautla","San Diego","Xoloateno"]),
 ("Cuautlancingo","cuautlancingo","Puebla","MX-PUE",["Sanctorum","San Lorenzo Almecatla","La Trinidad Sanctorum","Momoxpan","San Juan Cuautlancingo"]),
 ("Amozoc","amozoc","Puebla","MX-PUE",["Casa Blanca","Real de San Cayetano","Santa María Zacatepec","San Salvador Chachapa","Cuauhtinchán"]),

 # ========== VERACRUZ (4) ==========
 ("Minatitlán","minatitlan-veracruz","Veracruz","MX-VER",["Cosoleacaque","Jáltipan","Las Choapas","Oteapan","Coacotla"]),
 ("Tuxpan","tuxpan-veracruz","Veracruz","MX-VER",["Álamo","Tamiahua","Castillo de Teayo","Tihuatlán","Cobos"]),
 ("Boca del Río","boca-del-rio","Veracruz","MX-VER",["Mocambo","Costa de Oro","Antón Lizardo","Mandinga","El Estero"]),
 ("Papantla","papantla","Veracruz","MX-VER",["Coyutla","Espinal","Gutiérrez Zamora","Cazones","Tecolutla"]),

 # ========== MICHOACÁN (7) ==========
 ("Zamora","zamora","Michoacán","MX-MIC",["Jacona","Tangancícuaro","Ixtlán","Chavinda","Tlazazalca"]),
 ("Lázaro Cárdenas","lazaro-cardenas","Michoacán","MX-MIC",["La Mira","Las Guacamayas","Playa Azul","Caleta de Campos","Buenos Aires"]),
 ("Pátzcuaro","patzcuaro","Michoacán","MX-MIC",["Tzurumútaro","Erongarícuaro","Tzintzuntzan","Quiroga","Tzentzénguaro"]),
 ("La Piedad","la-piedad","Michoacán","MX-MIC",["Numarán","Pénjamo","Yurécuaro","Santa Ana Pacueco","Carapan"]),
 ("Ciudad Hidalgo","ciudad-hidalgo-michoacan","Michoacán","MX-MIC",["Tuxpan Michoacán","Jungapeo","Irimbo","Aporo","San Pedro Jácuaro"]),
 ("Zitácuaro","zitacuaro","Michoacán","MX-MIC",["Susupuato","Benito Juárez","Tiquicheo","San Felipe los Alzati","Curungueo"]),
 ("Sahuayo","sahuayo","Michoacán","MX-MIC",["Jiquilpan","Venustiano Carranza","Cojumatlán","San Cristóbal","Las Charandas"]),

 # ========== HIDALGO (9) ==========
 ("Tulancingo","tulancingo","Hidalgo","MX-HID",["Cuautepec","Santiago Tulantepec","Singuilucan","Acatlán","Metepec"]),
 ("Tula de Allende","tula-de-allende","Hidalgo","MX-HID",["Atotonilco","Atitalaquia","Tlaxcoapan","Tepetitlán","Tlahuelilpan"]),
 ("Tizayuca","tizayuca","Hidalgo","MX-HID",["Zapotlán","Tolcayuca","Villa de Tezontepec","Temascalapa","Téllez"]),
 ("Huejutla","huejutla","Hidalgo","MX-HID",["Atlapexco","Yahualica","Jaltocán","Huautla","Xochiatipan"]),
 ("Ixmiquilpan","ixmiquilpan","Hidalgo","MX-HID",["Cardonal","Chilcuautla","Tasquillo","Alfajayucan","Orizabita"]),
 ("Mineral de la Reforma","mineral-de-la-reforma","Hidalgo","MX-HID",["Pachuquilla","Forjadores","Carboneras","Azoyatla","San Antonio el Desmonte"]),
 ("Actopan","actopan","Hidalgo","MX-HID",["San Salvador","El Arenal","Mixquiahuala","Progreso","Santiago de Anaya"]),
 ("Tepeji del Río","tepeji-del-rio","Hidalgo","MX-HID",["El Crucero","Santiago Tlautla","Melchor Ocampo","San Ildefonso","La Cañada"]),
 ("Apan","apan","Hidalgo","MX-HID",["Almoloya","Tepeapulco","Tlanalapa","Zempoala","Emiliano Zapata"]),

 # ========== SAN LUIS POTOSÍ (9) ==========
 ("Soledad de Graciano Sánchez","soledad-de-graciano-sanchez","San Luis Potosí","MX-SLP",["Industrial Aviación","Las Mercedes","Genovevo Rivas","Rincón Mexiquito","Zona Industrial"]),
 ("Ciudad Valles","ciudad-valles","San Luis Potosí","MX-SLP",["El Pujal","Tamuín","Tampamolón","Aquismón","Tanlajás"]),
 ("Matehuala","matehuala","San Luis Potosí","MX-SLP",["Cedral","Vanegas","Catorce","Charcas","Villa de la Paz"]),
 ("Río Verde","rio-verde","San Luis Potosí","MX-SLP",["Ciudad Fernández","Rayón","San Ciro","San Nicolás Tolentino","La Loma"]),
 ("Tamazunchale","tamazunchale","San Luis Potosí","MX-SLP",["Axtla","Matlapa","Coxcatlán","San Martín Chalchicuautla","Huehuetlán"]),
 ("Ébano","ebano","San Luis Potosí","MX-SLP",["La Pitahaya","Tres Bocas","El Saucito","Calería","Estación Ébano"]),
 ("Tamuín","tamuin","San Luis Potosí","MX-SLP",["La Pitahaya","Tampamolón","El Higo","Pujal Coy","Aldama"]),
 ("Salinas","salinas-slp","San Luis Potosí","MX-SLP",["Villa de Ramos","Santo Domingo","Cerritos","El Salado","Punteros"]),
 ("Cárdenas","cardenas-slp","San Luis Potosí","MX-SLP",["Rayón","Alaquines","Lagunillas","San Nicolás Tolentino","Tamasopo"]),

 # ========== ZACATECAS (8) ==========
 ("Guadalupe","guadalupe-zacatecas","Zacatecas","MX-ZAC",["Tacoaleche","Bracho","La Zacatecana","Trancoso","San Jerónimo"]),
 ("Jerez","jerez","Zacatecas","MX-ZAC",["Tepetongo","Jomulquillo","San Juan del Centro","La Mesa","Susticacán"]),
 ("Sombrerete","sombrerete","Zacatecas","MX-ZAC",["San Martín","Charco Blanco","Colorada","Chalchihuites","Saín Alto"]),
 ("Pinos","pinos","Zacatecas","MX-ZAC",["Espíritu Santo","Real de Ángeles","San Marcos","El Saucito","Cañas"]),
 ("Río Grande","rio-grande","Zacatecas","MX-ZAC",["Nieves","Miguel Auza","Chalchihuites","Tlaltenango","Pánuco"]),
 ("Loreto","loreto-zacatecas","Zacatecas","MX-ZAC",["Villa González Ortega","Noria de Ángeles","Luis Moya","Bimbaletes","Ojocaliente"]),
 ("Calera","calera","Zacatecas","MX-ZAC",["Morelos","Vetagrande","Enrique Estrada","Bañón","Víctor Rosales"]),
 ("Ojocaliente","ojocaliente","Zacatecas","MX-ZAC",["Villa González Ortega","Luis Moya","Cuauhtémoc","Genaro Codina","San Antonio"]),
]

def gen(display, slug, state, iso, zones):
    dst = f"construccion-de-canchas-de-futbol-en-{slug}"
    if os.path.exists(dst):
        return f"{slug}: ya existe (skip)"
    os.makedirs(os.path.join(dst, "assets"))
    for f in glob.glob(os.path.join(SRC, "assets", "*")):
        if os.path.isfile(f):
            shutil.copy2(f, os.path.join(dst, "assets", os.path.basename(f)))
    for f in glob.glob(os.path.join(dst, "assets", "*queretaro*")):
        os.rename(f, f.replace("queretaro", slug))

    for fn in ["index.html", "llms.txt"]:
        sp = os.path.join(SRC, fn)
        if not os.path.exists(sp):
            continue
        t = open(sp, encoding="utf-8").read()
        t = t.replace('content="Querétaro, Querétaro"', f'content="{display}, {state}"')
        for qz, cz in zip(QZONES, zones):
            t = t.replace(qz, cz)
        t = t.replace("MX-QUE", iso)
        t = t.replace("Querétaro", display).replace("queretaro", slug)
        open(os.path.join(dst, fn), "w", encoding="utf-8").write(t)

    idx = open(os.path.join(dst, "index.html"), encoding="utf-8").read()
    leftover = len(re.findall(r"[Qq]uer[ée]taro", idx)) + sum(idx.count(z) for z in QZONES)
    imgs_ok = all(os.path.exists(os.path.join(dst, m.split("?")[0]))
                  for m in re.findall(r'<img[^>]*src="(assets/[^"]+)"', idx))
    faq = idx.count("summary::after")
    flo = idx.count('class="wa-float"')
    return f"{slug}: leftover={leftover} imgs_ok={imgs_ok} faq={faq} float={flo} geo={iso}"

if __name__ == "__main__":
    print(f"=== GRUPO 1: {len(CITIES)} ciudades ===")
    ok = skip = err = 0
    for c in CITIES:
        r = gen(*c)
        print(r)
        if "ya existe" in r: skip += 1
        elif "leftover=0" in r and "imgs_ok=True" in r: ok += 1
        else: err += 1
    print(f"\n=== RESUMEN: ok={ok} skip={skip} err={err} ===")
