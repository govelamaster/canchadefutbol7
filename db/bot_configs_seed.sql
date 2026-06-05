-- Borrar la config inventada de Bancas y meter las 6 REALES del demo de Olga
DELETE FROM bot_configs WHERE url_pattern = '/bancas-para-jugadores/';

INSERT OR REPLACE INTO bot_configs (url_pattern, bot_name, teaser_titulo, teaser_sub, fuente_label, pasos_json) VALUES
('/porterias-para-canchas-de-futbol/', 'Porterías', '¿Buscas porterías para tu cancha?', 'Cotiza fútbol 5, 7, 9, 11 o a medida.', 'Chatbot · Porterías',
'[
  {"key":"formato","bot":"¡Hola! 👋 ¿Qué tipo de cancha tienes? Así te recomendamos las porterías ideales.","type":"chips","options":["Fútbol 5","Fútbol 7","Fútbol 9","Fútbol 11 / soccer","A medida","No estoy seguro"]},
  {"key":"cantidad","bot":"¿Cuántas porterías necesitas?","type":"chips","options":["Solo 1","Un par (2)","Necesito más de 2","No sé / asesórame"],"other":"Necesito más de 2","otherBot":"¡Perfecto! ¿Cuántas necesitas?","otherPh":"Ej. 4, 6, 8…"},
  {"key":"comentarios","bot":"¿Quieres comentarnos algo más? (opcional)","type":"text","ph":"Ej. con red, urgencia, color, uso…","optional":true,"skip":"—"},
  {"key":"ciudad","bot":"¿En qué ciudad las necesitas?","type":"text","ph":"Ej. Cancún, Q. Roo"},
  {"key":"nombre","bot":"¿A qué nombre preparamos la cotización?","type":"text","ph":"Tu nombre"},
  {"key":"tiempo","bot":"¿En qué tiempo quieres comenzar?","type":"chips","options":["Lo antes posible","Este año","Solo cotizando"]},
  {"key":"whatsapp","bot":"¿A qué WhatsApp te enviamos la cotización?","type":"text","ph":"10 dígitos","validate":"phone","optional":true,"skip":"No lo dejó"}
]'),

('/malla-ciclonica-para-canchas-de-futbol/', 'Malla ciclónica', '¿Necesitas malla ciclónica para tu cancha?', 'Cotiza tu proyecto, te ayudamos.', 'Chatbot · Malla ciclónica',
'[
  {"key":"zona","bot":"¡Hola! 👋 Cotizamos malla ciclónica. ¿Qué quieres proteger?","type":"chips","options":["Toda la cancha","Solo atrás de porterías","Una zona específica","No sé"]},
  {"key":"medida","bot":"Medida de la cancha aprox: danos largo × ancho, metros totales, o \"no sé\".","type":"text","ph":"Ej. 25 × 45 m — o \"no sé\"","optional":true,"skip":"No sé"},
  {"key":"ciudad","bot":"¿En qué ciudad se instalará?","type":"text","ph":"Ej. Cancún, Q. Roo"},
  {"key":"nombre","bot":"¿A qué nombre preparamos la cotización?","type":"text","ph":"Tu nombre"},
  {"key":"tiempo","bot":"¿En qué tiempo quieres comenzar?","type":"chips","options":["Lo antes posible","Este año","Solo cotizando"]},
  {"key":"whatsapp","bot":"¿A qué WhatsApp te enviamos la cotización?","type":"text","ph":"10 dígitos","validate":"phone","optional":true,"skip":"No lo dejó"}
]'),

