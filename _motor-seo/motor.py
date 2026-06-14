#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Motor de diferenciacion por ciudad. Selección DETERMINÍSTICA (estable por slug),
rota pools aprobados por Olga + clima real por estado + vecinas reales del dataset.
NO inventa: clima a grano grueso por estado; vecinas del mismo estado."""
import json, hashlib

POOLS  = json.load(open("_motor-seo/pools.json", encoding="utf-8"))
CIUD   = json.load(open("_motor-seo/ciudades.json", encoding="utf-8"))
ESTADO = json.load(open("_motor-seo/por_estado.json", encoding="utf-8"))

# Clima real (grano grueso por estado) -> bucket
CLIMA = {
 "humedo":  ["Tabasco","Chiapas","Veracruz","Quintana Roo","Campeche","Oaxaca","Guerrero"],
 "costa":   ["Sinaloa","Nayarit","Colima","Tamaulipas","Yucatán"],
 "arido":   ["Sonora","Chihuahua","Coahuila","Baja California","Baja California Sur",
             "Durango","Zacatecas","Nuevo León","San Luis Potosí","Aguascalientes"],
 "altura":  ["Ciudad de México","Estado de México","Puebla","Tlaxcala","Hidalgo",
             "Querétaro","Guanajuato","Michoacán","Morelos","Jalisco"],
}
ESTADO2CLIMA = {e:k for k,v in CLIMA.items() for e in v}

GANCHOS = {
 "humedo": ["Cuando cae el aguacero en {c}, el partido no se detiene.",
            "En {c} llueve fuerte — tu cancha no tiene por qué sufrirlo.",
            "Que la lluvia no te quite un solo partido en {c}."],
 "costa":  ["Entre sol y humedad, en {c} tu cancha no se rinde.",
            "El clima de {c} no perdona; tu cancha de pasto sintético sí aguanta.",
            "Sol, calor y lluvia en {c}: una cancha hecha para todo."],
 "arido":  ["Bajo el sol de {c}, el pasto natural se rinde. El sintético, no.",
            "En {c} el agua vale oro: una cancha que no te pide ni una gota.",
            "Calor de {c} todo el año, una cancha que no se quema."],
 "altura": ["A la altura de {c}, el sol castiga sin descanso — y tu cancha lo aguanta.",
            "En {c}, la radiación del altiplano es alta todo el año; tu cancha la resiste.",
            "El sol de {c} no da tregua; tu cancha de pasto sintético tampoco."],
}
# Qué pools de "clima/beneficio" usa cada bucket
BENEF = {
 "humedo": ["drenaje","cancha_lista","confort"],
 "costa":  ["drenaje","uv","cancha_lista"],
 "arido":  ["arido","uv","ahorro"],
 "altura": ["uv","ahorro","confort"],
}

def _seed(slug):
    return int(hashlib.md5(slug.encode()).hexdigest(), 16)

def pick(slug, pool, off=0):
    p = POOLS[pool]
    return p[(_seed(slug)+off) % len(p)]

def pick_list(slug, items, off=0):
    return items[(_seed(slug)+off) % len(items)]

def vecinas(slug, estado, n=3):
    pool = [s for s in ESTADO.get(estado,[]) if s != slug]
    if not pool: return []
    start = _seed(slug) % len(pool)
    out=[]
    for i in range(min(n,len(pool))):
        out.append(pool[(start+i)%len(pool)])
    return out

def cap(s):
    return s[0].upper()+s[1:] if s else s

def estado_art(e):
    if e == "Estado de México": return "el Estado de México"
    if e == "Ciudad de México": return "la Ciudad de México"
    return e

def bloque(slug):
    info = CIUD[slug]; c, est = info["label"], info["estado"]
    estA = estado_art(est)
    clima = ESTADO2CLIMA.get(est, "altura")
    gancho = pick_list(slug, GANCHOS[clima], 1).format(c=c)
    benef_pools = BENEF[clima]
    b1 = pick(slug, benef_pools[0], 2)
    b2 = pick(slug, benef_pools[1], 3)

    personal  = pick(slug,"personal",4)
    cobertura = pick(slug,"cobertura",5).format(ciudad=c, estadoA=estA)
    precio    = pick(slug,"precio",6).format(ciudad=c)
    tiempos   = pick(slug,"tiempos",7)
    base      = pick(slug,"base_cliente",8)
    tray      = pick(slug,"trayectoria",9)

    vs = vecinas(slug, est, 3)
    vs_labels = [CIUD[v]["label"] for v in vs]
    lista = ", ".join(vs_labels[:-1]) + (" y " + vs_labels[-1] if len(vs_labels)>1 else (vs_labels[0] if vs_labels else ""))
    vecinas_frase = pick(slug,"vecinas",10).format(ciudad=c, lista=lista) if vs_labels else ""

    # Parrafo 1: gancho + 2 beneficios de clima (cada uno frase completa)
    p1 = f"{gancho} {cap(b1)}. {cap(b2)}."
    # Parrafo 2: "Con {personal}, {cobertura-nosotros}." + precio + tiempos + base
    p2 = f"Con {personal}, {cobertura}. {precio}. {tiempos}. {base}."
    # Parrafo 3: trayectoria + vecinas
    p3 = f"{tray}. {vecinas_frase}." if vecinas_frase else f"{tray}."
    return clima, p1, p2, p3

if __name__ == "__main__":
    import sys
    samples = sys.argv[1:] or ["villahermosa","hermosillo","toluca","mazatlan"]
    for s in samples:
        slug = s if s in CIUD else None
        if not slug:
            print(f"[!] {s} no está en el dataset\n"); continue
        clima,p1,p2,p3 = bloque(slug)
        info=CIUD[slug]
        print(f"\n{'='*70}\n {info['label']}, {info['estado']}  ·  clima={clima}\n{'='*70}")
        print(p1); print(); print(p2); print(); print(p3)
