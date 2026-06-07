#!/usr/bin/env python3
"""Grupo 2 (hambrientos - CPA <$135 Google Ads ene-abr 2026): 75 ciudades nuevas.
Mismo motor que grupo1. Clona desde queretaro template, localiza zonas, geo, slug.
Estados: Edo.Mex (4), Chiapas (7), Oaxaca (9), Colima (7), Sinaloa (7),
Chihuahua (7), Sonora (4), Q.Roo (7), Nayarit (9), Tabasco (10), BC (1), BCS (3).
"""
import os, re, glob, shutil

SRC = "construccion-de-canchas-de-futbol-en-queretaro"
QZONES = ["Juriquilla", "El Marqués", "Corregidora", "San Juan del Río", "Tequisquiapan"]

CITIES = [
 # ========== EDO. MÉXICO (4) ==========
 ("Atizapán de Zaragoza","atizapan-de-zaragoza","Estado de México","MX-MEX",["Lomas Lindas","México Nuevo","Las Alamedas","Villas de la Hacienda","Hacienda del Pedregal"]),
 ("Chimalhuacán","chimalhuacan","Estado de México","MX-MEX",["San Lorenzo","Xochiaca","Tlaixco","Acuitlapilco","San Agustín"]),
 ("Tultitlán","tultitlan","Estado de México","MX-MEX",["Buenavista","Lechería","San Pablo de las Salinas","Fuentes del Valle","Recursos Hidráulicos"]),
 ("Valle de Chalco","valle-de-chalco","Estado de México","MX-MEX",["Xico","San Isidro","Avándaro","Concepción","Alfredo del Mazo"]),

 # ========== CHIAPAS (7) ==========
 ("San Cristóbal de las Casas","san-cristobal-de-las-casas","Chiapas","MX-CHP",["Cuxtitali","La Hormiga","Mexicanos","Real del Monte","María Auxiliadora"]),
 ("Palenque","palenque","Chiapas","MX-CHP",["Pakal-Ná","Catazajá","El Naranjo","Río Chancalá","Bajadas Grandes"]),
 ("Chiapa de Corzo","chiapa-de-corzo","Chiapas","MX-CHP",["Nandayalú","Acala","San Gabriel","Suchiapa","Vista Hermosa"]),
 ("Villaflores","villaflores","Chiapas","MX-CHP",["Villa Corzo","Jesús María Garza","Roberto Barrios","Cuauhtémoc","Vergel"]),
 ("Tonalá","tonala-chiapas","Chiapas","MX-CHP",["Paredón","Pijijiapan","Mapastepec","Cabeza de Toro","Puerto Arista"]),
 ("Ocosingo","ocosingo","Chiapas","MX-CHP",["Altamirano","Chilón","Yajalón","San Quintín","Nueva Palestina"]),
 ("Cintalapa","cintalapa","Chiapas","MX-CHP",["Jiquipilas","Revolución Mexicana","Nuevo Vicente Guerrero","Rincón Tigre","Tierra y Libertad"]),

 # ========== OAXACA (9) ==========
 ("Salina Cruz","salina-cruz","Oaxaca","MX-OAX",["La Ventosa","Boca del Río","Salinas del Marqués","Garrafón","Refinería"]),
 ("Juchitán","juchitan","Oaxaca","MX-OAX",["Álvaro Obregón","La Ventosa","Espinal","San Blas Atempa","Unión Hidalgo"]),
 ("Tuxtepec","tuxtepec","Oaxaca","MX-OAX",["Loma Bonita","Jalapa de Díaz","Valle Nacional","Río Tonto","Sebastopol"]),
 ("Tehuantepec","tehuantepec","Oaxaca","MX-OAX",["Mixtequilla","Magdalena Tlacotepec","Santa María Jalapa","Santo Domingo","Mariscala"]),
 ("Huajuapan de León","huajuapan-de-leon","Oaxaca","MX-OAX",["San Marcos","Tezoatlán","Camotlán","Santa Catarina","Yutanduchi"]),
 ("Puerto Escondido","puerto-escondido","Oaxaca","MX-OAX",["Rinconada","Carrizalillo","Bacocho","Zicatela","Manialtepec"]),
 ("Huatulco","huatulco","Oaxaca","MX-OAX",["La Crucecita","Santa Cruz","Tangolunda","Chahué","San Agustín"]),
 ("Pinotepa Nacional","pinotepa-nacional","Oaxaca","MX-OAX",["Santa Catarina","San José Estancia","San Pedro Atoyac","San Andrés Huaxpaltepec","Santo Domingo Armenta"]),
 ("Pochutla","pochutla","Oaxaca","MX-OAX",["San Pedro Pochutla","Puerto Ángel","Mazunte","San Agustinillo","Zipolite"]),

 # ========== COLIMA (7) ==========
 ("Manzanillo","manzanillo","Colima","MX-COL",["Salagua","Santiago","Las Brisas","Playa de Oro","Tapeixtles"]),
 ("Tecomán","tecoman","Colima","MX-COL",["Cofradía de Morelos","Madrid","Cerro de Ortega","Independencia","Real de Tecomán"]),
 ("Villa de Álvarez","villa-de-alvarez","Colima","MX-COL",["Pueblo Nuevo","Camino Real","Centro","Mirador de la Cumbre","Lomas de la Higuera"]),
 ("Comala","comala","Colima","MX-COL",["Suchitlán","Cofradía de Suchitlán","Zacualpan","Nogueras","La Caja"]),
 ("Armería","armeria","Colima","MX-COL",["Cuyutlán","Pueblo Juárez","Augusto Gómez Villanueva","Rincón de López","Independencia"]),
 ("Coquimatlán","coquimatlan","Colima","MX-COL",["Jala","Pueblo Juárez","Agua Zarca","La Esperanza","Trapichillos"]),
 ("Cuauhtémoc","cuauhtemoc-colima","Colima","MX-COL",["Quesería","Buenavista","Palmillas","Alcaraces","San Joaquín"]),

 # ========== SINALOA (7) ==========
 ("Guasave","guasave","Sinaloa","MX-SIN",["Juan José Ríos","San Rafael","Bamoa","Ruiz Cortines","La Trinidad"]),
 ("Navolato","navolato","Sinaloa","MX-SIN",["El Castillo","Sataya","Villa Juárez","Altata","Las Trancas"]),
 ("Guamúchil","guamuchil","Sinaloa","MX-SIN",["Mocorito","Pericos","Angostura","Caimanero","La Pitahaya"]),
 ("El Rosario","el-rosario","Sinaloa","MX-SIN",["Chametla","Apoderado","El Pozole","Matatán","Cacalotán"]),
 ("El Fuerte","el-fuerte","Sinaloa","MX-SIN",["Choix","San Blas","Tehueco","Sufragio","Bacubirito"]),
 ("Escuinapa","escuinapa","Sinaloa","MX-SIN",["Teacapán","Isla del Bosque","Palmillas","La Concha","Cristo Rey"]),
 ("Angostura","angostura","Sinaloa","MX-SIN",["La Reforma","Gato de Lara","Alhuey","Costa Azul","Chinitos"]),

 # ========== CHIHUAHUA (7) ==========
 ("Cuauhtémoc","cuauhtemoc-chihuahua","Chihuahua","MX-CHH",["Anáhuac","Álvaro Obregón","Colonia Obregón","Bachíniva","Carichí"]),
 ("Hidalgo del Parral","hidalgo-del-parral","Chihuahua","MX-CHH",["San Francisco del Oro","Santa Bárbara","Villa Matamoros","Allende","San Andrés"]),
 ("Nuevo Casas Grandes","nuevo-casas-grandes","Chihuahua","MX-CHH",["Casas Grandes","Mata Ortiz","Janos","Galeana","Buenaventura"]),
 ("Camargo","camargo-chihuahua","Chihuahua","MX-CHH",["La Cruz","Saucillo","Conchos","San Francisco","La Boquilla"]),
 ("Jiménez","jimenez-chihuahua","Chihuahua","MX-CHH",["Coyame","Allende","La Sauceda","San Pedro","Reforma"]),
 ("Madera","madera-chihuahua","Chihuahua","MX-CHH",["Temósachic","Gómez Farías","Ignacio Zaragoza","Maderal","Largo Maderal"]),
 ("Meoqui","meoqui","Chihuahua","MX-CHH",["Lázaro Cárdenas","Las Varas","Estación Consuelo","San Pablo","La Cruz"]),

 # ========== SONORA (4) ==========
 ("Agua Prieta","agua-prieta","Sonora","MX-SON",["Pueblo Nuevo","Las Misiones","Loma Linda","Pueblo Yaqui","San Roberto"]),
 ("Caborca","caborca","Sonora","MX-SON",["Pitiquito","Sáric","Altar","Trincheras","Sonoyta"]),
 ("Puerto Peñasco","puerto-penasco","Sonora","MX-SON",["Las Conchas","Sandy Beach","Cholla Bay","Las Palomas","Mariano Matamoros"]),
 ("Empalme","empalme","Sonora","MX-SON",["Bahía de Lobos","Cócorit","Pueblo Yaqui","La Atravesada","Estación Don"]),

 # ========== QUINTANA ROO (7) ==========
 ("Cozumel","cozumel","Quintana Roo","MX-ROO",["San Miguel","El Cedral","Punta Sur","Adolfo López Mateos","Andrés Q. Roo"]),
 ("Tulum","tulum","Quintana Roo","MX-ROO",["Akumal","Aldea Zama","Coba","Chemuyil","Macario Gómez"]),
 ("Bacalar","bacalar","Quintana Roo","MX-ROO",["Buenavista","Pedro Antonio Santos","Reforma","Xul-Ha","Aarón Merino"]),
 ("Felipe Carrillo Puerto","felipe-carrillo-puerto","Quintana Roo","MX-ROO",["Tihosuco","Chunhuhub","Polyuc","Señor","Chumpón"]),
 ("Isla Mujeres","isla-mujeres","Quintana Roo","MX-ROO",["Centro","Playa Norte","Garrafón","Sac Bajo","Punta Sam"]),
 ("Akumal","akumal","Quintana Roo","MX-ROO",["Akumal Pueblo","Half Moon Bay","Aventuras Akumal","Yal Ku","Jade Bay"]),
 ("Puerto Aventuras","puerto-aventuras","Quintana Roo","MX-ROO",["Marina","Xpu-Ha","Kantenah","Bahía Príncipe","Chemuyil"]),

 # ========== NAYARIT (9) ==========
 ("Bahía de Banderas","bahia-de-banderas","Nayarit","MX-NAY",["Nuevo Vallarta","Bucerías","La Cruz de Huanacaxtle","Sayulita","San Pancho"]),
 ("Xalisco","xalisco","Nayarit","MX-NAY",["Trapichillo","Aquiles Serdán","Pantanal","San Cayetano","Testerazo"]),
 ("Compostela","compostela","Nayarit","MX-NAY",["Las Varas","Zacualpan","La Peñita","Mazatán","El Refilión"]),
 ("Tuxpan","tuxpan-nayarit","Nayarit","MX-NAY",["Pimientillo","San Vicente","Sentispac","Mexcaltitán","Aután"]),
 ("Ixtlán del Río","ixtlan-del-rio","Nayarit","MX-NAY",["Mexpan","San Juanito","Coapan","Uzeta","Santa María del Oro"]),
 ("Santiago Ixcuintla","santiago-ixcuintla","Nayarit","MX-NAY",["Villa Hidalgo","Sentispac","La Presa","San Cayetano","Pozo de Ibarra"]),
 ("San Blas","san-blas","Nayarit","MX-NAY",["Aticama","Santa Cruz","Guadalupe Victoria","Mecatán","La Bajada"]),
 ("Acaponeta","acaponeta","Nayarit","MX-NAY",["Tecuala","San Felipe Aztatán","Quimichis","San Diego","San Dieguito"]),
 ("Ahuacatlán","ahuacatlan","Nayarit","MX-NAY",["Heriberto Jara","Marquesado","Tetitlán","Uzeta","Coapan"]),

 # ========== TABASCO (10) ==========
 ("Villahermosa","villahermosa","Tabasco","MX-TAB",["Atasta","Tamulté","La Manga","Casa Blanca","Plaza Villahermosa"]),
 ("Cárdenas","cardenas-tabasco","Tabasco","MX-TAB",["Coronel Traconis","Río Seco","Independencia","Sánchez Magallanes","Carlos Greene"]),
 ("Comalcalco","comalcalco","Tabasco","MX-TAB",["Tecolutla","Tecoluta","Ranchería Norte","La Curva","Carlos A. Madrazo"]),
 ("Macuspana","macuspana","Tabasco","MX-TAB",["Belén","Benito Juárez","Tepetitán","Ciudad Pemex","Aquiles Serdán"]),
 ("Huimanguillo","huimanguillo","Tabasco","MX-TAB",["Mezcalapa","La Venta","Francisco Rueda","Blasillo","Chontalpa"]),
 ("Paraíso","paraiso","Tabasco","MX-TAB",["Puerto Ceiba","Chiltepec","Quintín Arauz","El Limón","Tabasco Nuevo"]),
 ("Tenosique","tenosique","Tabasco","MX-TAB",["El Triunfo","Estapilla","Sueños de Oro","Boca del Cerro","San Carlos"]),
 ("Teapa","teapa","Tabasco","MX-TAB",["Jalapa","Tacotalpa","Santa Lucía","San Felipe","Hermenegildo Galeana"]),
 ("Centla","centla","Tabasco","MX-TAB",["Frontera","Vicente Guerrero","Tres Brazos","Quintín Arauz","Boca de Panteones"]),
 ("Jalpa de Méndez","jalpa-de-mendez","Tabasco","MX-TAB",["Iquinuapa","Mecoacán","Aquiles Serdán","Soyataco","San Antonio"]),

 # ========== BAJA CALIFORNIA (1) ==========
 ("Tecate","tecate","Baja California","MX-BCN",["Valle de las Palmas","El Hongo","La Rumorosa","Luis Echeverría","La Nopalera"]),

 # ========== BAJA CALIFORNIA SUR (3) ==========
 ("Loreto","loreto-bcs","Baja California Sur","MX-BCS",["Nopoló","Puerto Escondido","San Javier","Ligüí","Juncalito"]),
 ("Ciudad Constitución","ciudad-constitucion","Baja California Sur","MX-BCS",["Villa Insurgentes","Comondú","San Carlos","Loreto","Vizcaíno"]),
 ("Mulegé","mulege","Baja California Sur","MX-BCS",["Santa Rosalía","Heroica Mulegé","Bahía Concepción","San Ignacio","Guerrero Negro"]),
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
    print(f"=== GRUPO 2: {len(CITIES)} ciudades ===")
    ok = skip = err = 0
    for c in CITIES:
        r = gen(*c)
        print(r)
        if "ya existe" in r: skip += 1
        elif "leftover=0" in r and "imgs_ok=True" in r: ok += 1
        else: err += 1
    print(f"\n=== RESUMEN: ok={ok} skip={skip} err={err} ===")
