-- ============================================================================
-- Multi-tenant migration para bot_configs.
-- Agrega columna `domain` (default 'canchadefutbol7.mx' = back-compat total).
-- Seed inicial: bot de Gradas para gradasdefutbol.mx.
--
-- IDEMPOTENTE: D1 no tiene IF NOT EXISTS para ALTER, así que el ALTER va a
-- fallar la 2da vez. Está OK — el seed sigue corriendo.
-- ============================================================================

-- 1) Columna domain (default canchadefutbol7.mx → filas viejas quedan correctas)
ALTER TABLE bot_configs ADD COLUMN domain TEXT NOT NULL DEFAULT 'canchadefutbol7.mx';

-- 2) Aseguramos que las filas viejas tengan dominio asignado
UPDATE bot_configs SET domain = 'canchadefutbol7.mx' WHERE domain IS NULL OR domain = '';

-- 3) Seed Gradas (gradasdefutbol.mx). url_pattern = '/' = default del dominio.
INSERT OR REPLACE INTO bot_configs (domain, url_pattern, bot_name, teaser_titulo, teaser_sub, fuente_label, pasos_json) VALUES
('gradasdefutbol.mx', '/', 'Gradas', '¿Necesitas gradas para tu espacio?', 'Cotiza gradas modulares de 50 a 200 personas.', 'Chatbot · Gradas',
'[
  {"key":"capacidad","bot":"¡Hola! 👋 ¿Para cuántas personas buscas las gradas?","type":"chips","options":["35","50","75","100","150","200","Otro"],"other":"Otro","otherBot":"¿Para cuántas personas?","otherPh":"Ej. 250, 400…"},
  {"key":"cantidad","bot":"¿Cuántas gradas necesitas?","type":"chips","options":["1","2","3","4","5 o más","No sé / asesórame"],"other":"5 o más","otherBot":"¿Cuántas necesitas?","otherPh":"Ej. 6, 8…"},
  {"key":"tiempo","bot":"¿En qué tiempo necesitas tus gradas?","type":"chips","options":["Lo antes posible","Este año","Solo cotizando"]},
  {"key":"ciudad","bot":"¿Para qué ciudad?","type":"text","ph":"Ej. Monterrey, N.L."},
  {"key":"nombre","bot":"¿A nombre de quién preparo la cotización?","type":"text","ph":"Tu nombre"},
  {"key":"whatsapp","bot":"¿A qué WhatsApp te enviamos la cotización?","type":"text","ph":"10 dígitos","validate":"phone","optional":true,"skip":"No lo dejó"}
]');
