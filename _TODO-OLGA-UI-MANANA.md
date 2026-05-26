# TODO OLGA UI — CDMX CONSTRUCCION SINTETICO
**Fecha:** 2026-05-24 (para ejecutar lunes 25-may AM)
**Tiempo total estimado:** 40 min
**Campaign:** CONSTRUCCION SINTETICO CDMX 27/12/25 (ID 23404305563)
**Ad Group:** CDMX (ID 188572007697)

═══════════════════════════════════════════════════════════════

## ✅ YA EJECUTADO HOY POR CLAUDE (no tocar)

| # | Acción | Status |
|---|---|---|
| 1 | Recovery tracking AW-859315777 + 3 labels dedicados (Form, WA, Tel) | ✅ Deploy verificado |
| 2 | Ad nuevo "Sobse y Sedatu — corregido" (810087848800) ENABLED, copy limpio | ✅ Activo |
| 3 | Ad viejo "Sobse y Sedatu" original (790195721174) PAUSED, histórico preservado | ✅ |
| 4 | CPC máx grupo CDMX subido $130 → $200 | ✅ Aplicado |

═══════════════════════════════════════════════════════════════

## 📋 TU LISTA — 40 MIN UI MAÑANA LUNES

### 🔴 BLOQUE 1 — DEVICE BIDS (3 min)

**Ruta:** Campaña CDMX → Configuración → Dispositivos

| Dispositivo | Ajuste Bid | Por qué |
|---|---|---|
| 💻 Computadoras | **+30%** | CR 24.5% vs móviles 8.9% — convierten 3x mejor |
| 📱 Móviles | 0% (default) | 66% del volumen, dejar correr |
| 📱 Tablets | **-50%** | Solo 29 clicks 90d, gasto trivial |

**Impacto: +$8-15K MXN/mes en leads PC**

---

### 🔴 BLOQUE 2 — DAY-OF-WEEK BIDS (3 min)

**Ruta:** Campaña CDMX → Programación de anuncios → Ajustes por día

| Día | Ajuste | CPA actual |
|---|---|---|
| Miércoles | **+15%** | $547 (mejor día) |
| Jueves | +10% | $587 |
| Lunes | 0% | $578 |
| Martes | 0% | $633 |
| Viernes | 0% | $581 |
| Sábado | **-25%** | $1,008 |
| Domingo | **-30%** | $1,305 (2.4x peor que mié) |

**Impacto: +$4-6K MXN/mes ahorro**

---

### 🟡 BLOQUE 3 — GEO EXCLUSIONS (5 min)

**Ruta:** Campaña CDMX → Ubicaciones → Excluidas → Agregar

**Excluir estas ubicaciones (CPA alto + CR bajo):**

| Ubicación | CPA 90d | CR | Decisión |
|---|---|---|---|
| Los Reyes Acaquilpan | $1,281 | 5% | EXCLUIR |
| Tepexpan | $978 | 9% | EXCLUIR |
| Lerma de Villada | $975 | 7.4% | EXCLUIR |
| Acolman | $2,110 | 4.5% | EXCLUIR |
| Valle de Chalco Solidaridad | $1,246 | 5% | EXCLUIR |

**Impacto: +$5-8K MXN/mes ahorro**

---

### 🟡 BLOQUE 4 — GEO BID UP (5 min)

**Ruta:** Campaña CDMX → Ubicaciones → Específica → Editar bid

**Bid +20% en estas (winners):**

| Ubicación | CR | CPA | Conv 90d |
|---|---|---|---|
| Teotihuacán de Arista | 65% | $115 | 13 |
| Bosque de las Lomas | 40.7% | $183 | 11 |
| Buenavista | 34% | $153 | 16 |
| Ciudad Satélite | 21.7% | $267 | 15 |
| Municipio de Huixquilucan | 19.5% | $448 | 22 |
| Chiconcuac de Juárez | 50% | $137 | 4 |

**Impacto: +3-5 leads/mes**

---

### 🔴 BLOQUE 5 — KEYWORD BIDS (10 min)

**Ruta:** Campaña CDMX → Grupo CDMX → Keywords → Editar Max CPC

#### 🚫 BID DOWN (10 keywords fantasma — 0 conv 90d)

