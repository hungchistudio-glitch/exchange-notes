import type { LegalCopy } from "./types";

const legal: LegalCopy = {
  effective: "En vigor desde el {date}",
  privacy: {
    intro:
      "Tus notas guardan experiencias personales y, a veces, historias de otras personas. Esta política explica qué datos recoge Exchange Notes, por qué, quién los trata con nosotros, cuánto tiempo se conservan y qué opciones tienes.",
    summaryTitle: "En resumen",
    summary: [
      "Exchange Notes lo gestiona Hungchi Studio, un estudio independiente dirigido por una persona en Taiwán.",
      "De tu cuenta de Google solo recibimos tu nombre, correo electrónico, foto de perfil e identificador de cuenta, y solo los usamos para gestionar tu cuenta.",
      "Las funciones de IA envían el texto, las imágenes o el audio correspondientes a Google Gemini. Usamos el nivel gratuito de Gemini, en el que Google puede usar ese contenido para mejorar sus productos y personas pueden revisarlo, así que no envíes nada sensible.",
      "No vendemos tus datos, no mostramos anuncios y no usamos rastreadores publicitarios ni de analítica.",
      "Puedes eliminar tu cuenta y sus datos cuando quieras en Ajustes → Eliminar cuenta.",
    ],
    sections: [
      {
        title: "Quiénes somos",
        body: [
          "Exchange Notes (la “app”) está gestionada por Hungchi Studio, un estudio independiente dirigido por una persona física en Taiwán y no una empresa registrada. Hungchi Studio decide cómo y para qué se tratan los datos personales descritos aquí y es responsable de ellos. Puedes escribirnos a la dirección que aparece al final de esta página.",
        ],
      },
      {
        title: "Qué recibimos de tu cuenta de Google",
        body: [
          "Inicias sesión con Google. Con tu permiso, Google nos facilita tu nombre, tu dirección de correo electrónico, tu foto de perfil y un identificador único de tu cuenta de Google. Solo los usamos para crear y proteger tu cuenta, mostrar tu perfil y mantener tu sesión iniciada.",
          "Nunca recibimos tu contraseña de Google ni pedimos acceso a Gmail, Drive, Contactos u otros servicios de Google. No vendemos los datos de usuario de Google, no los usamos para publicidad ni para entrenar modelos de IA. Puedes retirar el acceso de la app cuando quieras desde los ajustes de seguridad de tu cuenta de Google.",
        ],
      },
      {
        title: "Lo que creas y envías",
        body: [
          "Según las funciones que uses, guardamos lo que pones en la app para que funcione y se sincronice entre tus dispositivos:",
        ],
        points: [
          "Tu perfil: nombre visible, Exchange ID, foto de perfil, idiomas nativo y de aprendizaje, y preferencias como el idioma de la interfaz, el modo y el objetivo diario.",
          "Notas y vocabulario: palabras, traducciones, ejemplos, notas, fuentes, etiquetas, las imágenes que guardas con ellas, colecciones e historial de repaso.",
          "Mensajes y contenido compartido: mensajes, adjuntos y palabras que envías, notas que compartes, solicitudes de amistad y amistades.",
          "Aprendizaje y Yumi: puntuaciones de pronunciación (guardamos las puntuaciones, no las grabaciones), resultados de repaso, el estado de Yumi, las galletas de energía y lo que lleva puesto.",
        ],
      },
      {
        title: "Lo que se recoge automáticamente",
        body: ["Al usar la app se genera algo de información de forma automática:"],
        points: [
          "Suscripciones a notificaciones: si activas los recordatorios, el punto de envío y las claves push de tu navegador, el nombre del dispositivo y el tipo de navegador, o el token push de tu iPhone, además de tu zona horaria para que los recordatorios lleguen a una hora razonable.",
          "Acceso del widget: si conectas el widget de la pantalla de inicio, un token que solo guardamos cifrado mediante hash.",
          "Ubicación aproximada: el cielo de la tienda muestra el tiempo donde estás. Nuestro proveedor de alojamiento estima una posición aproximada a partir de tu dirección IP; la redondeamos a unos 10 km, la usamos para consultar el tiempo y no la guardamos.",
          "Límites de uso y errores: el número diario de solicitudes de IA por cuenta, para aplicar el límite compartido, y registros de llamadas de IA fallidas que no contienen nada tuyo.",
          "Registros del servidor: nuestros proveedores de alojamiento y base de datos guardan registros técnicos (como la dirección IP, el tipo de navegador y la hora de la solicitud) para operar y proteger el servicio.",
        ],
        after: [
          "No usamos cookies publicitarias, identificadores publicitarios ni analítica de terceros. No se envía nada sobre cómo usas la app a ningún proveedor de analítica.",
        ],
      },
      {
        title: "Cómo los usamos",
        body: [
          "Para ofrecer la app: inicio de sesión, guardado y sincronización, traducción y reconocimiento, repasos, mensajes, contenido compartido, recordatorios y el widget. Para mantenerla operativa y segura: prevenir abusos, aplicar límites de uso, corregir problemas y proteger las cuentas. Y para cumplir la ley.",
          "Cuando se aplican leyes de protección de datos como el RGPD, nos basamos en la ejecución de nuestro acuerdo contigo (ofrecer las funciones que usas), nuestro interés legítimo (mantener el servicio seguro y operativo), tu consentimiento (notificaciones y permisos del dispositivo, que puedes retirar) y las obligaciones legales.",
        ],
      },
      {
        title: "Funciones de IA y Google Gemini",
        body: [
          "Funciones como reconocer objetos y menús, traducir, explicar palabras, notas y mensajes, la búsqueda por voz y las interpretaciones de Yumi envían desde nuestro servidor el texto, el contexto de la nota, la imagen o el audio correspondientes a la API de Gemini de Google. Parte del reconocimiento de la cámara se ejecuta por completo en tu dispositivo y no envía nada. El reconocimiento de voz de tu navegador o sistema operativo puede gestionarlo Apple, Google u otro proveedor según sus propias condiciones.",
          "Actualmente Exchange Notes usa el nivel gratuito de Gemini. Según las condiciones de Google para los servicios gratuitos, Google puede usar el contenido que recibe y las respuestas que genera para ofrecer, mejorar y desarrollar sus productos y tecnologías de aprendizaje automático, y personas pueden leerlo, anotarlo y procesarlo. No envíes información sensible —como datos de salud, documentos de identidad, contraseñas, datos financieros o datos privados de otras personas— a las funciones de IA.",
          "Los resultados de la IA pueden ser erróneos. Trata las traducciones, los reconocimientos y las interpretaciones culturales como sugerencias, no como hechos.",
        ],
      },
      {
        title: "Proveedores de servicios",
        body: [
          "Usamos estos proveedores para hacer funcionar la app. Cada uno trata los datos según sus propias condiciones y solo para el fin indicado:",
        ],
        points: [
          "Supabase: cuentas, base de datos y almacenamiento de archivos (servidores en Canadá).",
          "Vercel: alojamiento y funciones de servidor (servidores principalmente en Estados Unidos, con una red global).",
          "Google: inicio de sesión, la API de Gemini, fuentes web y un modelo de imagen que se descarga de los servidores de Google y se ejecuta en tu dispositivo.",
          "MyMemory (Translated, Italia) y Free Dictionary API: la palabra o frase breve que se consulta, enviada desde nuestro servidor, para algunas traducciones y pronunciaciones.",
          "Open-Meteo: solo coordenadas redondeadas, para el tiempo de la tienda.",
          "Servicios push de Apple, Google y Mozilla: para entregar las notificaciones que activas.",
        ],
      },
      {
        title: "Quién puede ver qué",
        body: [
          "Otras personas con sesión iniciada pueden encontrar tu perfil público —nombre visible, Exchange ID, foto de perfil e idiomas— para añadirte como amistad. Los mensajes, las notas y las palabras que compartes los ven las personas a quienes se los envías, que pueden guardar copias o capturas. Las fotos de perfil se guardan en direcciones web públicas para que los dispositivos de tus amistades puedan mostrarlas; cualquiera que tenga el enlace puede ver la foto.",
          "No vendemos ni alquilamos datos personales. Solo los comunicamos a los proveedores anteriores, cuando la ley lo exige o para proteger la seguridad de las personas, o, si la app pasara a otro responsable, a ese responsable conforme a esta política y avisándote.",
        ],
      },
      {
        title: "Tratamiento internacional",
        body: [
          "Operamos desde Taiwán y nuestros proveedores tratan datos en Canadá, Estados Unidos y otros países donde tienen instalaciones, cuyas leyes de protección de datos pueden ser distintas de las tuyas. Nos apoyamos en los compromisos contractuales de protección de datos de nuestros proveedores, incluidas las cláusulas contractuales tipo cuando procede.",
        ],
      },
      {
        title: "Cuánto tiempo los conservamos",
        points: [
          "Tu cuenta y tu contenido: hasta que los elimines o elimines tu cuenta.",
          "Al eliminar tu cuenta: tu perfil, tu contenido, los mensajes que enviaste, tus amistades, tus archivos y Yumi se eliminan de inmediato de nuestra base de datos y almacenamiento activos. Pueden quedar copias en las copias de seguridad cifradas de nuestro proveedor durante poco tiempo, normalmente no más de 30 días, hasta que se sobrescriben.",
          "Las cachés compartidas de traducciones y pronunciaciones se conservan para acelerar las búsquedas; se guardan por palabra, no por persona.",
          "Los registros del servidor los conservan nuestros proveedores durante periodos breves según su configuración.",
          "El contenido enviado a Gemini lo conserva Google según sus propias condiciones.",
        ],
        after: [
          "Actualmente no eliminamos automáticamente las cuentas inactivas. Si eso cambia, te avisaremos antes.",
        ],
      },
      {
        title: "Tus opciones y derechos",
        body: [
          "Puedes editar tu perfil, eliminar notas, palabras y mensajes concretos, dejar de compartir, desactivar las notificaciones y cambiar los permisos de cámara, micrófono y notificaciones cuando quieras. Puedes eliminar toda tu cuenta en Ajustes → Eliminar cuenta.",
          "Según donde vivas, también puedes tener derecho a acceder a tus datos, obtener una copia portátil, rectificarlos, suprimirlos, limitar u oponerte a su tratamiento y retirar tu consentimiento. En Taiwán, la Ley de Protección de Datos Personales te permite consultar, revisar y copiar tus datos, completarlos o corregirlos, y pedirnos que dejemos de recogerlos, tratarlos o usarlos, o que los eliminemos. Escríbenos para hacer una solicitud; responderemos en un plazo de 30 días y puede que necesitemos confirmar tu identidad. También puedes presentar una reclamación ante tu autoridad de protección de datos.",
          "No vendemos ni compartimos información personal para publicidad comportamental entre contextos.",
        ],
      },
      {
        title: "Edad",
        body: [
          "Exchange Notes es para personas de 18 años o más, porque las condiciones de nuestro proveedor de IA no permiten servicios dirigidos a menores de esa edad o que puedan usar. No recogemos a sabiendas datos de menores de 18 años. Si crees que alguien menor de 18 años tiene una cuenta, escríbenos y la eliminaremos.",
        ],
      },
      {
        title: "Seguridad",
        body: [
          "Las conexiones están cifradas con HTTPS. Las reglas de la base de datos limitan cada cuenta a sus propios datos y a lo que otras personas han compartido con ella, las imágenes que guardas con tus palabras se almacenan de forma privada y las claves que pueden saltarse esas reglas solo están en nuestro servidor. Parte de tus notas y palabras también se guardan en tu dispositivo para usarlas sin conexión y se borran al cerrar sesión.",
          "Ningún servicio en línea es totalmente seguro. No guardes contraseñas, documentos de identidad ni otra información sensible en la app. Si sabemos de una brecha que afecte a tus datos, te lo notificaremos a ti y a las autoridades competentes según exija la ley.",
        ],
      },
      {
        title: "Cookies y almacenamiento local",
        body: [
          "Solo usamos lo que la app necesita para funcionar: cookies de inicio de sesión, tus preferencias de idioma y visualización, y copias sin conexión de tu contenido en tu dispositivo. Ninguna se usa para publicidad ni para rastrearte entre sitios.",
        ],
      },
      {
        title: "Cambios en esta política",
        body: [
          "Cuando cambiemos esta política actualizaremos la fecha de arriba. Si un cambio afecta de forma importante al uso de tus datos, te avisaremos en la app o por correo electrónico antes de que entre en vigor y, cuando la ley lo exija, te pediremos tu consentimiento.",
        ],
      },
    ],
    contact: "¿Preguntas, solicitudes sobre tus datos o inquietudes? Escribe a Hungchi Studio:",
  },
  terms: {
    intro:
      "Estas condiciones son el acuerdo entre tú y Hungchi Studio para usar Exchange Notes. Léelas junto con la Política de privacidad y los principios de Comunidad y seguridad.",
    summaryTitle: "En resumen",
    summary: [
      "Debes tener 18 años o más e iniciar sesión con tu propia cuenta de Google.",
      "Lo que escribes sigue siendo tuyo; solo nos permites guardarlo y tratarlo para que la app funcione para ti.",
      "Los resultados de la IA pueden ser erróneos y no son asesoramiento profesional.",
      "Las galletas de energía y los artículos de la tienda son gratuitos, virtuales y no tienen valor económico.",
      "La app está en beta y se ofrece tal cual. Se aplica la ley de Taiwán.",
    ],
    sections: [
      {
        title: "Sobre estas condiciones",
        body: [
          "Exchange Notes (la “app”) la ofrece Hungchi Studio, un estudio independiente dirigido por una persona física en Taiwán (“nosotros”). Al crear una cuenta o usar la app, aceptas estas condiciones. Si no estás de acuerdo, no uses la app.",
        ],
      },
      {
        title: "Quién puede usarla",
        body: [
          "Debes tener al menos 18 años y capacidad para celebrar un contrato vinculante. Inicias sesión con tu propia cuenta de Google y eres responsable de la actividad de tu cuenta y de mantener segura tu cuenta de Google. Avísanos cuanto antes si crees que otra persona está usando tu cuenta.",
        ],
      },
      {
        title: "El servicio",
        body: [
          "Exchange Notes es actualmente gratuito y está en beta. Las funciones pueden cambiar, limitarse —por ejemplo, las funciones de IA comparten un límite diario entre todas las personas— o dejar de ofrecerse, y la app puede no estar disponible en algún momento. Intentaremos avisar con antelación razonable de los cambios importantes y, antes de cerrar el servicio, te daremos la oportunidad de guardar tus notas.",
        ],
      },
      {
        title: "Tu contenido",
        body: [
          "Conservas la propiedad de todo lo que creas o subes. Nos concedes una licencia mundial, no exclusiva y gratuita para alojarlo, almacenarlo, copiarlo, tratarlo, traducirlo y mostrarlo solo en la medida necesaria para que la app funcione para ti, incluido enviarlo a los proveedores descritos en la Política de privacidad, como Google Gemini, y mostrarlo a las personas con quienes decidas compartirlo. Esta licencia termina cuando eliminas el contenido o tu cuenta, salvo las copias que otras personas ya hayan guardado y las copias de seguridad conservadas durante un tiempo limitado.",
          "Eres responsable de tu contenido y confirmas que tienes derecho a compartirlo, incluidas citas, fotografías y cualquier cosa sobre otras personas.",
        ],
      },
      {
        title: "Uso aceptable",
        body: ["Sigue los principios de Comunidad y seguridad. En particular, no:"],
        points: [
          "infrinjas la ley ni los derechos de nadie, incluidos los derechos de autor y la privacidad;",
          "acoses, amenaces, suplantes o engañes a otras personas, ni promuevas el odio o la violencia;",
          "compartas contenido sexual que involucre a menores, que denunciaremos a las autoridades;",
          "envíes spam, software malicioso ni publicidad no solicitada;",
          "accedas a datos de otras personas, pongas a prueba o eludas la seguridad o los límites de uso, ni sobrecargues el servicio;",
          "extraigas, copies o revendas la app o su contenido con herramientas automatizadas, ni la uses para crear un modelo de IA competidor.",
        ],
      },
      {
        title: "Funciones de IA",
        body: [
          "Los reconocimientos, las traducciones, las explicaciones y las interpretaciones de Yumi se generan automáticamente y pueden ser inexactos, incompletos o culturalmente desacertados. No son asesoramiento médico, jurídico, financiero, dietético ni profesional de ningún tipo. El reconocimiento de menús no puede confirmar ingredientes ni alérgenos: pregunta siempre en el restaurante. Comprueba lo importante con una fuente fiable y no envíes información sensible a las funciones de IA.",
        ],
      },
      {
        title: "Yumi, las galletas de energía y la tienda",
        body: [
          "Las galletas de energía se ganan aprendiendo y se gastan en artículos para Yumi. Tanto ellas como los artículos son virtuales, no tienen valor económico, no se pueden canjear por dinero, vender ni transferir, y no son de tu propiedad. Podemos ajustar los saldos para corregir errores o abusos. Hoy no se puede comprar nada con dinero real; si algún día se ofrecen artículos de pago, el precio y las condiciones adicionales se mostrarán antes de pagar.",
        ],
      },
      {
        title: "Nuestros derechos",
        body: [
          "La app, su diseño y su código, el nombre y el logotipo de Exchange Notes y el personaje de Yumi pertenecen a Hungchi Studio, salvo los componentes de terceros usados bajo sus propias licencias. Estas condiciones no te dan ningún derecho a usar nuestro nombre, logotipo ni a Yumi, salvo como parte del uso de la app.",
        ],
      },
      {
        title: "Otros servicios y enlaces",
        body: [
          "La app enlaza a fuentes de noticias y depende de servicios como Google. Su contenido y sus servicios se rigen por sus propias condiciones y políticas, y no somos responsables de ellos.",
        ],
      },
      {
        title: "Fin del uso",
        body: [
          "Puedes dejar de usar la app y eliminar tu cuenta cuando quieras en Ajustes → Eliminar cuenta. Podemos suspender o cerrar una cuenta que incumpla estas condiciones de forma grave o reiterada, o cuando la ley lo exija. Cuando sea razonable, te explicaremos el motivo y te daremos la oportunidad de responder.",
        ],
      },
      {
        title: "Exención de garantías",
        body: [
          "En la medida en que la ley lo permita, la app se ofrece “tal cual” y “según disponibilidad”, sin garantías de ningún tipo, incluida la de que funcione sin interrupciones, sin errores o para un fin concreto.",
        ],
      },
      {
        title: "Limitación de responsabilidad",
        body: [
          "En la medida en que la ley lo permita, Hungchi Studio no responde de pérdidas indirectas, incidentales o consecuentes, ni de la pérdida de datos, beneficios o reputación derivada del uso de la app. Nada en estas condiciones limita la responsabilidad que la ley no permite limitar, como en casos de dolo o negligencia grave, ni tus derechos como persona consumidora conforme a las leyes imperativas del lugar donde vives.",
        ],
      },
      {
        title: "Cambios en estas condiciones",
        body: [
          "Podemos actualizar estas condiciones. Cambiaremos la fecha de arriba y, si los cambios son importantes, te avisaremos en la app o por correo electrónico antes de que entren en vigor. Si sigues usando la app después, se aplicarán las condiciones actualizadas; si no estás de acuerdo, puedes eliminar tu cuenta.",
        ],
      },
      {
        title: "Ley aplicable",
        body: [
          "Estas condiciones se rigen por las leyes de Taiwán (República de China). Las controversias las resolverá un tribunal competente de Taiwán, salvo que las leyes imperativas del lugar donde vives como persona consumidora te permitan acudir a sus tribunales.",
        ],
      },
    ],
    contact: "¿Preguntas sobre estas condiciones? Escribe a Hungchi Studio:",
  },
};

export default legal;
