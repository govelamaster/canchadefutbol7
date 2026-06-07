#!/usr/bin/env python3
"""Grupo 4: cobertura nacional completa — top 5 de 10 estados secundarios.
50 ciudades: Ags, Tam, Yuc, Coah, Dgo, Gto, Gro, Mor, Camp, Tlax.
"""
import os, re, glob, shutil

SRC = "construccion-de-canchas-de-futbol-en-queretaro"
QZONES = ["Juriquilla", "El Marqués", "Corregidora", "San Juan del Río", "Tequisquiapan"]

CITIES = [
 # ========== AGUASCALIENTES (5) ==========
 ("Jesús María","jesus-maria-aguascalientes","Aguascalientes","MX-AGU",["Margaritas","El Llano","Soledad","La Tomatina","San Antonio"]),
 ("San Francisco de los Romo","san-francisco-de-los-romo","Aguascalientes","MX-AGU",["Las Trojes","Centro","El Llano","Cumbres","La Escondida"]),
 ("Calvillo","calvillo","Aguascalientes","MX-AGU",["Malpaso","Ojocaliente","La Labor","El Salitre","Tepetate"]),
 ("Rincón de Romos","rincon-de-romos","Aguascalientes","MX-AGU",["Pabellón de Hidalgo","Escaleras","San Jacinto","La Guayana","Las Pilas"]),
 ("Pabellón de Arteaga","pabellon-de-arteaga","Aguascalientes","MX-AGU",["Santiago","San Luis","Las Ánimas","Centro","La Loma"]),

 # ========== TAMAULIPAS (5) ==========
 ("Ciudad Victoria","ciudad-victoria","Tamaulipas","MX-TAM",["Libertad","Tamatán","Hidalgo","Las Palmas","Las Flores"]),
 ("Río Bravo","rio-bravo","Tamaulipas","MX-TAM",["Valle Hermoso","Anáhuac","Las Cumbres","La Esperanza","Industrial"]),
 ("El Mante","el-mante","Tamaulipas","MX-TAM",["Xicoténcatl","Antiguo Morelos","Nuevo Morelos","Tampico Alto","Ciudad Mante"]),
 ("Altamira","altamira","Tamaulipas","MX-TAM",["Miramar","Esfuerzo Nacional","Cuauhtémoc","Aldama","Esmeralda"]),
 ("Ciudad Madero","ciudad-madero","Tamaulipas","MX-TAM",["Miramar","Talleres","Fovissste","Universidad","Loma del Real"]),

 # ========== YUCATÁN (5) ==========
 ("Valladolid","valladolid","Yucatán","MX-YUC",["Sisbichén","Tikuch","Popolá","Yalcobá","Xocén"]),
 ("Progreso","progreso","Yucatán","MX-YUC",["Chicxulub Puerto","Chelem","Chuburná Puerto","San Ignacio","Yucalpetén"]),
 ("Tizimín","tizimin","Yucatán","MX-YUC",["Sucopó","Yaxcabá","Dzonot Carretero","San Juan","La Cruz"]),
 ("Umán","uman","Yucatán","MX-YUC",["Bolón","Hunucmá","Poxilá","San Pedro Chimay","San Antonio Tehuitz"]),
 ("Kanasín","kanasin","Yucatán","MX-YUC",["San Antonio Cucul","San José Tzal","Aké","Chichí Suárez","Las Américas"]),

 # ========== COAHUILA (5) ==========
 ("Ramos Arizpe","ramos-arizpe","Coahuila","MX-COA",["Centro","Analco","Anáhuac","Sierra Encantada","Industrial"]),
 ("San Pedro","san-pedro-coahuila","Coahuila","MX-COA",["Concordia","Luchana","Cuauhtémoc","San Carlos","Hidalgo"]),
 ("Sabinas","sabinas","Coahuila","MX-COA",["Nueva Rosita","Múzquiz","Cloete","San José","Las Esperanzas"]),
 ("Frontera","frontera-coahuila","Coahuila","MX-COA",["San Buenaventura","Estancia","Industrial","Centro","Lomas del Roble"]),
 ("Allende","allende-coahuila","Coahuila","MX-COA",["Morelos","Nava","Villa Unión","Zaragoza","Hidalgo"]),

 # ========== DURANGO (5) ==========
 ("Gómez Palacio","gomez-palacio","Durango","MX-DUR",["Bermejillo","La Loma","Filadelfia","Tlahualilo","Dinamita"]),
 ("Lerdo","lerdo-durango","Durango","MX-DUR",["Ciudad Lerdo","León Guzmán","Juan Eugenio","Villa Juárez","Picardías"]),
 ("Cuencamé","cuencame","Durango","MX-DUR",["Pasaje","Velardeña","Cinco de Mayo","Santa Clara","San Andrés"]),
 ("Vicente Guerrero","vicente-guerrero-durango","Durango","MX-DUR",["Sebastián Lerdo","Suchil","San Bartolo","Mezquital","El Pajarito"]),
 ("Nuevo Ideal","nuevo-ideal","Durango","MX-DUR",["Coyotes","La Loma","Las Vegas","San Antonio","Las Margaritas"]),

 # ========== GUANAJUATO (5) ==========
 ("Guanajuato","guanajuato-capital","Guanajuato","MX-GUA",["Marfil","Yerbabuena","La Sauceda","Cervera","Pozuelos"]),
 ("Silao","silao","Guanajuato","MX-GUA",["Romita","Bajío","Aeropuerto","Trejo","San Diego de la Unión"]),
 ("San Miguel de Allende","san-miguel-de-allende","Guanajuato","MX-GUA",["Atotonilco","Los Frailes","San Antonio","La Aurora","Allende"]),
 ("Valle de Santiago","valle-de-santiago","Guanajuato","MX-GUA",["Charco de Pantoja","San José Llanos","Magdalena","San Antonio","La Calera"]),
 ("Acámbaro","acambaro","Guanajuato","MX-GUA",["Iramuco","Parácuaro","Casacuarán","Chamácuaro","Tarandacuao"]),

 # ========== GUERRERO (5) ==========
 ("Acapulco","acapulco","Guerrero","MX-GRO",["Diamante","Costa Azul","Pie de la Cuesta","La Sabana","Renacimiento"]),
 ("Iguala","iguala","Guerrero","MX-GRO",["Cocula","Tepecoacuilco","Buenavista","Apipilulco","Tomatal"]),
 ("Taxco","taxco","Guerrero","MX-GRO",["Tehuilotepec","Acamixtla","Cacalotenango","Coxcatlán","Casahuates"]),
 ("Zihuatanejo","zihuatanejo","Guerrero","MX-GRO",["Ixtapa","La Madera","Las Gatas","Coacoyul","Pantla"]),
 ("Tlapa","tlapa","Guerrero","MX-GRO",["Comachuén","Atlamajalcingo","Alcozauca","Xalpatláhuac","Cualac"]),

 # ========== MORELOS (5) ==========
 ("Cuernavaca","cuernavaca","Morelos","MX-MOR",["Lomas de Cortés","Vista Hermosa","Tlaltenango","Buenavista","Acapantzingo"]),
 ("Jiutepec","jiutepec","Morelos","MX-MOR",["Civac","Tejalpa","El Paraíso","La Joya","Cliserio Alanís"]),
 ("Temixco","temixco","Morelos","MX-MOR",["Acatlipa","Lomas del Carril","Las Rosas","Pueblo Viejo","Loma Bonita"]),
 ("Yautepec","yautepec","Morelos","MX-MOR",["Oacalco","Cocoyoc","Itzamatitlán","Xochitepec","Anenecuilco"]),
 ("Tepoztlán","tepoztlan","Morelos","MX-MOR",["Amatlán","San Andrés","Santa Catarina","San Juan Tlacotenco","Ixcatepec"]),

 # ========== CAMPECHE (5) ==========
 ("Campeche","campeche-capital","Campeche","MX-CAM",["San Francisco","Lerma","Samulá","Kalá","Chiná"]),
 ("Champotón","champoton","Campeche","MX-CAM",["Sihochac","Ulumal","Seybaplaya","Felipe Carrillo Puerto","San Luis Carpizo"]),
 ("Escárcega","escarcega","Campeche","MX-CAM",["Mamantel","Constitución","División del Norte","Centenario","Silvituc"]),
 ("Calkiní","calkini","Campeche","MX-CAM",["Bécal","Nunkiní","Tankuché","Dzitbalché","Santa Cruz"]),
 ("Hopelchén","hopelchen","Campeche","MX-CAM",["Bolonchén","Dzibalchén","Iturbide","Chenkó","Crucero"]),

 # ========== TLAXCALA (5) ==========
 ("Tlaxcala","tlaxcala-capital","Tlaxcala","MX-TLA",["Ocotlán","Tizatlán","San Esteban","La Trinidad","Centro"]),
 ("Apizaco","apizaco","Tlaxcala","MX-TLA",["Santa Anita","La Loma","Loma Florida","Cuauhtémoc","Cuautlapan"]),
 ("Huamantla","huamantla","Tlaxcala","MX-TLA",["Ixtenco","Cuapiaxtla","Altzayanca","Terrenate","San Lucas"]),
 ("Chiautempan","chiautempan","Tlaxcala","MX-TLA",["Contla","San Pedro Muñoztla","Santa Cruz","San Bartolomé","Texcalac"]),
 ("Zacatelco","zacatelco","Tlaxcala","MX-TLA",["Tepeyanco","Xicohtzinco","Tetlanohcan","San Pablo del Monte","Acuamanala"]),
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
    print(f"=== GRUPO 4: {len(CITIES)} ciudades ===")
    ok = skip = err = 0
    for c in CITIES:
        r = gen(*c)
        print(r)
        if "ya existe" in r: skip += 1
        elif "leftover=0" in r and "imgs_ok=True" in r: ok += 1
        else: err += 1
    print(f"\n=== RESUMEN: ok={ok} skip={skip} err={err} ===")
