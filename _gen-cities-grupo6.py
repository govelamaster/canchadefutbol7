#!/usr/bin/env python3
"""Grupo 6: colonias/zonas premium CDMX + Edomex con alta busqueda local.
20 paginas por colonia (no por municipio): B2B premium — escuelas, clubes,
residenciales, oficinas corporativas en zonas plusvalia alta.
"""
import os, re, glob, shutil

SRC = "construccion-de-canchas-de-futbol-en-queretaro"
QZONES = ["Juriquilla", "El Marqués", "Corregidora", "San Juan del Río", "Tequisquiapan"]

CITIES = [
 # ========== CDMX — 12 ZONAS PREMIUM ==========
 ("Polanco","polanco","Ciudad de México","MX-CMX",["Polanco I","Polanco II","Polanco III","Polanco IV","Polanco V"]),
 ("Santa Fe","santa-fe-cdmx","Ciudad de México","MX-CMX",["Centro Comercial Santa Fe","Lomas de Santa Fe","Cruz Manca","Antigua Mina","Pueblo Santa Fe"]),
 ("Roma","roma-cdmx","Ciudad de México","MX-CMX",["Roma Norte","Roma Sur","Hipódromo Condesa","Cuauhtémoc","Doctores"]),
 ("Condesa","condesa","Ciudad de México","MX-CMX",["Hipódromo","Hipódromo Condesa","Roma Norte","Escandón","San Miguel Chapultepec"]),
 ("Lomas de Chapultepec","lomas-de-chapultepec","Ciudad de México","MX-CMX",["Lomas Virreyes","Lomas Hipódromo","Reforma Social","Bosque de Chapultepec","Anzures"]),
 ("Bosques de las Lomas","bosques-de-las-lomas","Ciudad de México","MX-CMX",["Bosque de Ciruelos","Bosque de Pirules","Vista Hermosa","Lomas Vista Hermosa","La Mexicana"]),
 ("Pedregal","pedregal-cdmx","Ciudad de México","MX-CMX",["Jardines del Pedregal","Pedregal de San Ángel","Pedregal de Carrasco","Pedregal de Santa Úrsula","Villa Olímpica"]),
 ("Del Valle","del-valle-cdmx","Ciudad de México","MX-CMX",["Del Valle Norte","Del Valle Centro","Del Valle Sur","Acacias","Narvarte"]),
 ("Narvarte","narvarte","Ciudad de México","MX-CMX",["Narvarte Poniente","Narvarte Oriente","Vértiz Narvarte","Álamos","Letrán Valle"]),
 ("Nápoles","napoles-cdmx","Ciudad de México","MX-CMX",["WTC México","Insurgentes San Borja","Ciudad de los Deportes","Nochebuena","Nápoles"]),
 ("San Ángel","san-angel","Ciudad de México","MX-CMX",["San Ángel Inn","Tlacopac","Chimalistac","Guadalupe Inn","Jardines del Pedregal"]),
 ("Coapa","coapa","Ciudad de México","MX-CMX",["Villa Coapa","Vergel Coapa","Cafetales","Prado Coapa","Ex Hacienda Coapa"]),

 # ========== EDOMEX — 8 ZONAS PREMIUM ==========
 ("Interlomas","interlomas","Estado de México","MX-MEX",["Hacienda de las Palmas","Bosque de las Palmas","Jesús del Monte","Vista Hermosa","Palo Solo"]),
 ("Bosque Real","bosque-real","Estado de México","MX-MEX",["Hacienda de Vallescondido","Lago Esmeralda","Lomas Anáhuac","Real de las Lomas","Bosque Real Country Club"]),
 ("La Herradura","la-herradura","Estado de México","MX-MEX",["La Herradura Sección II","La Herradura Sección III","Lomas Country","Lomas de la Herradura","Cumbres de la Herradura"]),
 ("Tecamachalco","tecamachalco","Estado de México","MX-MEX",["Lomas de Tecamachalco","Fuentes de Tecamachalco","Lomas Reforma","Bosque de Echegaray","Loma Linda"]),
 ("Satélite","satelite","Estado de México","MX-MEX",["Ciudad Satélite","Lomas de Satélite","Plaza Satélite","Satélite Norte","Jardines de Satélite"]),
 ("Lomas Verdes","lomas-verdes","Estado de México","MX-MEX",["Lomas Verdes 1ª Sección","Lomas Verdes 3ª Sección","Lomas Verdes 5ª Sección","Boulevares","Plaza Lomas Verdes"]),
 ("Echegaray","echegaray","Estado de México","MX-MEX",["Bosque de Echegaray","Las Águilas Echegaray","Fracc. Echegaray","Echegaray Sección II","Lomas de Echegaray"]),
 ("Lomas Anáhuac","lomas-anahuac","Estado de México","MX-MEX",["Lomas Anáhuac Country","Bosque de Lomas Anáhuac","Anáhuac Huixquilucan","Lomas del Olivo","Hacienda Anáhuac"]),
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
    print(f"=== GRUPO 6: {len(CITIES)} zonas premium ===")
    ok = skip = err = 0
    for c in CITIES:
        r = gen(*c)
        print(r)
        if "ya existe" in r: skip += 1
        elif "leftover=0" in r and "imgs_ok=True" in r: ok += 1
        else: err += 1
    print(f"\n=== RESUMEN: ok={ok} skip={skip} err={err} ===")
