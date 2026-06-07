#!/usr/bin/env python3
"""Grupo 7: zonas tipo Esmeralda — residenciales y corredores escolares
premium Edomex norte/poniente + corredores CDMX faltantes.
16 paginas long-tail B2B (escuelas privadas + clubes + residenciales).
"""
import os, re, glob, shutil

SRC = "construccion-de-canchas-de-futbol-en-queretaro"
QZONES = ["Juriquilla", "El Marqués", "Corregidora", "San Juan del Río", "Tequisquiapan"]

CITIES = [
 # ========== EDOMEX NORTE/PONIENTE PREMIUM (10) ==========
 ("Zona Esmeralda","zona-esmeralda","Estado de México","MX-MEX",["Condado de Sayavedra","Hacienda Sayavedra","Rincón de Sayavedra","Esmeralda","Plaza Esmeralda"]),
 ("Hacienda de Valle Escondido","hacienda-de-valle-escondido","Estado de México","MX-MEX",["Valle Escondido","Bosques de Valle Escondido","Lomas de Valle Escondido","La Joya","La Cima"]),
 ("Hacienda del Pedregal","hacienda-del-pedregal","Estado de México","MX-MEX",["El Pedregal","Villas del Pedregal","Lomas del Pedregal","Real del Pedregal","Pedregal Country"]),
 ("Calacoaya","calacoaya","Estado de México","MX-MEX",["Calacoaya Residencial","Bosques de Calacoaya","La Estadía","Las Colonias","Lomas de Calacoaya"]),
 ("Lago de Guadalupe","lago-de-guadalupe","Estado de México","MX-MEX",["San Pedro Xalostoc","Cumbres del Lago","Villas del Lago","Cumbria","Rinconada del Lago"]),
 ("Boulevares","boulevares","Estado de México","MX-MEX",["Boulevares Naucalpan","Plaza Boulevares","Centro Boulevares","Jardines Boulevares","Boulevares Norte"]),
 ("Ciudad Brisa","ciudad-brisa","Estado de México","MX-MEX",["Brisas del Pacífico","Brisas del Atlántico","Cumbres de Brisa","La Florida","Lomas de Brisa"]),
 ("Lomas Country","lomas-country","Estado de México","MX-MEX",["Lomas Country Club","Real de las Lomas","Vista Real","Bosques de Lomas Country","Cumbres Country"]),
 ("Hacienda de las Palmas","hacienda-de-las-palmas","Estado de México","MX-MEX",["Las Palmas","Bosque de las Palmas","Cumbres de las Palmas","Real de las Palmas","Palmas Hills"]),
 ("Real Hacienda","real-hacienda","Estado de México","MX-MEX",["Real Hacienda San José","Hacienda Real","Real del Bosque","Real de Huixquilucan","Cumbres Real"]),

 # ========== CDMX CORREDORES + ZONAS FALTANTES (6) ==========
 ("Anáhuac","anahuac-cdmx","Ciudad de México","MX-CMX",["Anáhuac I","Anáhuac II","Mariano Escobedo","Verónica Anzures","Granada"]),
 ("Granada","granada-cdmx","Ciudad de México","MX-CMX",["Nueva Granada","Ampliación Granada","Plaza Carso","Antara Polanco","Miguel Hidalgo Centro"]),
 ("Lindavista","lindavista","Ciudad de México","MX-CMX",["Lindavista Norte","Lindavista Sur","Vallejo","Capultitlán","Magdalena de las Salinas"]),
 ("San Jerónimo","san-jeronimo-cdmx","Ciudad de México","MX-CMX",["San Jerónimo Lídice","Pedregal de San Jerónimo","Tizapán","Olivar de los Padres","Tetelpan"]),
 ("Acoxpa","acoxpa","Ciudad de México","MX-CMX",["Villa Coapa","Pedregal de la Zorra","Bosques de Tetlameya","Belisario Domínguez","San Bartolo el Chico"]),
 ("Centro Histórico","centro-historico-cdmx","Ciudad de México","MX-CMX",["Zócalo","Alameda Central","Garibaldi","Lagunilla","Tepito"]),
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
    print(f"=== GRUPO 7: {len(CITIES)} zonas premium ===")
    ok = skip = err = 0
    for c in CITIES:
        r = gen(*c)
        print(r)
        if "ya existe" in r: skip += 1
        elif "leftover=0" in r and "imgs_ok=True" in r: ok += 1
        else: err += 1
    print(f"\n=== RESUMEN: ok={ok} skip={skip} err={err} ===")
