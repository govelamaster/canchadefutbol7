#!/usr/bin/env python3
"""Grupo 5: zona metropolitana Valle de Mexico (CDMX + Edomex restantes).
29 ciudades: 16 alcaldias CDMX + 13 municipios mexiquenses faltantes.
Esto cierra la cobertura urbana mas densa del pais.
"""
import os, re, glob, shutil

SRC = "construccion-de-canchas-de-futbol-en-queretaro"
QZONES = ["Juriquilla", "El Marqués", "Corregidora", "San Juan del Río", "Tequisquiapan"]

CITIES = [
 # ========== CDMX — 16 ALCALDÍAS ==========
 ("Iztapalapa","iztapalapa","Ciudad de México","MX-CMX",["Cerro de la Estrella","Santa Cruz Meyehualco","San Lorenzo Tezonco","Ermita Zaragoza","Lomas de la Estancia"]),
 ("Gustavo A. Madero","gustavo-a-madero","Ciudad de México","MX-CMX",["La Villa","Lindavista","Cuautepec","Aragón","Tepeyac"]),
 ("Tlalpan","tlalpan","Ciudad de México","MX-CMX",["Centro de Tlalpan","Pedregal de San Nicolás","Topilejo","Ajusco","Xicalco"]),
 ("Coyoacán","coyoacan","Ciudad de México","MX-CMX",["Del Carmen","Pedregal de Santo Domingo","Ciudad Universitaria","Los Reyes","Culhuacán"]),
 ("Álvaro Obregón","alvaro-obregon-cdmx","Ciudad de México","MX-CMX",["San Ángel","Las Águilas","Olivar de los Padres","Santa Fe","Lomas de Tarango"]),
 ("Cuauhtémoc","cuauhtemoc-cdmx","Ciudad de México","MX-CMX",["Roma","Condesa","Doctores","Buenavista","Guerrero"]),
 ("Iztacalco","iztacalco","Ciudad de México","MX-CMX",["Agrícola Oriental","Granjas México","Viaducto Piedad","La Cruz","Reforma Iztaccíhuatl"]),
 ("Magdalena Contreras","magdalena-contreras","Ciudad de México","MX-CMX",["San Jerónimo","La Magdalena","Tierra Colorada","San Nicolás Totolapan","Las Cruces"]),
 ("Milpa Alta","milpa-alta","Ciudad de México","MX-CMX",["Villa Milpa Alta","San Pedro Atocpan","San Pablo Oztotepec","San Antonio Tecómitl","San Lorenzo Tlacoyucan"]),
 ("Tláhuac","tlahuac","Ciudad de México","MX-CMX",["San Pedro Tláhuac","Santa Catarina Yecahuizotl","San Andrés Mixquic","San Juan Ixtayopan","Zapotitlán"]),
 ("Venustiano Carranza","venustiano-carranza-cdmx","Ciudad de México","MX-CMX",["Jamaica","Moctezuma","Pensador Mexicano","Aviación Civil","Romero Rubio"]),
 ("Azcapotzalco","azcapotzalco","Ciudad de México","MX-CMX",["San Pedro Xalpa","Clavería","Reynosa Tamaulipas","Pasteros","Santiago Ahuizotla"]),
 ("Xochimilco","xochimilco","Ciudad de México","MX-CMX",["Centro de Xochimilco","San Gregorio Atlapulco","Tepepan","San Luis Tlaxialtemalco","Nativitas"]),
 ("Benito Juárez","benito-juarez-cdmx","Ciudad de México","MX-CMX",["Del Valle","Narvarte","Nápoles","Portales","Mixcoac"]),
 ("Miguel Hidalgo","miguel-hidalgo-cdmx","Ciudad de México","MX-CMX",["Polanco","Lomas de Chapultepec","Tacubaya","San Miguel Chapultepec","Anáhuac"]),
 ("Cuajimalpa","cuajimalpa","Ciudad de México","MX-CMX",["Santa Fe","San Pedro Cuajimalpa","San Mateo Tlaltenango","Contadero","Manzanastitla"]),

 # ========== ESTADO DE MÉXICO — 13 MUNICIPIOS ZMVM FALTANTES ==========
 ("Tecámac","tecamac","Estado de México","MX-MEX",["Ojo de Agua","Los Héroes Tecámac","Santo Domingo","Ozumbilla","San Pedro Atzompa"]),
 ("Coacalco","coacalco","Estado de México","MX-MEX",["Villa de las Flores","Héroes Coacalco","San Lorenzo Tlalmimilolpan","Cocem","Misiones I"]),
 ("Huixquilucan","huixquilucan","Estado de México","MX-MEX",["Interlomas","Bosque Real","La Herradura","San Fernando","Santa Cruz"]),
 ("Metepec","metepec-edomex","Estado de México","MX-MEX",["San Jerónimo Chicahualco","San Salvador Tizatlalli","Pilares","Casa Blanca","La Pilita"]),
 ("Zinacantepec","zinacantepec","Estado de México","MX-MEX",["San Antonio Acahualco","San Luis Mextepec","Santa María del Monte","Loma Alta","San Cristóbal"]),
 ("Valle de Bravo","valle-de-bravo","Estado de México","MX-MEX",["Avándaro","San Gaspar","La Peña","Colorines","El Arco"]),
 ("La Paz","la-paz-edomex","Estado de México","MX-MEX",["Los Reyes","San Sebastián","San Isidro","Magdalena Atlicpac","Tepozanes"]),
 ("Texcoco","texcoco","Estado de México","MX-MEX",["San Bernardino","San Diego","Santa María Tulantongo","San Felipe","Lomas de San Esteban"]),
 ("Nicolás Romero","nicolas-romero","Estado de México","MX-MEX",["Cahuacán","Transfiguración","La Colmena","Veintidós de Febrero","Magú"]),
 ("Acolman","acolman","Estado de México","MX-MEX",["San Marcos Nepantla","San Pedro Tepetitlán","Santa Catarina","Tepexpan","Cuanalán"]),
 ("Tepotzotlán","tepotzotlan-edomex","Estado de México","MX-MEX",["San Mateo Xoloc","Cañada de Cisneros","Santa Cruz","San Miguel","Lanzarote"]),
 ("Tultepec","tultepec","Estado de México","MX-MEX",["Xahuento","San Pablo de las Salinas","La Concepción","San Antonio Xahuento","Loma Bonita"]),
 ("Zumpango","zumpango","Estado de México","MX-MEX",["San Sebastián","Buenavista","Santiago Cuautlalpan","San Bartolo Cuautlalpan","Reyes Acozac"]),
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
    print(f"=== GRUPO 5: {len(CITIES)} ciudades ===")
    ok = skip = err = 0
    for c in CITIES:
        r = gen(*c)
        print(r)
        if "ya existe" in r: skip += 1
        elif "leftover=0" in r and "imgs_ok=True" in r: ok += 1
        else: err += 1
    print(f"\n=== RESUMEN: ok={ok} skip={skip} err={err} ===")
