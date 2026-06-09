INSERT OR REPLACE INTO bot_configs (domain, url_pattern, bot_name, teaser_titulo, teaser_sub, fuente_label, pasos_json) VALUES
('canchasdepickleball.mx', '/', 'Pickleball', '¿Vas a construir cancha de pickleball?', 'Cotiza canchas oficiales para club, casa o escuela.', 'Chatbot · Pickleball',
'[
  {"key":"cantidad","bot":"¡Hola! 👋 ¿Cuántas canchas de pickleball necesitas?","type":"chips","options":["1","2","3","4","5 o más","No sé / asesórame"],"other":"5 o más","otherBot":"¿Cuántas necesitas?","otherPh":"Ej. 6, 8…"},
  {"key":"uso","bot":"¿Para qué uso es la cancha?","type":"chips","options":["Club deportivo","Casa / residencial","Escuela","Hotel","Municipio","No estoy seguro"]},
  {"key":"tiempo","bot":"¿En qué tiempo necesitas tu proyecto?","type":"chips","options":["Lo antes posible","Este año","Solo cotizando"]},
  {"key":"ciudad","bot":"¿En qué ciudad se instalarían las canchas?","type":"text","ph":"Ej. Monterrey, N.L."},
  {"key":"nombre","bot":"¿A nombre de quién hacemos la cotización?","type":"text","ph":"Tu nombre"},
  {"key":"whatsapp","bot":"¿A qué WhatsApp te enviamos la cotización?","type":"text","ph":"10 dígitos","validate":"phone","optional":true,"skip":"No lo dejó"}
]');
