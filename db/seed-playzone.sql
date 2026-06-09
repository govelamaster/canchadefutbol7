INSERT OR REPLACE INTO bot_configs (domain, url_pattern, bot_name, teaser_titulo, teaser_sub, fuente_label, pasos_json) VALUES
('playzonegrass.com', '/', 'PlayZone Grass', '¿Quieres pasto sintético en casa?', 'Cotización en 2 horas. Garantía 8 años UV.', 'Chatbot · PlayZone Grass',
'[
  {"key":"ubicacion","bot":"¡Hola! 👋 ¿Dónde vas a instalar el pasto sintético?","type":"chips","options":["Jardín casa","Terraza / azotea","Áreas comunes","Negocio / oficina","Escuela / kínder","Otro"]},
  {"key":"superficie","bot":"¿Cuántos m² aproximados?","type":"chips","options":["Menos de 30 m²","30 a 80 m²","80 a 200 m²","Más de 200 m²","No sé / asesórame"],"other":"Más de 200 m²","otherBot":"¿Cuántos m²?","otherPh":"Ej. 350, 500…"},
  {"key":"tiempo","bot":"¿En qué tiempo lo necesitas?","type":"chips","options":["Lo antes posible","Este año","Solo cotizando"]},
  {"key":"ciudad","bot":"¿En qué ciudad estás?","type":"text","ph":"Ej. CDMX, Monterrey"},
  {"key":"nombre","bot":"¿A nombre de quién hacemos la cotización?","type":"text","ph":"Tu nombre"},
  {"key":"whatsapp","bot":"¿A qué WhatsApp te enviamos la cotización?","type":"text","ph":"10 dígitos","validate":"phone","optional":true,"skip":"No lo dejó"}
]');
