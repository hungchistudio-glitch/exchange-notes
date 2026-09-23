import type { InfoCopy } from "./types";

const info: InfoCopy = {
  nav: { about: "Acerca de Exchange Notes", community: "Comunidad y seguridad", privacy: "Información de privacidad", contact: "Contáctanos", home: "Volver al inicio", back: "Volver a Ayuda e información", related: "Sigue descubriendo" },
  help: { description: "Descubre la idea detrás de Exchange Notes, nuestros principios para compartir y cómo se tratan los datos. También puedes repetir el recorrido.", about: "Intercambia una frase. Descubre otra forma de ver el mundo.", community: "Mantén la curiosidad y respeta los límites de los demás", privacy: "Conoce tus datos, los servicios de IA y tus opciones" },
  about: {
    tagline: "Intercambia una frase. Descubre otra forma de ver el mundo.",
    greeting: "Hola, soy Yumi. Cada frase que recuerdas tiene una historia. Vamos a descubrirla y a escuchar cómo la entienden los demás.",
    storyTitle: "Por qué existe Exchange Notes",
    story: [
      "Hay palabras que encontramos en un viaje y otras que solo entendemos al crecer. Conservan los lugares, las relaciones y las emociones de aquel momento, mucho después de que haya pasado.",
      "Creé Exchange Notes para conservar esos momentos. Guarda una frase, su contexto y lo que significa para ti. Cuando alguien de otro país, generación o cultura encuentra esas mismas palabras, puede recordar otra historia o descubrir otro significado. Cada interpretación tiene su propio origen.",
      "Quiero que aprender idiomas empiece con esa curiosidad: comprender las palabras, percibir el tono y acercarnos a quien habla. Cada intercambio puede ser una oportunidad para descubrir el mundo y conocernos mejor.",
    ],
    featuresTitle: "Aprende a partir de lo cotidiano",
    features: [
      { title: "Comprende lo que tienes delante", body: "Identifica objetos con la cámara y lee menús. Convierte lo que encuentras en tus viajes en material de aprendizaje." },
      { title: "Encuentra las palabras que necesitas", body: "Utiliza texto, reconocimiento de voz y traducción para practicar cómo expresarte y explorar posibles tonos y contextos culturales." },
      { title: "Conserva tu curiosidad", body: "Descubre el mundo con las noticias de Discovery, extrae las palabras que quieras aprender y guárdalas y repásalas en tu propio cuaderno de idiomas." },
    ],
    ai: { title: "Aprende con IA y conserva tu criterio", body: "La IA ayuda a reconocer, traducir y organizar para que puedas empezar a comprender y practicar antes. Yumi es tu compañera de aprendizaje con IA. Sus interpretaciones culturales son orientativas: pueden equivocarse y no determinan las verdaderas intenciones de nadie. Si algo no queda claro, preguntar también es aprender." },
    closing: "Convierte el mundo que descubres en notas para intercambiar.",
    planet: "Nuestro planeta: la Tierra.",
  },
  community: {
    intro: "Cada historia merece respeto. Ayuda a que Exchange Notes sea un lugar donde preguntar, compartir y aprender con consideración.",
    rules: [
      { title: "Respeta las diferencias", body: "Respeta los idiomas, acentos, identidades y culturas. Comparte tu experiencia sin presentar la opinión de una persona como la voz de todo un grupo." },
      { title: "Comparte lo que tienes derecho a compartir", body: "Respeta los derechos de autor y la privacidad. Conserva la fuente al citar noticias. Obtén el consentimiento adecuado antes de grabar, fotografiar o compartir conversaciones o información que identifique a otras personas." },
      { title: "No dañes ni explotes a otras personas", body: "No acoses, amenaces, promuevas el odio, estafes, suplantes identidades ni reveles información privada. No difundas contenido relacionado con la explotación sexual infantil o la incitación a la violencia." },
      { title: "Distingue hechos e interpretaciones", body: "Las emociones personales, las noticias y las conjeturas de la IA son cosas distintas. No presentes traducciones, resúmenes o interpretaciones culturales como hechos verificados. Comprueba el original y su fuente antes de compartir." },
      { title: "Protégete y protege a los demás", body: "No envíes contraseñas, documentos de identidad, datos de pago ni contenido privado que no tengas autorización para compartir. Interrumpe el contacto y escríbenos si alguien pide dinero, códigos de verificación o imágenes íntimas." },
      { title: "Verifica las decisiones importantes", body: "El reconocimiento de menús no garantiza información completa sobre ingredientes o alérgenos; consulta al restaurante. Para decisiones médicas, legales, de seguridad personal u otras de gran importancia, consulta a un profesional adecuado o una fuente oficial." },
    ],
    contact: "Escríbenos si encuentras contenido perjudicial o problemas en un intercambio. Explica lo ocurrido sin incluir información privada innecesaria.",
  },
  privacy: {
    intro: "Tus notas contienen experiencias personales y pueden incluir historias de otras personas. Aquí explicamos el tratamiento de datos de las funciones actuales y tus opciones.",
    status: "Borrador previo a la publicación",
    notice: "Esta información es un borrador, no una política de privacidad completa y definitiva. Quedan por confirmar los datos legales del responsable, las regiones de servicio, los plazos de conservación, los procedimientos de eliminación, la edad mínima y el plan del proveedor de IA. Se añadirán estos datos y la fecha de entrada en vigor antes de finalizar la política para su publicación.",
    sections: [
      { title: "Qué datos tratamos", body: "Según las funciones que utilices, Exchange Notes trata datos de cuenta y preferencias de idioma, notas, vocabulario, mensajes, registros de aprendizaje y el texto, las imágenes o el audio que envíes. Se utilizan para iniciar sesión, guardar, sincronizar, intercambiar, reconocer y traducir. Los recordatorios y las conexiones de dispositivos también requieren la información de suscripción y conexión correspondiente." },
      { title: "IA y otros proveedores", body: "Algunas funciones utilizan Google Gemini y envían a ese proveedor el texto, contexto de notas, imágenes o audio pertinentes. Las cuentas y los datos en la nube utilizan Supabase. El reconocimiento de voz también puede recurrir a servicios del navegador o sistema operativo; no debe suponerse que funciona solo en el dispositivo. Las condiciones de conservación, mejora de modelos y revisión humana deben confirmarse según el plan contratado." },
      { title: "Contenido compartido y enlaces externos", body: "Al enviar mensajes o compartir notas, los destinatarios pueden ver el contenido y la información de perfil asociada según los permisos de la función. Pueden guardar copias o capturas; revocar el acceso no garantiza recuperar esas copias. Los sitios externos, incluidas las fuentes de noticias de Discovery, tratan los datos conforme a sus propias políticas." },
      { title: "Permisos y almacenamiento local", body: "Las cookies y el almacenamiento local permiten el inicio de sesión, las preferencias de idioma e interfaz y las cachés. Puedes ajustar los permisos de cámara, micrófono y notificaciones en el dispositivo o navegador. Retirarlos puede afectar a esas funciones, pero no elimina automáticamente el contenido enviado. Cerrar sesión o desinstalar no elimina una cuenta en la nube." },
      { title: "Conservación y eliminación", body: "Los plazos de conservación y eliminación de cuentas, notas, archivos adjuntos, contenido de IA, registros y copias de seguridad siguen pendientes de confirmación. No podemos prometer eliminación inmediata ni conservación nula. Puedes solicitar por correo la eliminación de datos o de la cuenta; su tratamiento depende de los datos, las copias de los destinatarios y la legislación aplicable." },
      { title: "Tus derechos", body: "Según tu ubicación y la legislación aplicable, puedes tener derechos de acceso, rectificación, supresión, portabilidad, limitación u oposición al tratamiento y retirada del consentimiento. Escríbenos mediante el correo de abajo; puede ser necesario verificar tu identidad de forma adecuada. También puedes reclamar ante la autoridad de protección de datos competente." },
      { title: "Regiones de servicio y seguridad", body: "Queremos atender a personas de distintos países y regiones. La disponibilidad depende de los territorios de distribución, el soporte de los proveedores y la legislación aplicable. Los datos pueden tratarse en otros países; las ubicaciones y garantías concretas siguen pendientes de confirmación. Ningún servicio en línea puede prometer seguridad absoluta. Evita enviar información sensible innecesaria." },
      { title: "Requisitos de uso y actualizaciones", body: "La edad mínima y los requisitos de uso deben confirmarse según los mercados y las condiciones del proveedor de IA. Esta página no significa que el servicio sea apto para todas las edades. La política final incluirá datos del responsable, bases del tratamiento, información completa de proveedores y procedimientos de actualización. Los cambios importantes se comunicarán y se solicitará consentimiento cuando corresponda." },
    ],
    contact: "Para consultas de privacidad o solicitudes de derechos o eliminación, escribe a:",
  },
};
export default info;
