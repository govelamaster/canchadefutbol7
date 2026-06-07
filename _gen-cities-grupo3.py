#!/usr/bin/env python3
"""Grupo 3: cierra top 10 en Jalisco, NL, Queretaro (caros pero volumen).
14 ciudades. Mismo motor. Para Qro conurbado: los zone names QZONES coinciden con
los displays nuevos -> el orden de swap (QZONES primero, luego Queretaro->display)
hace que funcione correctamente sin colisiones.
"""
import os, re, glob, shutil

SRC = "construccion-de-canchas-de-futbol-en-queretaro"
QZONES = ["Juriquilla", "El Marqués", "Corregidora", "San Juan del Río", "Tequisquiapan"]

CITIES = [
 # ========== JALISCO (5) ==========
 ("Tlaquepaque","tlaquepaque","Jalisco","MX-JAL",["San Pedro Tlaquepaque","Las Juntas","Toluquilla","Santa María Tequepexpan","Santa Anita"]),
 ("Tonalá","tonala-jalisco","Jalisco","MX-JAL",["Loma Dorada","El Rosario","Coyula","Zalatitán","Puente Grande"]),
 ("Tlajomulco de Zúñiga","tlajomulco-de-zuniga","Jalisco","MX-JAL",["Cajititlán","Santa Cruz del Valle","San Agustín","Hacienda Santa Fe","La Tijera"]),
 ("El Salto","el-salto-jalisco","Jalisco","MX-JAL",["Las Pintitas","La Azucena","Las Liebres","Parques Solidaridad","San José del Castillo"]),
 ("Ocotlán","ocotlan-jalisco","Jalisco","MX-JAL",["Poncitlán","Jamay","La Barca","Atotonilco","Tototlán"]),

 # ========== NUEVO LEÓN (4) ==========
 ("General Escobedo","general-escobedo","Nuevo León","MX-NLE",["Las Encinas","Privadas del Sol","Hacienda del Topo","San Marcos","Praderas de la Silla"]),
 ("Juárez","juarez-nuevo-leon","Nuevo León","MX-NLE",["Loma Larga","Misión San Javier","Real del Sol","Cadereyta","Mirador del Cangrejo"]),
 ("García","garcia-nuevo-leon","Nuevo León","MX-NLE",["Paseo de las Minas","Real de San Bernabé","Mirador de las Mitras","La Hacienda","Pesquería"]),
 ("Cadereyta Jiménez","cadereyta-jimenez","Nuevo León","MX-NLE",["San Juan","Refugio","Allende","Montemorelos","La Estanzuela"]),

 # ========== QUERÉTARO (5) ==========
 ("San Juan del Río","san-juan-del-rio","Querétaro","MX-QUE",["Galindo","Paso Ancho","Lomas de San Juan","San Sebastián","El Coto"]),
 ("El Marqués","el-marques","Querétaro","MX-QUE",["La Cañada","La Pradera","Atongo","Los Pocitos","La Griega"]),
 ("Corregidora","corregidora","Querétaro","MX-QUE",["El Pueblito","Candiles","Los Olvera","Venceremos","Tejeda"]),
 ("Tequisquiapan","tequisquiapan","Querétaro","MX-QUE",["La Magdalena","Bordo Blanco","Adolfo López Mateos","Centro Tequisquiapano","La Trinidad"]),
 ("Pedro Escobedo","pedro-escobedo","Querétaro","MX-QUE",["La Lira","Noria Nueva","San Clemente","Ajuchitlán","Escolásticas"]),
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
    print(f"=== GRUPO 3: {len(CITIES)} ciudades ===")
    ok = skip = err = 0
    for c in CITIES:
        r = gen(*c)
        print(r)
        if "ya existe" in r: skip += 1
        elif "leftover=0" in r and "imgs_ok=True" in r: ok += 1
        else: err += 1
    print(f"\n=== RESUMEN: ok={ok} skip={skip} err={err} ===")
