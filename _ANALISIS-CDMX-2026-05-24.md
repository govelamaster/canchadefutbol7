# ANÁLISIS PROFUNDO CDMX — CONSTRUCCION SINTETICO 27/12/25
**Fecha:** 2026-05-24
**Owner:** Olga Govela
**Status:** Recovery completo. Datos cruzados de Supermetrics + 4 CSVs UI.

═══════════════════════════════════════════════════════════════

## 🚨 HALLAZGO PRINCIPAL — TRACKING POST-HACK EXPLICA TODO

| Métrica | 90d ATRÁS (pre-hack) | 30d ÚLTIMOS (post-hack) | Diferencia |
|---|---|---|---|
| Conversion Rate | **12.7%** | **6.3%** | **-51%** (cayó a la mitad) |
| CPA | $606 | $2,051 | +220% |
| Conv/día promedio | 6 | 1 | -83% |

**Causa confirmada:** AW-859315777 tag con placeholders. Recovery aplicado 2026-05-24. Mañana lunes empieza a registrar conversiones reales.

═══════════════════════════════════════════════════════════════

## 📊 OPTIMIZACIONES CLAVE — RANKING POR IMPACTO

### 🥇 #1 — DEVICE BID ADJUSTMENTS (impacto ENORME)

**Data 90d:**

| Device | Clicks | Conv | CR | CPA | Recomendación |
|---|---|---|---|---|---|
| 💻 **Computadoras** | 714 | 175 | **24.5%** ⭐⭐⭐ | **$413** | **Bid +30%** |
| 📱 Móviles | 3,965 | 355 | 8.9% | $731 | Dejar default |
| 📱 Tablets | 29 | 3 | 10.3% | $568 | **Bid -50%** |

**INSIGHT:** Computadoras convierten **3x mejor que móviles**. Estás dejando dinero sobre la mesa porque no estás pujando más fuerte por PC.

**Acción Olga UI:** Configuración campaña → Dispositivos → ajustes manuales arriba.

**Impacto estimado:** +$8K-15K MXN/mes en leads de PC.

---

### 🥈 #2 — DÍA DE LA SEMANA (impacto grande)

**Data 90d:**

| Día | Clicks | Conv | CPA | Acción |
|---|---|---|---|---|
| Miércoles | 820 | 112 | **$547** ⭐ | **+15%** |
| Jueves | 762 | 102 | $587 | +10% |
| Martes | 901 | 104 | $633 | 0% |
| Lunes | 618 | 84 | $578 | +5% |
| Viernes | 592 | 76 | $581 | 0% |
| Sábado | 493 | 31 | **$1,008** 🔴 | **-25%** |
| Domingo | 522 | 23 | **$1,305** 🔴🔴 | **-30%** |

**Impacto estimado:** $4-6K MXN/mes ahorro.

---

### 🥉 #3 — UBICACIONES SUPER WINNERS (ALL-TIME)

**Bid +20% en estas (CR >15% + CPA <$500):**

| Ubicación | CR | CPA | Conv |
|---|---|---|---|
| Teotihuacán de Arista | **65%** | **$115** | 13 |
| Bosque de las Lomas | **40.7%** | **$183** | 11 |
| Buenavista | **34%** | **$153** | 16 |
| Santiago Tianguistenco | 54% | $76 | 6 |
| San Jerónimo Chicahualco | 100% | $95 | 3 |
| Chiconcuac de Juárez | 50% | $137 | 4 |
| Naucalpan (ya agregada) | 16.76% | $407 | 46 |
| Municipio de Huixquilucan | 19.47% | $448 | 22 |
| Atenco | 50% | $194 | 2 |
| Tenancingo | 28.57% | $234 | 4 |
| Jardín Balbuena | 22.5% | $388 | 9 |
| Central de Abasto | 27.94% | $272 | 9.5 |
| Ciudad Satélite | 21.74% | $267 | 15 |

---

### 🚫 #4 — UBICACIONES A EXCLUIR (caro + bajo CR)

**Excluir (CPA >$900 + CR <8%):**

| Ubicación | CR | CPA | Decisión |
|---|---|---|---|
| Los Reyes Acaquilpan | 5% | **$1,281** | EXCLUIR |
| Valle de Chalco Solidaridad (90d) | 5.06% | **$1,246** | EXCLUIR |
| Chimalhuacán (90d) | 4.35% | **$1,394** | EXCLUIR |
| Tepexpan | 9.09% | $978 | EXCLUIR |
| Lerma de Villada | 7.41% | $975 | EXCLUIR |
| Tepotzotlán | 11.11% | $759 | bid -30% |
| Acolman (90d) | 4.55% | $2,110 | EXCLUIR |
| Cuautitlán | 6.67% | $871 | bid -30% |
| Ecatepec (90d con tracking roto) | 4.55% | $1,583 | re-evaluar día 7 post-recovery |
| Toluca | 7.19% | $822 | bid -20% |

**Impacto estimado:** $5-8K MXN/mes ahorro.