('/bancas-para-jugadores/', 'Bancas para jugadores', '¿Buscas bancas para jugadores?', 'Set completo (2 bancas + árbitros) o por pieza.', 'Chatbot · Bancas para jugadores',
'[
  {"key":"presentacion","bot":"¡Hola! 👋 Cotizamos bancas para jugadores. ¿Cómo las necesitas?","type":"chips","options":["Set completo (2 bancas + árbitros)","Solo bancas (sin set)","No sé / asesórame"]},
  {"key":"formato","bot":"¿Para qué formato?","type":"chips","options":["Fútbol 5","Fútbol 7","Fútbol 9","Fútbol 11","A medida"]},
  {"key":"ciudad","bot":"¿En qué ciudad las necesitas?","type":"text","ph":"Ej. Cancún, Q. Roo"},
  {"key":"nombre","bot":"¿A qué nombre preparamos la cotización?","type":"text","ph":"Tu nombre"},
  {"key":"tiempo","bot":"¿En qué tiempo quieres comenzar?","type":"chips","options":["Lo antes posible","Este año","Solo cotizando"]},
  {"key":"whatsapp","bot":"¿A qué WhatsApp te enviamos la cotización?","type":"text","ph":"10 dígitos","validate":"phone","optional":true,"skip":"No lo dejó"}
]'),

('/alumbrado-para-canchas-de-futbol/', 'Alumbrado', '¿Necesitas alumbrado para tu cancha?', 'Cotiza según uso, postes y tamaño.', 'Chatbot · Alumbrado',
'[
  {"key":"uso","bot":"¡Hola! 👋 Cotizamos alumbrado deportivo. ¿Para qué uso es?","type":"chips","options":["Entrenamiento / uso interno","Partidos / renta","Mixto","No sé"]},
  {"key":"postes","bot":"¿Ya cuentas con postes/estructura o los necesitas?","type":"chips","options":["Ya tengo postes","Necesito postes","No sé"]},
  {"key":"tamano","bot":"¿Tamaño de la cancha?","type":"chips","options":["Pequeña","Estándar","Grande","No sé"]},
  {"key":"ciudad","bot":"¿En qué ciudad está la cancha?","type":"text","ph":"Ej. Cancún, Q. Roo"},
  {"key":"nombre","bot":"¿A qué nombre preparamos la cotización?","type":"text","ph":"Tu nombre"},
  {"key":"tiempo","bot":"¿En qué tiempo quieres comenzar?","type":"chips","options":["Lo antes posible","Este año","Solo cotizando"]},
  {"key":"whatsapp","bot":"¿A qué WhatsApp te enviamos la cotización?","type":"text","ph":"10 dígitos","validate":"phone","optional":true,"skip":"No lo dejó"}
]'),

('/la-escuela-es-nuestra/', 'Escuelas · La Escuela Es Nuestra', '¿Tu escuela quiere su cancha con el programa La Escuela Es Nuestra?', 'Te ayudamos con el recurso y la cotización.', 'Chatbot · Escuelas · La Escuela Es Nuestra',
'[
  {"key":"recurso","bot":"¡Hola! 👋 Apoyamos a escuelas con su cancha de fútbol 7. ¿Cómo va el recurso para la cancha?","type":"chips","options":["Ya tenemos el recurso del programa La Escuela Es Nuestra","Estamos por aplicar al programa","Tenemos recurso propio del plantel","Aún no sé / necesito orientación"]},
  {"key":"plantel","bot":"¿Cómo se llama la escuela?","type":"text","ph":"Nombre completo de la escuela"},
  {"key":"ciudad","bot":"¿En qué ciudad o municipio (y estado) está la escuela?","type":"text","ph":"Ej. Cancún, Q. Roo"},
  {"key":"nombre","bot":"¿A qué nombre preparamos la cotización?","type":"text","ph":"Tu nombre"},
  {"key":"tiempo","bot":"¿En qué tiempo quieres comenzar?","type":"chips","options":["Lo antes posible","Este año","Solo cotizando"]},
  {"key":"whatsapp","bot":"¿A qué WhatsApp te enviamos la cotización?","type":"text","ph":"10 dígitos","validate":"phone","optional":true,"skip":"No lo dejó"}
]');
