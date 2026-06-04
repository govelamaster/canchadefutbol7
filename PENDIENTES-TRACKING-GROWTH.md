# 📋 Pendientes Tracking + Growth — canchadefutbol7.mx

> Última revisión del sitio en vivo: **2026-05-27**
> Diagnóstico hecho con `curl + grep` sobre home + todos los HTML del repo.

---

## 🔍 Estado actual del tracking (verificado)

| Herramienta | Estado | Notas |
|---|---|---|
| Google Ads tag (`AW-859315777`) | ✅ Instalado | gtag suelto, sin GTM |
| Conversion label `whatsapp_click` | ✅ Configurada | `AW-859315777/5CIzCL_t_rIcEMG84JkD` |
| Listener clicks WhatsApp (`a[href*="wa.me"]`) | ✅ Funciona | dispara `trackConversion('whatsapp_click')` |
| Ahrefs Analytics | ✅ Instalado | `analytics.ahrefs.com/analytics.js` |
| **Google Analytics 4 (GA4)** | ❌ **NO instalado** | confirmado: 0 archivos con `G-XXXX` |
| **Google Tag Manager (GTM)** | ❌ NO instalado | 0 archivos con `GTM-XXXX` |
| **Meta Pixel (Facebook)** | ❌ NO instalado | 0 archivos con `fbq(` |
| **Microsoft Clarity** | ❌ NO instalado | 0 archivos con `clarity.ms` |
| **TikTok Pixel** | ❌ NO instalado | — |
| **Captura de `gclid` / `fbclid`** | ❌ NO existe | sin cookie de origen |
| **Enhanced Conversions** | ❌ NO activado | falta script + activar en Google Ads |
| **Server-side tracking (CAPI / Stape)** | ❌ NO existe | — |
| **CRM (Kommo / HubSpot / Sheet)** | ❌ NO existe | leads viven en celulares |

---

## 🎯 Pendientes agrupados por fase

### 🚀 FASE 1 — Quick wins (esta semana)
**Objetivo:** dejar de perder data + empezar a recuperar conversiones invisibles.

- [ ] **P1.1** Instalar GA4 en todas las páginas del proyecto (gratis)
- [ ] **P1.2** Instalar Microsoft Clarity (gratis, heatmaps + session recordings)
- [ ] **P1.3** Agregar script de captura de `gclid` + `fbclid` (cookie 90 días)
- [ ] **P1.4** Configurar Enhanced Conversions sobre el `gtag` actual de Google Ads
  - Hashear email + teléfono del formulario con SHA-256
  - Mandar `user_data` en evento `conversion`
- [ ] **P1.5** Modificar botones WhatsApp para incluir `gclid` en el mensaje pre-llenado
- [ ] **P1.6** Agregar eventos custom de intención al `gtag`:
  - `scroll_50`, `scroll_90`
  - `time_on_page_60s`
  - `view_pricing`, `view_faq`, `view_gallery`
  - `phone_click`, `pdf_download`

---

### 🏗️ FASE 2 — Fundación (próximas 2-3 semanas)
**Objetivo:** centralizar leads + medir embudo real.

- [ ] **P2.1** Contratar Kommo (~$25 USD/usuario/mes, plan Avanzado)
- [ ] **P2.2** Activar WhatsApp Business API en Kommo
- [ ] **P2.3** Configurar pipeline: `Nuevo → Contactado → Cotizando → Negociando → Cerrado/Perdido`
- [ ] **P2.4** Crear campos custom en Kommo:
  - gclid, fbclid, utm_source, utm_medium, utm_campaign
  - primera_pagina, ciudad, tipo_cancha, vertical (escuela/club/hotel/residencial)
  - monto_cotizado, monto_cerrado, fecha_cierre
- [ ] **P2.5** Conectar formularios del sitio → Kommo (webhook o Zapier)
- [ ] **P2.6** Configurar automatizaciones de seguimiento (recordatorio día 3, 7, 14)
- [ ] **P2.7** Plantillas de WhatsApp para vendedores (bienvenida, cotización, follow-up, recuperación)
- [ ] **P2.8** Entrenar al equipo (1 sesión de 1h)