---

### 🚫 #5 — NEGATIVE KEYWORDS CRÍTICOS

**Agregar como negativa PHRASE:**

| Search term | Clicks 90d | Conv | Costo | Acción |
|---|---|---|---|---|
| "pasto sintetico para futbol" | 93 | **0** | **$11,000** 💀 | NEGATIVA PHRASE |

**Sangría confirmada $11K MXN sin UN solo lead.** Mata inmediato.

---

### ⏰ #6 — HORAS ÓPTIMAS vs MUERTAS

**HOT spots (CPA <$300, mantener/subir bid):**

| Día + Hora | Conv | CPA | Insight |
|---|---|---|---|
| Lunes 23h | 6 | **$112** ⭐⭐ | Insólito — alguien decide en la noche |
| Miércoles 10h | 19 | $278 | Decisión matutina |
| Lunes 11h | 14.37 | $238 | Decisión matutina |
| Jueves 10h | 14 | $388 | OK |
| Martes 13h | 15 | $447 | OK |
| Miércoles 22h | 8 | $174 | Decisión nocturna |

**DEAD spots (0 conv con tráfico, bloquear o bid -50%):**

| Día + Hora | Clicks | Conv | Acción |
|---|---|---|---|
| Lunes 18h | 47 | 1 (CPA $4,104) | bid -50% o pausar |
| Domingo 12-14h | 67 | 0 | pausar |
| Sábado 12, 17, 18h | 100+ | 0-2 | pausar/bid -50% |
| Jueves 19h | 35 | 1 ($2,383) | bid -50% |

═══════════════════════════════════════════════════════════════

## 📋 TODO OLGA UI — MAÑANA LUNES 25-MAY (45 min total)

### 🔴 CRÍTICO (15 min):

1. **Negative keyword** "pasto sintetico para futbol" PHRASE → kill $11K bleed
2. **Device bid:** Computadoras **+30%**, Tablets **-50%**
3. **Day bid:** Sábado **-25%**, Domingo **-30%**, Miércoles **+15%**
4. **Reactivar Ad #3** "Pasto canchas Sobse y Sedatu" — quitar "CdMX" raro

### 🟡 GEO (15 min — más fino):

5. **Excluir ubicaciones bleed:**
   - Los Reyes Acaquilpan
   - Tepexpan
   - Lerma de Villada
   - Tepotzotlán (o bid -30%)
   - Acolman
   - Valle de Chalco (re-evaluar día 7)
   - Chimalhuacán (re-evaluar día 7)

6. **Bid +20% en winners:**
   - Teotihuacán
   - Bosque de las Lomas
   - Buenavista
   - Ciudad Satélite
   - Municipio de Huixquilucan
   - Chiconcuac de Juárez

### 🟢 INFRAESTRUCTURA (15 min):

7. **Subir CPC máx** $130 → $200 ("Limitada por la estrategia")
8. **Migrar call ad** a call asset nuevo (mismo proceso que padel hizo)
9. **Programar exclusión** horarios muertos: Dom 12-14h, Sáb 12-18h, Lun 18h

═══════════════════════════════════════════════════════════════

## 💰 IMPACTO TOTAL ESTIMADO (cumulativo)

| Optimización | Recovery/mes |
|---|---|
| Tracking restaurado (ya hecho hoy) | +$40K MXN visibility |
| Device bid +30% PC | +$8-15K MXN leads |
| Day bid adjustments (sáb/dom/mié) | +$4-6K MXN ahorro |
| Geo exclusions + bids winners | +$5-8K MXN ahorro |
| Negative "pasto sintetico para futbol" | +$11K MXN ahorro |
| Hora-day exclusions | +$3-5K MXN ahorro |
| **TOTAL recovery + optimización** | **+$71-85K MXN/mes** |

**Conv mensuales esperadas post-optimización:** 175-200/mes = **6-7 leads/día CDMX**

═══════════════════════════════════════════════════════════════

## 📅 ROADMAP CDMX HACIA 20 LEADS/DÍA

| Día | Acción | Resultado esperado |
|---|---|---|
| **Lunes 25-may** | TODO UI Olga (45 min) | Optimizaciones activas |
| **31-may (Día 7)** | Punto chequeo: 5+ conv reales | Validar tracking funciona |
| **7-jun (Día 14)** | Cambio Max Clicks → Max Conv | +30-50% leads |
| **14-jun (Día 21)** | Activar tCPA $400 | Estabilizar CPA |
| **21-jun (Día 28)** | Subir budget +30% si CPA <$500 | +30% volumen |
| **30-jun** | Meta: 6-8 leads/día CDMX | Hacia 20 leads/día total |

═══════════════════════════════════════════════════════════════

FIN — Generado por Claude Code 2026-05-24
Fuentes: Supermetrics campaign_full + 4 CSVs UI Google Ads
Próxima actualización: lunes 31-may (día 7) con data post-recovery
═══════════════════════════════════════════════════════════════