| Keyword | Match | Bid Actual | **Bid Nuevo** | Gasto 90d Perdido |
|---|---|---|---|---|
| precio m2 cesped artificial | EXACT | ? | **$20** | $16,079 🔴🔴🔴 |
| pasto sintetico para futbol | PHRASE | $160 | **$30** | $11,000 |
| precio pasto sintetico por metro cuadrado | EXACT | $145 | **$30** | $2,365 |
| pasto sintetico precio m2 | EXACT | ? | **$25** | $1,752 |
| cesped sintetico | PHRASE | ? | **$15** | $1,304 (QS 1!) |
| cesped sintetico precio m2 | EXACT | ? | **$15** | $766 |
| pasto sintetico hibrido | PHRASE | ? | **$40** | $1,493 (híbrido premium) |
| Pasto hibrido | EXACT | ? | **$40** | $582 |
| pasto sintetico hibrido | EXACT | ? | **$40** | $657 |
| pasto sintético para cancha de fútbol | PHRASE | ? | **$30** | $647 |

**Estrategia:** NO killear (data corrupta por tracking roto). Bid down mantiene opción para re-evaluar 2-3 semanas post-recovery.

**Impacto: +$10-12K MXN/mes ahorro**

#### ⭐ BID UP (5 winners)

| Keyword | Match | QS | CPA | **Bid Up** |
|---|---|---|---|---|
| pasto sintético para canchas | PHRASE | 7 | $143 (CR 47.73%) | **+30%** |
| costo cancha futbol 7 | EXACT | 3 | $158 (CR 34.38%) | **+30%** |
| pasto sintetico para cancha de futbol | EXACT | 7 | $289 (CR 34.6%) | **+20%** |
| pasto sintetico futbol | PHRASE | 5 | $409 (63 conv) | **+15%** |
| pasto sintetico cdmx | Phrase + Exact | 0/4 | $433-450 | **+10%** |

**Impacto: +5-10 leads/mes adicionales**

---

### 🟡 BLOQUE 6 — HORARIOS MUERTOS (3 min)

**Ruta:** Campaña CDMX → Programación de anuncios → Personalizado

**Bloquear / Bid -50%:**

| Día + Hora | Clicks 90d | Conv | Acción |
|---|---|---|---|
| Domingo 12-14h | 67 | 0 | **Pausar** |
| Sábado 12, 17, 18h | 100+ | 0-2 | **Pausar** |
| Lunes 18h | 47 | 1 ($4,104 CPA) | **Bid -50%** |
| Jueves 19h | 35 | 1 ($2,383) | **Bid -50%** |

**Impacto: +$3-5K MXN/mes ahorro**

---

### 🟢 BLOQUE 7 — CALL ASSET MIGRATION (5 min)

**Ruta:** Recursos → Llamada → Agregar (mismo proceso que ya hiciste con padel)

- País: México
- Teléfono: 5539887615
- Conversion action: "Futbol7 — Tel Click" (label `lczYCL2V6LIcEMG84JkD`)
- Horarios: Lun-Sáb 08:00–21:00, Dom 10:00–18:00
- Aplicar a: Campaña CONSTRUCCION SINTETICO CDMX
- Informe de llamadas: ✅ ON

**Después:** Pausar el call-ad legacy DISAPPROVED (ID 790197118937).

═══════════════════════════════════════════════════════════════

## 💰 IMPACTO TOTAL ESPERADO MAÑANA + RECOVERY YA HECHO

| Item | Recovery/mes |
|---|---|
| Tracking restaurado (DONE) | +$40K MXN visibilidad |
| Sobse y Sedatu ad activo (DONE) | +30-40 leads/mes |
| CPC máx $200 (DONE) | Más impresiones competitivas |
| Bloque 1 Device bid PC | +$8-15K MXN |
| Bloque 2 Day bid | +$4-6K MXN ahorro |
| Bloque 3 Geo excl | +$5-8K MXN ahorro |
| Bloque 4 Geo winners | +3-5 leads/mes |
| Bloque 5 Keyword bids | +$10-12K MXN + 5-10 leads |
| Bloque 6 Hora muerta | +$3-5K MXN ahorro |
| Bloque 7 Call asset | Más calls registradas |
| **TOTAL EN 30 DÍAS** | **+$70-85K MXN/mes + 50-70 leads adicionales** |

═══════════════════════════════════════════════════════════════

FIN del TODO. Generado por Claude 2026-05-24
═══════════════════════════════════════════════════════════════
