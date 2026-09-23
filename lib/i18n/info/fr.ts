import type { InfoCopy } from "./types";

const info: InfoCopy = {
  nav: { about: "À propos d’Exchange Notes", community: "Communauté et sécurité", privacy: "Informations de confidentialité", contact: "Nous contacter", home: "Retour à l’accueil", back: "Retour à Aide et à propos", related: "Pour aller plus loin" },
  help: { description: "Découvrez l’idée derrière Exchange Notes, nos principes de partage et le traitement des données. Vous pouvez aussi revoir la visite guidée.", about: "Échangez une phrase. Découvrez un autre regard sur le monde.", community: "Rester curieux et respecter les limites de chacun", privacy: "Comprendre vos données, les services d’IA et vos choix" },
  about: {
    tagline: "Échangez une phrase. Découvrez un autre regard sur le monde.",
    greeting: "Bonjour, je suis Yumi. Chaque phrase qui reste en mémoire a une histoire. Explorons-la ensemble et écoutons comment les autres la comprennent.",
    storyTitle: "Pourquoi Exchange Notes existe",
    story: [
      "Certains mots nous trouvent en voyage. D’autres ne prennent leur sens qu’en grandissant. Ils gardent les lieux, les liens et les émotions d’un instant, longtemps après qu’il est passé.",
      "J’ai créé Exchange Notes pour préserver ces moments. Gardez une phrase, son contexte et ce qu’elle signifie pour vous. Lorsqu’une personne d’un autre pays, d’une autre génération ou d’une autre culture découvre ces mêmes mots, ils peuvent évoquer une autre histoire, un autre sens. Chaque interprétation a ses racines.",
      "Je souhaite que l’apprentissage des langues commence par cette curiosité : comprendre les mots, entendre le ton et se rapprocher de la personne qui parle. Chaque échange peut nous faire découvrir le monde et mieux nous connaître.",
    ],
    featuresTitle: "Apprendre à partir du quotidien",
    features: [
      { title: "Comprendre ce qui vous entoure", body: "Identifiez des objets avec l’appareil photo et lisez les menus. Faites de vos découvertes en voyage des occasions d’apprendre." },
      { title: "Trouver les mots qu’il vous faut", body: "Utilisez la saisie de texte, la reconnaissance vocale et la traduction pour vous exercer à vous exprimer et explorer les nuances et contextes culturels possibles." },
      { title: "Garder une trace de votre curiosité", body: "Explorez le monde avec les actualités de Discovery, relevez les mots à apprendre, puis enregistrez-les et révisez-les dans votre carnet de langues." },
    ],
    ai: { title: "Apprendre avec l’IA, garder son jugement", body: "L’IA aide à reconnaître, traduire et organiser pour commencer plus facilement à comprendre et à pratiquer. Yumi vous accompagne dans l’apprentissage grâce à l’IA. Ses interprétations culturelles sont des pistes : elles peuvent être erronées et ne révèlent pas les véritables intentions d’une personne. Si le sens reste incertain, poser une question fait aussi partie de l’apprentissage." },
    closing: "Faites du monde que vous découvrez des notes à échanger.",
    planet: "Planète desservie en priorité : la Terre.",
  },
  community: {
    intro: "Chaque histoire mérite le respect. Faisons d’Exchange Notes un lieu où l’on peut poser des questions, partager et apprendre avec attention.",
    rules: [
      { title: "Respecter les différences", body: "Respectez les langues, les accents, les identités et les cultures. Partagez votre expérience sans faire du point de vue d’une personne la voix de tout un groupe." },
      { title: "Partager ce que vous avez le droit de partager", body: "Respectez le droit d’auteur et la vie privée. Conservez la source lorsque vous citez une actualité. Obtenez un consentement approprié avant d’enregistrer, de photographier ou de partager les conversations ou les données identifiantes d’autrui." },
      { title: "Ne pas nuire ni exploiter", body: "Le harcèlement, les menaces, la haine, les escroqueries, l’usurpation d’identité et la divulgation d’informations privées sont interdits, tout comme les contenus liés à l’exploitation sexuelle des enfants ou incitant à la violence." },
      { title: "Distinguer les faits des interprétations", body: "Un ressenti personnel, un reportage et une hypothèse de l’IA sont des choses différentes. Ne présentez pas une traduction, un résumé ou une interprétation culturelle comme un fait vérifié. Consultez l’original et sa source avant de partager." },
      { title: "Se protéger et protéger les autres", body: "N’envoyez pas de mots de passe, de pièces d’identité, de coordonnées de paiement ou de contenus privés sans autorisation. Cessez l’échange et contactez-nous si quelqu’un demande de l’argent, des codes de vérification ou des images intimes." },
      { title: "Vérifier les décisions importantes", body: "La lecture d’un menu ne garantit pas une liste complète des ingrédients ou allergènes ; demandez au restaurant. Pour les décisions médicales, juridiques, de sécurité personnelle ou autres décisions importantes, consultez un professionnel compétent ou une source officielle." },
    ],
    contact: "Écrivez-nous en cas de contenu nuisible ou de problème dans un échange. Décrivez les faits sans joindre d’informations privées inutiles.",
  },
  privacy: {
    intro: "Vos notes contiennent vos expériences et parfois les histoires d’autres personnes. Cette page présente le traitement des données lié aux fonctions actuelles et les choix à votre disposition.",
    status: "Projet avant publication",
    notice: "Ces informations sont un projet, et non une politique de confidentialité complète et définitive. L’identité juridique de l’exploitant, les régions desservies, les durées de conservation, les procédures de suppression, l’âge minimum et l’offre du fournisseur d’IA restent à confirmer. Ces éléments et une date d’entrée en vigueur seront ajoutés avant la finalisation pour publication.",
    sections: [
      { title: "Les données traitées", body: "Selon les fonctions utilisées, Exchange Notes traite les données de compte et préférences linguistiques, les notes, le vocabulaire, les messages, les résultats d’apprentissage et les textes, images ou sons transmis. Cela permet la connexion, l’enregistrement, la synchronisation, les échanges, la reconnaissance et la traduction. Les rappels et connexions d’appareils nécessitent aussi les informations d’abonnement et de connexion correspondantes." },
      { title: "IA et autres prestataires", body: "Certaines fonctions utilisent Google Gemini et lui transmettent les textes, contextes de notes, images ou sons concernés. Les comptes et données dans le cloud utilisent Supabase. La reconnaissance vocale peut aussi recourir au navigateur ou au système d’exploitation ; elle ne fonctionne pas nécessairement uniquement sur votre appareil. Les conditions de conservation, d’amélioration des modèles et de contrôle humain doivent encore être confirmées selon l’offre utilisée." },
      { title: "Partage et liens externes", body: "Lorsque vous envoyez un message ou partagez une note, les destinataires peuvent voir son contenu et les informations de profil associées selon les permissions de la fonction. Ils peuvent garder des copies ou captures ; révoquer l’accès ne garantit pas leur récupération. Les sites externes, notamment les sources d’actualités de Discovery, appliquent leurs propres politiques." },
      { title: "Autorisations et stockage local", body: "Les cookies et le stockage local servent à la connexion, aux préférences de langue et d’interface et aux caches. Vous pouvez régler l’accès à l’appareil photo, au microphone et aux notifications dans l’appareil ou le navigateur. Le retirer peut affecter ces fonctions, sans supprimer automatiquement les contenus déjà transmis. Se déconnecter ou désinstaller ne supprime pas le compte dans le cloud." },
      { title: "Conservation et suppression", body: "Les durées de conservation et délais de suppression des comptes, notes, pièces jointes, contenus d’IA, journaux et sauvegardes restent à confirmer. Nous ne pouvons promettre une suppression immédiate ni une absence de conservation. Vous pouvez demander par courriel la suppression de données ou du compte ; son traitement dépend des données, des copies des destinataires et du droit applicable." },
      { title: "Vos droits", body: "Selon votre lieu de résidence et le droit applicable, vous pouvez disposer de droits d’accès, de rectification, d’effacement, de portabilité, de limitation ou d’opposition au traitement et de retrait du consentement. Contactez-nous ci-dessous ; une vérification appropriée de votre identité peut être nécessaire. Vous pouvez aussi saisir l’autorité de protection des données compétente." },
      { title: "Régions desservies et sécurité", body: "Nous souhaitons accueillir des personnes de différents pays et régions. La disponibilité dépend des territoires de distribution, des prestataires et du droit applicable. Les données peuvent être traitées à l’étranger ; les lieux et garanties restent à confirmer. Aucun service en ligne ne peut garantir une sécurité absolue. Évitez de transmettre des informations sensibles inutiles." },
      { title: "Conditions d’accès et mises à jour", body: "L’âge minimum et les conditions d’accès doivent encore être confirmés selon les marchés et les exigences du fournisseur d’IA. Cette page ne signifie pas que le service convient à tous les âges. La politique finale précisera l’exploitant, les bases du traitement, tous les prestataires et les modalités de mise à jour. Les changements importants seront notifiés, avec consentement si nécessaire." },
    ],
    contact: "Pour toute question de confidentialité ou demande liée à vos droits ou à une suppression, contactez :",
  },
};
export default info;