---

### 🔬 FASE 3 — Tracking serio (mes 2)
**Objetivo:** recuperar las conversiones invisibles que Apple/Safari bloquean.

- [ ] **P3.1** Decidir si instalar GTM (recomendado) o seguir con gtag suelto
- [ ] **P3.2** Instalar Meta Pixel
- [ ] **P3.3** Contratar Stape.io ($30 USD/mes) para server-side tracking
- [ ] **P3.4** Configurar Meta CAPI (Conversions API) vía Stape
- [ ] **P3.5** Configurar Google Ads server-side vía Stape
- [ ] **P3.6** Verificar dominio en Meta Business Manager (DNS)
- [ ] **P3.7** Conectar Kommo → Google Ads (offline conversion upload nativo)
- [ ] **P3.8** Conectar Kommo → Meta CAPI vía Zapier/Make
- [ ] **P3.9** Subir las ventas históricas cerradas (últimos 90 días) a Google Ads + Meta

---

### 📈 FASE 4 — Optimización y escalamiento (mes 3+)
**Objetivo:** que el algoritmo aprenda con data real y escale.

- [ ] **P4.1** Crear audiencias de remarketing HOT / WARM / COLD en Meta y Google
- [ ] **P4.2** Crear lookalikes 1% basados en "compradores reales" (no en clicks)
- [ ] **P4.3** Cambiar bidding de Google Ads a "Maximizar valor de conversión"
- [ ] **P4.4** Cambiar bidding de Meta a "Optimización por valor de compra"
- [ ] **P4.5** Lead magnet PDF: "7 errores al construir cancha de fútbol 7"
- [ ] **P4.6** Secuencia de email nurturing 5 emails (Mailchimp / Brevo)
- [ ] **P4.7** Campaña de retargeting video 15 seg (timelapse de obra)
- [ ] **P4.8** Dashboard mensual: CAC, LTV, ROAS, % cierre por canal

---

## 💰 Costos recurrentes totales una vez montado

| Concepto | Costo mensual MXN |
|---|---|
| GA4, Clarity, Meta Pixel | $0 |
| Kommo (3 usuarios plan Avanzado) | ~$1,350 |
| WhatsApp Business API (proveedor) | ~$900-1,800 |
| Zapier/Make | ~$360 |
| Stape.io Cloud | ~$540 |
| Mailchimp/Brevo (lead nurturing) | ~$300-600 |
| **TOTAL** | **~$3,500-4,650 MXN/mes** |

**ROI esperado:** 1 venta extra de cancha ($250K+) al mes cubre 12 meses del stack completo.

---

## 🚨 Lo que requiere acceso/credenciales de Olga

Marcado con 🔑 cuando arranquemos:

- 🔑 Acceso a Google Ads (AW-859315777) para activar Enhanced Conversions
- 🔑 Acceso a Google Workspace para crear GA4 + property
- 🔑 Acceso a Meta Business Manager para Pixel + CAPI + verificar dominio
- 🔑 DNS Cloudflare (para verificación dominio Meta + subdominio Stape)
- 🔑 Tarjeta de crédito para Kommo + WhatsApp API + Stape ($60-90 USD/mes inicial)
- 🔑 Decisión: qué número WhatsApp Business oficial usar para Kommo

---

## ✅ Reglas del juego (recordatorios)

- ❌ **NO deployar** sin OK explícito de Olga (regla absoluta)
- ❌ **NO tocar** este proyecto desde la carpeta `seogeo` (incidente 26-mayo)
- ✅ Siempre preview branch `.pages.dev` antes de prod
- ✅ Verificar curl post-deploy
- ✅ Una tarea a la vez, no batches

---

*Generado por Claude — 2026-05-27. Actualizar conforme se cierren pendientes.*
