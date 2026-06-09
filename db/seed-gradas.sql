-- Bot config para gradasdefutbol.mx
-- url_pattern='/' aplica a TODO el dominio (home + 60+ páginas internas)
INSERT OR REPLACE INTO bot_configs (domain, url_pattern, bot_name, teaser_titulo, teaser_sub, cta_label, fuente_label, pasos_json, activo) VALUES
('gradasdefutbol.mx', '/', 'Gradas Sportmaster',
 '¿Buscas una <em>grada</em> para tu cancha?',
 'Para 35, 50, 100 o 200 personas. Cotiza ahora.',
 'Cotizar gradas',
 'Chatbot · Gradas',
'[
  {"key":"capacidad","bot":"¡Hola! 👋 ¿Para cuántas personas buscas las gradas?","type":"chips","options":["35","50","75","100","150","200","Otra"],"other":"Otra","otherBot":"¿Para cuántas personas?","otherPh":"Ej. 300, 500…"},
  {"key":"cantidad","bot":"¿Cuántas gradas necesitas?","type":"chips","options":["1","2","3","4 o más"],"other":"4 o más","otherBot":"¿Cuántas necesitas?","otherPh":"Ej. 6, 8…"},
  {"key":"ciudad","bot":"¿Para qué ciudad?","type":"text","ph":"Ej. Monterrey, N.L."},
  {"key":"nombre","bot":"¿A nombre de quién preparo la cotización?","type":"text","ph":"Tu nombre"},
  {"key":"tiempo","bot":"¿En qué tiempo necesitas las gradas?","type":"chips","options":["Lo antes posible","Este año","Solo cotizando"]},
  {"key":"whatsapp","bot":"¿A qué WhatsApp te enviamos la cotización?","type":"text","ph":"10 dígitos — o escríbeme por aquí","validate":"phone","optional":true,"skip":"No lo dejó"}
]',
1);
