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
 # ===== GRUPO 2 (hambrientos CPA <$135) =====
 "atizapan-de-zaragoza":"Atizapán de Zaragoza","chimalhuacan":"Chimalhuacán","tultitlan":"Tultitlán","valle-de-chalco":"Valle de Chalco",
 "san-cristobal-de-las-casas":"San Cristóbal de las Casas","palenque":"Palenque","chiapa-de-corzo":"Chiapa de Corzo",
 "villaflores":"Villaflores","tonala-chiapas":"Tonalá","ocosingo":"Ocosingo","cintalapa":"Cintalapa",
 "salina-cruz":"Salina Cruz","juchitan":"Juchitán","tuxtepec":"Tuxtepec","tehuantepec":"Tehuantepec",
 "huajuapan-de-leon":"Huajuapan de León","puerto-escondido":"Puerto Escondido","huatulco":"Huatulco",
 "pinotepa-nacional":"Pinotepa Nacional","pochutla":"Pochutla",
 "manzanillo":"Manzanillo","tecoman":"Tecomán","villa-de-alvarez":"Villa de Álvarez","comala":"Comala",
 "armeria":"Armería","coquimatlan":"Coquimatlán","cuauhtemoc-colima":"Cuauhtémoc",
 "guasave":"Guasave","navolato":"Navolato","guamuchil":"Guamúchil","el-rosario":"El Rosario",
 "el-fuerte":"El Fuerte","escuinapa":"Escuinapa","angostura":"Angostura",
 "cuauhtemoc-chihuahua":"Cuauhtémoc","hidalgo-del-parral":"Hidalgo del Parral","nuevo-casas-grandes":"Nuevo Casas Grandes",
 "camargo-chihuahua":"Camargo","jimenez-chihuahua":"Jiménez","madera-chihuahua":"Madera","meoqui":"Meoqui",
 "agua-prieta":"Agua Prieta","caborca":"Caborca","puerto-penasco":"Puerto Peñasco","empalme":"Empalme",
 "cozumel":"Cozumel","tulum":"Tulum","bacalar":"Bacalar","felipe-carrillo-puerto":"Felipe Carrillo Puerto",
 "isla-mujeres":"Isla Mujeres","akumal":"Akumal","puerto-aventuras":"Puerto Aventuras",
 "bahia-de-banderas":"Bahía de Banderas","xalisco":"Xalisco","compostela":"Compostela","tuxpan-nayarit":"Tuxpan",
 "ixtlan-del-rio":"Ixtlán del Río","santiago-ixcuintla":"Santiago Ixcuintla","san-blas":"San Blas",
 "acaponeta":"Acaponeta","ahuacatlan":"Ahuacatlán",
 "villahermosa":"Villahermosa","cardenas-tabasco":"Cárdenas","comalcalco":"Comalcalco","macuspana":"Macuspana",
 "huimanguillo":"Huimanguillo","paraiso":"Paraíso","tenosique":"Tenosique","teapa":"Teapa","centla":"Centla",
 "jalpa-de-mendez":"Jalpa de Méndez",
 "tecate":"Tecate","loreto-bcs":"Loreto","ciudad-constitucion":"Ciudad Constitución","mulege":"Mulegé",
 # ===== GRUPO 3 (cerrar top10 Jal/NL/Qro) =====
 "tlaquepaque":"Tlaquepaque","tonala-jalisco":"Tonalá","tlajomulco-de-zuniga":"Tlajomulco de Zúñiga",
 "el-salto-jalisco":"El Salto","ocotlan-jalisco":"Ocotlán",
 "general-escobedo":"General Escobedo","juarez-nuevo-leon":"Juárez","garcia-nuevo-leon":"García",
 "cadereyta-jimenez":"Cadereyta Jiménez",
 "san-juan-del-rio":"San Juan del Río","el-marques":"El Marqués","corregidora":"Corregidora",
 "tequisquiapan":"Tequisquiapan","pedro-escobedo":"Pedro Escobedo",
 # ===== GRUPO 4 (top 5 estados secundarios) =====
 "jesus-maria-aguascalientes":"Jesús María","san-francisco-de-los-romo":"San Francisco de los Romo",
 "calvillo":"Calvillo","rincon-de-romos":"Rincón de Romos","pabellon-de-arteaga":"Pabellón de Arteaga",
 "ciudad-victoria":"Ciudad Victoria","rio-bravo":"Río Bravo","el-mante":"El Mante",
 "altamira":"Altamira","ciudad-madero":"Ciudad Madero",
 "valladolid":"Valladolid","progreso":"Progreso","tizimin":"Tizimín","uman":"Umán","kanasin":"Kanasín",
 "ramos-arizpe":"Ramos Arizpe","san-pedro-coahuila":"San Pedro","sabinas":"Sabinas",
 "frontera-coahuila":"Frontera","allende-coahuila":"Allende",
 "gomez-palacio":"Gómez Palacio","lerdo-durango":"Lerdo","cuencame":"Cuencamé",
 "vicente-guerrero-durango":"Vicente Guerrero","nuevo-ideal":"Nuevo Ideal",
 "guanajuato-capital":"Guanajuato","silao":"Silao","san-miguel-de-allende":"San Miguel de Allende",
 "valle-de-santiago":"Valle de Santiago","acambaro":"Acámbaro",
 "acapulco":"Acapulco","iguala":"Iguala","taxco":"Taxco","zihuatanejo":"Zihuatanejo","tlapa":"Tlapa",
 "cuernavaca":"Cuernavaca","jiutepec":"Jiutepec","temixco":"Temixco","yautepec":"Yautepec","tepoztlan":"Tepoztlán",
 "campeche-capital":"Campeche","champoton":"Champotón","escarcega":"Escárcega","calkini":"Calkiní","hopelchen":"Hopelchén",
 "tlaxcala-capital":"Tlaxcala","apizaco":"Apizaco","huamantla":"Huamantla","chiautempan":"Chiautempan","zacatelco":"Zacatelco",
 # ===== GRUPO 5 (ZMVM — CDMX alcaldias + Edomex restantes) =====
 "iztapalapa":"Iztapalapa","gustavo-a-madero":"Gustavo A. Madero","tlalpan":"Tlalpan","coyoacan":"Coyoacán",
 "alvaro-obregon-cdmx":"Álvaro Obregón","cuauhtemoc-cdmx":"Cuauhtémoc","iztacalco":"Iztacalco",
 "magdalena-contreras":"Magdalena Contreras","milpa-alta":"Milpa Alta","tlahuac":"Tláhuac",
 "venustiano-carranza-cdmx":"Venustiano Carranza","azcapotzalco":"Azcapotzalco","xochimilco":"Xochimilco",
 "benito-juarez-cdmx":"Benito Juárez","miguel-hidalgo-cdmx":"Miguel Hidalgo","cuajimalpa":"Cuajimalpa",
 "tecamac":"Tecámac","coacalco":"Coacalco","huixquilucan":"Huixquilucan","metepec-edomex":"Metepec",
 "zinacantepec":"Zinacantepec","valle-de-bravo":"Valle de Bravo","la-paz-edomex":"La Paz",
 "texcoco":"Texcoco","nicolas-romero":"Nicolás Romero","acolman":"Acolman",
 "tepotzotlan-edomex":"Tepotzotlán","tultepec":"Tultepec","zumpango":"Zumpango",
 # ===== GRUPO 6 (zonas premium CDMX + Edomex) =====
 "polanco":"Polanco","santa-fe-cdmx":"Santa Fe","roma-cdmx":"Roma","condesa":"Condesa",
 "lomas-de-chapultepec":"Lomas de Chapultepec","bosques-de-las-lomas":"Bosques de las Lomas",
 "pedregal-cdmx":"Pedregal","del-valle-cdmx":"Del Valle","narvarte":"Narvarte",
 "napoles-cdmx":"Nápoles","san-angel":"San Ángel","coapa":"Coapa",
 "interlomas":"Interlomas","bosque-real":"Bosque Real","la-herradura":"La Herradura",
 "tecamachalco":"Tecamachalco","satelite":"Satélite","lomas-verdes":"Lomas Verdes",
 "echegaray":"Echegaray","lomas-anahuac":"Lomas Anáhuac",
 # ===== GRUPO 7 (zonas tipo Esmeralda + corredores CDMX) =====
 "zona-esmeralda":"Zona Esmeralda","hacienda-de-valle-escondido":"Hacienda de Valle Escondido",
 "hacienda-del-pedregal":"Hacienda del Pedregal","calacoaya":"Calacoaya","lago-de-guadalupe":"Lago de Guadalupe",
 "boulevares":"Boulevares","ciudad-brisa":"Ciudad Brisa","lomas-country":"Lomas Country",
 "hacienda-de-las-palmas":"Hacienda de las Palmas","real-hacienda":"Real Hacienda",
 "anahuac-cdmx":"Anáhuac","granada-cdmx":"Granada","lindavista":"Lindavista",
 "san-jeronimo-cdmx":"San Jerónimo","acoxpa":"Acoxpa","centro-historico-cdmx":"Centro Histórico",
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
 # ===== GRUPO 2 regiones =====
 "atizapan-de-zaragoza":"centro","chimalhuacan":"centro","tultitlan":"centro","valle-de-chalco":"centro",
 "san-cristobal-de-las-casas":"sureste","palenque":"sureste","chiapa-de-corzo":"sureste","villaflores":"sureste",
 "tonala-chiapas":"sureste","ocosingo":"sureste","cintalapa":"sureste",
 "salina-cruz":"golfo","juchitan":"golfo","tuxtepec":"golfo","tehuantepec":"golfo","huajuapan-de-leon":"golfo",
 "puerto-escondido":"golfo","huatulco":"golfo","pinotepa-nacional":"golfo","pochutla":"golfo",
 "manzanillo":"occidente","tecoman":"occidente","villa-de-alvarez":"occidente","comala":"occidente",
 "armeria":"occidente","coquimatlan":"occidente","cuauhtemoc-colima":"occidente",
 "guasave":"noroeste","navolato":"noroeste","guamuchil":"noroeste","el-rosario":"noroeste",
 "el-fuerte":"noroeste","escuinapa":"noroeste","angostura":"noroeste",
 "cuauhtemoc-chihuahua":"noroeste","hidalgo-del-parral":"noroeste","nuevo-casas-grandes":"noroeste",
 "camargo-chihuahua":"noroeste","jimenez-chihuahua":"noroeste","madera-chihuahua":"noroeste","meoqui":"noroeste",
 "agua-prieta":"noroeste","caborca":"noroeste","puerto-penasco":"noroeste","empalme":"noroeste",
 "cozumel":"sureste","tulum":"sureste","bacalar":"sureste","felipe-carrillo-puerto":"sureste",
 "isla-mujeres":"sureste","akumal":"sureste","puerto-aventuras":"sureste",
 "bahia-de-banderas":"occidente","xalisco":"occidente","compostela":"occidente","tuxpan-nayarit":"occidente",
 "ixtlan-del-rio":"occidente","santiago-ixcuintla":"occidente","san-blas":"occidente",
 "acaponeta":"occidente","ahuacatlan":"occidente",
 "villahermosa":"sureste","cardenas-tabasco":"sureste","comalcalco":"sureste","macuspana":"sureste",
 "huimanguillo":"sureste","paraiso":"sureste","tenosique":"sureste","teapa":"sureste","centla":"sureste","jalpa-de-mendez":"sureste",
 "tecate":"noroeste","loreto-bcs":"noroeste","ciudad-constitucion":"noroeste","mulege":"noroeste",
 # ===== GRUPO 3 regiones =====
 "tlaquepaque":"occidente","tonala-jalisco":"occidente","tlajomulco-de-zuniga":"occidente",
 "el-salto-jalisco":"occidente","ocotlan-jalisco":"occidente",
 "general-escobedo":"noreste","juarez-nuevo-leon":"noreste","garcia-nuevo-leon":"noreste","cadereyta-jimenez":"noreste",
 "san-juan-del-rio":"centro","el-marques":"centro","corregidora":"centro",
 "tequisquiapan":"centro","pedro-escobedo":"centro",
 # ===== GRUPO 4 regiones =====
 "jesus-maria-aguascalientes":"bajio","san-francisco-de-los-romo":"bajio","calvillo":"bajio",
 "rincon-de-romos":"bajio","pabellon-de-arteaga":"bajio",
 "ciudad-victoria":"noreste","rio-bravo":"noreste","el-mante":"noreste","altamira":"noreste","ciudad-madero":"noreste",
 "valladolid":"sureste","progreso":"sureste","tizimin":"sureste","uman":"sureste","kanasin":"sureste",
 "ramos-arizpe":"noreste","san-pedro-coahuila":"noreste","sabinas":"noreste",
 "frontera-coahuila":"noreste","allende-coahuila":"noreste",
 "gomez-palacio":"noreste","lerdo-durango":"noreste","cuencame":"noreste",
 "vicente-guerrero-durango":"noreste","nuevo-ideal":"noreste",
 "guanajuato-capital":"bajio","silao":"bajio","san-miguel-de-allende":"bajio",
 "valle-de-santiago":"bajio","acambaro":"bajio",
 "acapulco":"centro","iguala":"centro","taxco":"centro","zihuatanejo":"occidente","tlapa":"centro",
 "cuernavaca":"centro","jiutepec":"centro","temixco":"centro","yautepec":"centro","tepoztlan":"centro",
 "campeche-capital":"sureste","champoton":"sureste","escarcega":"sureste","calkini":"sureste","hopelchen":"sureste",
 "tlaxcala-capital":"centro","apizaco":"centro","huamantla":"centro","chiautempan":"centro","zacatelco":"centro",
 # ===== GRUPO 5 regiones (todo ZMVM = centro) =====
 "iztapalapa":"centro","gustavo-a-madero":"centro","tlalpan":"centro","coyoacan":"centro",
 "alvaro-obregon-cdmx":"centro","cuauhtemoc-cdmx":"centro","iztacalco":"centro","magdalena-contreras":"centro",
 "milpa-alta":"centro","tlahuac":"centro","venustiano-carranza-cdmx":"centro","azcapotzalco":"centro",
 "xochimilco":"centro","benito-juarez-cdmx":"centro","miguel-hidalgo-cdmx":"centro","cuajimalpa":"centro",
 "tecamac":"centro","coacalco":"centro","huixquilucan":"centro","metepec-edomex":"centro",
 "zinacantepec":"centro","valle-de-bravo":"centro","la-paz-edomex":"centro","texcoco":"centro",
 "nicolas-romero":"centro","acolman":"centro","tepotzotlan-edomex":"centro","tultepec":"centro","zumpango":"centro",
 # ===== GRUPO 6 regiones (todo centro/ZMVM) =====
 "polanco":"centro","santa-fe-cdmx":"centro","roma-cdmx":"centro","condesa":"centro",
 "lomas-de-chapultepec":"centro","bosques-de-las-lomas":"centro","pedregal-cdmx":"centro",
 "del-valle-cdmx":"centro","narvarte":"centro","napoles-cdmx":"centro","san-angel":"centro","coapa":"centro",
 "interlomas":"centro","bosque-real":"centro","la-herradura":"centro","tecamachalco":"centro",
 "satelite":"centro","lomas-verdes":"centro","echegaray":"centro","lomas-anahuac":"centro",
 # ===== GRUPO 7 regiones =====
 "zona-esmeralda":"centro","hacienda-de-valle-escondido":"centro","hacienda-del-pedregal":"centro",
 "calacoaya":"centro","lago-de-guadalupe":"centro","boulevares":"centro","ciudad-brisa":"centro",
 "lomas-country":"centro","hacienda-de-las-palmas":"centro","real-hacienda":"centro",
 "anahuac-cdmx":"centro","granada-cdmx":"centro","lindavista":"centro",
 "san-jeronimo-cdmx":"centro","acoxpa":"centro","centro-historico-cdmx":"centro",
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
