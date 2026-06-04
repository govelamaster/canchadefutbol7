#!/usr/bin/env python3
"""Genera programaticas de ciudad clonando queretaro (que ya trae FAQ fix + sin float + optimizado).
Por ciudad: clona, localiza zonas reales, geo.region/placename, swap nombre/slug, renombra imagenes.
Config con geografia real mexicana. Idempotente (no sobrescribe carpetas existentes).
"""
import os, re, glob, shutil
from PIL import Image  # noqa (no se usa pero confirma entorno)

SRC = "construccion-de-canchas-de-futbol-en-queretaro"
# Orden de zonas Qro a reemplazar: [Juriquilla, El Marqués, Corregidora, San Juan del Río, Tequisquiapan]
QZONES = ["Juriquilla", "El Marqués", "Corregidora", "San Juan del Río", "Tequisquiapan"]

CITIES = [
 ("Morelia","morelia","Michoacán","MX-MIC",["Altozano","Tres Marías","Santa María de Guido","Charo","Tarímbaro"]),
 ("Durango","durango","Durango","MX-DUR",["Real del Mezquital","Las Fuentes","Villas del Guadiana","Ciudad Industrial","Nuevo Durango"]),
 ("Oaxaca","oaxaca","Oaxaca","MX-OAX",["Santa Lucía del Camino","San Antonio de la Cal","Santa Cruz Xoxocotlán","San Agustín de las Juntas","Reforma"]),
 ("Zacatecas","zacatecas","Zacatecas","MX-ZAC",["Guadalupe","Tacoaleche","La Encantada","Bracho","Centro"]),
 ("Mexicali","mexicali","Baja California","MX-BCN",["Centro Cívico","Santa Isabel","González Ortega","Los Pinos","Zona Industrial"]),
 ("Saltillo","saltillo","Coahuila","MX-COA",["Ramos Arizpe","Arteaga","La Aurora","Nazario Ortiz","Valle Real"]),
 ("Veracruz","veracruz","Veracruz","MX-VER",["Boca del Río","Medellín de Bravo","Mocambo","Costa de Oro","Las Bajadas"]),
 ("Aguascalientes","aguascalientes","Aguascalientes","MX-AGU",["Jesús María","San Francisco de los Romo","Pulgas Pandas","Pocitos","Centro"]),
 ("Culiacán","culiacan","Sinaloa","MX-SIN",["Tres Ríos","La Primavera","Las Quintas","Barrancos","Navolato"]),
 ("Colima","colima","Colima","MX-COL",["Villa de Álvarez","El Diezmo","Lomas de Circunvalación","Las Víboras","Tepames"]),
 ("Pachuca","pachuca","Hidalgo","MX-HID",["Mineral de la Reforma","San Agustín Tlaxiaca","Real del Monte","Zona Plateada","Centro"]),
 ("Toluca","toluca","Estado de México","MX-MEX",["Metepec","Zinacantepec","Lerma","San Mateo Atenco","Calimaya"]),
 ("Torreón","torreon","Coahuila","MX-COA",["Gómez Palacio","Lerdo","Matamoros","Residencial Campestre","Nazas"]),
 ("Hermosillo","hermosillo","Sonora","MX-SON",["Villa de Seris","Pitic","Las Quintas","El Llano","Bahía de Kino"]),
 ("Chihuahua","chihuahua","Chihuahua","MX-CHH",["Aldama","El Saucito","Campo Bello","Las Águilas","Nombre de Dios"]),
 ("León","leon","Guanajuato","MX-GUA",["Jardines del Moral","Campestre","San Juan Bosco","Las Joyas","Coecillo"]),
 ("Zapopan","zapopan","Jalisco","MX-JAL",["Andares","Ciudad Granja","Tesistán","Santa Ana Tepetitlán","La Estancia"]),
 ("Irapuato","irapuato","Guanajuato","MX-GUA",["Las Reynas","Villas de Irapuato","San Antonio","La Pradera","Ejido San José"]),
 ("San Pedro Garza García","san-pedro-garza-garcia","Nuevo León","MX-NLE",["Del Valle","Valle Oriente","San Agustín","Fuentes del Valle","La Herradura"]),
 ("Puerto Vallarta","puerto-vallarta","Jalisco","MX-JAL",["Marina Vallarta","Zona Hotelera","Pitillal","Versalles","Nuevo Vallarta"]),
 ("Los Cabos","los-cabos","Baja California Sur","MX-BCS",["San José del Cabo","Cabo San Lucas","El Tezal","Palmilla","San José Viejo"]),
 ("Mazatlán","mazatlan","Sinaloa","MX-SIN",["Zona Dorada","Centro","El Cid","Cerritos","Nuevo Mazatlán"]),
 ("Tampico","tampico","Tamaulipas","MX-TAM",["Ciudad Madero","Altamira","Zona Centro","Lomas del Chairel","Universidad"]),
 ("Reynosa","reynosa","Tamaulipas","MX-TAM",["Las Cumbres","Aztlán","Jarachina","Anzaldúas","Zona Centro"]),
 ("Ciudad Juárez","ciudad-juarez","Chihuahua","MX-CHH",["Zona Centro","Pronaf","Campestre","Las Misiones","Zaragoza"]),
 ("Apodaca","apodaca","Nuevo León","MX-NLE",["Huinalá","Pueblo Nuevo","Las Torres","Ciudad Solidaridad","Privadas de Santa Rosa"]),
 ("San Nicolás de los Garza","san-nicolas-de-los-garza","Nuevo León","MX-NLE",["Anáhuac","La Fe","Las Puentes","Casa Bella","Residencial Anáhuac"]),
 ("Santa Catarina","santa-catarina","Nuevo León","MX-NLE",["La Fama","San Gilberto","Las Ánimas","La Huasteca","Valle de Lincoln"]),
 ("Guadalupe","guadalupe-nuevo-leon","Nuevo León","MX-NLE",["Linda Vista","Contry","Las Quintas","La Pastora","Tampiquito"]),
 ("Naucalpan de Juárez","naucalpan-de-juarez","Estado de México","MX-MEX",["Satélite","Boulevares","Echegaray","San Mateo Nopala","La Florida"]),
 ("Cuautitlán Izcalli","cuautitlan-izcalli","Estado de México","MX-MEX",["La Quebrada","Centro Urbano","Atlanta","Cumbria","Bosques del Lago"]),
 ("Tlalnepantla de Baz","tlalnepantla-de-baz","Estado de México","MX-MEX",["Valle Dorado","San Juan Ixhuatepec","La Romana","Los Reyes Ixtacala","Tlalnepantla Centro"]),
 ("Ensenada","ensenada","Baja California","MX-BCN",["Chapultepec","Valle de Guadalupe","Maneadero","El Sauzal","Zona Centro"]),
 ("Rosarito","rosarito","Baja California","MX-BCN",["Primo Tapia","Puerto Nuevo","Cantamar","Plan Libertador","Zona Centro"]),
 ("La Paz","la-paz","Baja California Sur","MX-BCS",["El Centenario","Chametla","El Comitán","Zona Centro","El Manglito"]),
 ("Celaya","celaya","Guanajuato","MX-GUA",["Villas de la Hacienda","Zona Centro","Alameda","San Juanico","Galaxias"]),
 ("Ciudad Obregón","ciudad-obregon","Sonora","MX-SON",["Cajeme","Esperanza","Villa Bonita","Centro","Pueblo Yaqui"]),
 ("Los Mochis","los-mochis","Sinaloa","MX-SIN",["Ahome","Topolobampo","Centro","Las Fuentes","Macapule"]),
 ("Ciudad del Carmen","ciudad-del-carmen","Campeche","MX-CAM",["Isla Aguada","Atasta","Sabancuy","Zona Centro","Playa Norte"]),
 ("Tepic","tepic","Nayarit","MX-NAY",["Xalisco","San Cayetano","Zona Centro","La Cantera","Fátima"]),
 ("Xalapa","xalapa","Veracruz","MX-VER",["Las Ánimas","Coatepec","Banderilla","Zona Centro","El Castillo"]),
 ("Córdoba","cordoba","Veracruz","MX-VER",["Fortín","Amatlán","Zona Centro","San José","Peñuela"]),
 ("Orizaba","orizaba","Veracruz","MX-VER",["Río Blanco","Ixtaczoquitlán","Nogales","Zona Centro","Cerritos"]),
 ("Nuevo Laredo","nuevo-laredo","Tamaulipas","MX-TAM",["Zona Centro","Colonia Madero","Las Américas","Voluntad y Trabajo","La Fe"]),
 ("Piedras Negras","piedras-negras","Coahuila","MX-COA",["Villa de Fuente","Zona Centro","Mundo Nuevo","Buenavista","Lázaro Cárdenas"]),
 ("Monclova","monclova","Coahuila","MX-COA",["Frontera","Castaños","Guadalupe","Zona Centro","Ciudad Deportiva"]),
 ("Matamoros","matamoros","Tamaulipas","MX-TAM",["Playa Bagdad","Zona Centro","Lomas del Real","Las Rusias","Valle Hermoso"]),
 ("Ciudad Acuña","ciudad-acuna","Coahuila","MX-COA",["Zona Centro","San Antonio","Las Vegas","Roma","Braña"]),
 ("San Luis Río Colorado","san-luis-rio-colorado","Sonora","MX-SON",["Zona Centro","Comercial","Industrial","Cuauhtémoc","Progreso"]),
 ("Guaymas","guaymas","Sonora","MX-SON",["San Carlos","Empalme","Zona Centro","Delicias","Las Playitas"]),
 ("Navojoa","navojoa","Sonora","MX-SON",["Pueblo Viejo","Zona Centro","Constitución","Tetanchopo","Bacobampo"]),
 ("Salamanca","salamanca","Guanajuato","MX-GUA",["Valtierrilla","Zona Centro","Bellavista","Cárdenas","San Pedro"]),
 ("Lagos de Moreno","lagos-de-moreno","Jalisco","MX-JAL",["Zona Centro","La Loma","Las Cruces","Moya","El Refugio"]),
 ("Uruapan","uruapan","Michoacán","MX-MIC",["La Magdalena","Zona Centro","San Juan Quemado","Jardines","Santa Bárbara"]),
 ("Coatzacoalcos","coatzacoalcos","Veracruz","MX-VER",["Nanchital","Ixhuatlán del Sureste","Allende","Zona Centro","Las Gaviotas"]),
 ("Poza Rica","poza-rica","Veracruz","MX-VER",["Tihuatlán","Coatzintla","Zona Centro","Cazones","Palma Sola"]),
 ("Delicias","delicias","Chihuahua","MX-CHH",["Rosales","Meoqui","Zona Centro","Las Varas","Saucillo"]),
 ("Nogales","nogales","Sonora","MX-SON",["Zona Centro","Kennedy","Los Álamos","La Mesa","Buenos Aires"]),
 ("Cuautla","cuautla","Morelos","MX-MOR",["Ayala","Yautepec","Zona Centro","Casasano","Tetelcingo"]),
 ("Chetumal","chetumal","Quintana Roo","MX-ROO",["Calderitas","Bacalar","Zona Centro","Payo Obispo","Subteniente López"]),
 ("Chalco","chalco","Estado de México","MX-MEX",["Valle de Chalco","Temamatla","Zona Centro","San Marcos","La Candelaria"]),
 ("Ixtapaluca","ixtapaluca","Estado de México","MX-MEX",["Ayotla","Zona Centro","San Buenaventura","Coatepec","Río Frío"]),
 ("Ecatepec de Morelos","ecatepec-de-morelos","Estado de México","MX-MEX",["Coacalco","Tulpetlac","Santa Clara","Zona Centro","San Cristóbal"]),
 ("Nezahualcóyotl","nezahualcoyotl","Estado de México","MX-MEX",["Zona Centro","Benito Juárez","El Sol","Las Águilas","Vicente Villada"]),
 ("Cuautitlán","cuautitlan","Estado de México","MX-MEX",["Zona Centro","San Mateo Ixtacalco","Santa Bárbara","Axotlán","La Aurora"]),
 ("Comitán de Domínguez","comitan-de-dominguez","Chiapas","MX-CHP",["Zona Centro","Yalumá","La Pila","Las Flores","Yocnajab"]),
 ("Tapachula","tapachula","Chiapas","MX-CHP",["Puerto Madero","Zona Centro","Álvaro Obregón","Cinco de Febrero","Raymundo Enríquez"]),
 ("Tuxtla Gutiérrez","tuxtla-gutierrez","Chiapas","MX-CHP",["Terán","Copoya","Zona Centro","Las Granjas","El Jobo"]),
 ("Chilpancingo de los Bravo","chilpancingo-de-los-bravo","Guerrero","MX-GRO",["Zona Centro","Petaquillas","Tixtla","Mochitlán","Las Joyas"]),
 ("Ciudad Guzmán","ciudad-guzman","Jalisco","MX-JAL",["Zona Centro","El Fresnito","Zapotiltic","Gómez Farías","Atequizayan"]),
 ("Fresnillo","fresnillo","Zacatecas","MX-ZAC",["Plateros","Zona Centro","Río Florido","Las Arsinas","Estación"]),
 ("Apatzingán","apatzingan","Michoacán","MX-MIC",["Zona Centro","Buenavista","Aguililla","Parácuaro","Cuatro Caminos"]),
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
        # 1. geo.placename (antes del swap generico de Querétaro)
        t = t.replace('content="Querétaro, Querétaro"', f'content="{display}, {state}"')
        # 2. zonas Qro -> zonas reales de la ciudad
        for qz, cz in zip(QZONES, zones):
            t = t.replace(qz, cz)
        # 3. geo.region ISO
        t = t.replace("MX-QUE", iso)
        # 4. nombre y slug
        t = t.replace("Querétaro", display).replace("queretaro", slug)
        open(os.path.join(dst, fn), "w", encoding="utf-8").write(t)

    idx = open(os.path.join(dst, "index.html"), encoding="utf-8").read()
    leftover = len(re.findall(r"[Qq]uer[ée]taro", idx)) + sum(idx.count(z) for z in QZONES)
    imgs_ok = all(os.path.exists(os.path.join(dst, m.split("?")[0]))
                  for m in re.findall(r'<img[^>]*src="(assets/[^"]+)"', idx))
    faq = idx.count("summary::after")
    flo = idx.count('class="wa-float"')
    return f"{slug}: leftover_qro={leftover} imgs_ok={imgs_ok} faq_fix={faq} float={flo} geo={iso}"

for c in CITIES:
    print(gen(*c))
