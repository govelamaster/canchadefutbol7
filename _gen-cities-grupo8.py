#!/usr/bin/env python3
"""Grupo 8: cierra pendientes que Olga pidio - zonas CDMX/Edomex faltantes
+ corredores comerciales B2B (Reforma, Insurgentes, Periferico, etc.).
16 paginas.
"""
import os, re, glob, shutil

SRC = "construccion-de-canchas-de-futbol-en-queretaro"
QZONES = ["Juriquilla", "El Marqués", "Corregidora", "San Juan del Río", "Tequisquiapan"]

CITIES = [
 # ========== EDOMEX/CDMX ZONAS FALTANTES (10) ==========
 ("Cumbres","cumbres-naucalpan","Estado de México","MX-MEX",["Cumbres de Santa Fe","Lomas de las Cumbres","Cumbres Naucalpan","Cumbres del Vergel","Cumbres Country"]),
 ("Las Águilas","las-aguilas-naucalpan","Estado de México","MX-MEX",["Las Águilas Sección II","Las Águilas Sección III","Águilas Pilares","Águilas Echegaray","San Bartolo Naucalpan"]),
 ("Olivar de los Padres","olivar-de-los-padres","Ciudad de México","MX-CMX",["Olivar del Conde","Tarango","Cove","Las Águilas","Tepeaca"]),
 ("Vista Hermosa","vista-hermosa-cuajimalpa","Ciudad de México","MX-CMX",["Vista Hermosa Cuajimalpa","Lomas de Vista Hermosa","Loma del Padre","San José de los Cedros","Memetla"]),
 ("Huehuetoca","huehuetoca","Estado de México","MX-MEX",["Santa María","Salitrillo","Bo. de Cantera","Estación Huehuetoca","El Cerro"]),
 ("Doctores","doctores-cdmx","Ciudad de México","MX-CMX",["Buenos Aires","Tránsito","Esperanza","Asturias","Algarín"]),
 ("Escandón","escandon","Ciudad de México","MX-CMX",["Escandón I","Escandón II","Tacubaya","San Pedro de los Pinos","Daniel Garza"]),
 ("Mixcoac","mixcoac","Ciudad de México","MX-CMX",["San Juan Mixcoac","Insurgentes Mixcoac","Crédito Constructor","Florida","Guadalupe Inn"]),
 ("Pedregal de Santa Úrsula","pedregal-de-santa-ursula","Ciudad de México","MX-CMX",["Santa Úrsula Xitla","Pedregal de Santo Domingo","San Andrés Totoltepec","Cuautepec","Padierna"]),
 ("Aragón","aragon-cdmx","Ciudad de México","MX-CMX",["Bosques de Aragón","Aragón La Villa","Aragón Inguarán","Aragón Plaza","Cuchilla de Aragón"]),

 # ========== CORREDORES COMERCIALES B2B (6) ==========
 ("Reforma","reforma-cdmx","Ciudad de México","MX-CMX",["Paseo de la Reforma","Reforma 222","Torre Mayor","Glorieta de Insurgentes","Ángel de la Independencia"]),
 ("Insurgentes","insurgentes-cdmx","Ciudad de México","MX-CMX",["Insurgentes Centro","Insurgentes Norte","Roma Norte","Hipódromo Condesa","Glorieta Insurgentes"]),
 ("Insurgentes Sur","insurgentes-sur","Ciudad de México","MX-CMX",["Insurgentes Mixcoac","Insurgentes San Borja","WTC México","Ciudad de los Deportes","Nochebuena"]),
 ("Periférico","periferico-cdmx","Ciudad de México","MX-CMX",["Periférico Sur","Periférico Norte","Santa Fe","Pedregal","Las Águilas"]),
 ("Viaducto","viaducto-cdmx","Ciudad de México","MX-CMX",["Viaducto Piedad","Viaducto Tlalpan","Mixcoac","Doctores","Granjas México"]),
 ("Eje Central","eje-central","Ciudad de México","MX-CMX",["Eje Central Lázaro Cárdenas","Centro Histórico","Doctores","Buenavista","Bellas Artes"]),
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
    print(f"=== GRUPO 8: {len(CITIES)} pendientes ===")
    ok = skip = err = 0
    for c in CITIES:
        r = gen(*c)
        print(r)
        if "ya existe" in r: skip += 1
        elif "leftover=0" in r and "imgs_ok=True" in r: ok += 1
        else: err += 1
    print(f"\n=== RESUMEN: ok={ok} skip={skip} err={err} ===")
