import type { LegalCopy } from "./types";

const legal: LegalCopy = {
  effective: "En vigueur depuis le {date}",
  privacy: {
    intro:
      "Vos notes contiennent des expériences personnelles et parfois les histoires d’autres personnes. Cette politique explique quelles données Exchange Notes collecte, pourquoi, qui les traite avec nous, combien de temps elles sont conservées et quels choix s’offrent à vous.",
    summaryTitle: "En bref",
    summary: [
      "Exchange Notes est exploitée par Hungchi Studio, un studio indépendant tenu par une personne à Taïwan.",
      "De votre compte Google, nous recevons uniquement votre nom, votre adresse e-mail, votre photo de profil et votre identifiant, et nous ne les utilisons que pour faire fonctionner votre compte.",
      "Les fonctions d’IA envoient le texte, les images ou l’audio concernés à Google Gemini. Nous utilisons l’offre gratuite de Gemini, dans laquelle Google peut utiliser ces contenus pour améliorer ses produits et des personnes peuvent les examiner : n’envoyez rien de sensible.",
      "Nous ne vendons pas vos données, n’affichons pas de publicité et n’utilisons aucun traceur publicitaire ou d’analyse.",
      "Vous pouvez supprimer votre compte et ses données à tout moment dans Réglages → Supprimer le compte.",
    ],
    sections: [
      {
        title: "Qui nous sommes",
        body: [
          "Exchange Notes (l’« app ») est exploitée par Hungchi Studio, un studio indépendant tenu par une personne physique à Taïwan, et non une société immatriculée. Hungchi Studio détermine comment et pourquoi les données personnelles décrites ici sont traitées et en est responsable. Vous pouvez nous écrire à l’adresse indiquée en bas de cette page.",
        ],
      },
      {
        title: "Ce que nous recevons de votre compte Google",
        body: [
          "Vous vous connectez avec Google. Avec votre autorisation, Google nous transmet votre nom, votre adresse e-mail, votre photo de profil et un identifiant unique de compte Google. Nous les utilisons uniquement pour créer et sécuriser votre compte, afficher votre profil et vous garder connecté.",
          "Nous ne recevons jamais votre mot de passe Google et ne demandons pas l’accès à Gmail, Drive, Contacts ou à tout autre service Google. Nous ne vendons pas les données des utilisateurs Google, ne les utilisons pas à des fins publicitaires ni pour entraîner des modèles d’IA. Vous pouvez retirer l’accès de l’app à tout moment depuis les paramètres de sécurité de votre compte Google.",
        ],
      },
      {
        title: "Ce que vous créez et envoyez",
        body: [
          "Selon les fonctions que vous utilisez, nous conservons ce que vous mettez dans l’app pour qu’elle fonctionne et se synchronise entre vos appareils :",
        ],
        points: [
          "Votre profil : nom affiché, Exchange ID, photo de profil, langues maternelle et d’apprentissage, et préférences comme la langue de l’interface, le mode et l’objectif quotidien.",
          "Notes et vocabulaire : mots, traductions, exemples, notes, sources, étiquettes, images enregistrées avec eux, collections et historique de révision.",
          "Messages et partages : messages, pièces jointes et mots que vous envoyez, notes que vous partagez, demandes d’ami et amitiés.",
          "Apprentissage et Yumi : scores de prononciation (nous gardons les scores, pas les enregistrements), résultats de révision, état de Yumi, biscuits d’énergie et objets qu’elle porte.",
        ],
      },
      {
        title: "Ce qui est collecté automatiquement",
        body: ["Quelques informations sont générées automatiquement pendant l’utilisation :"],
        points: [
          "Abonnements aux notifications : si vous activez les rappels, le point de terminaison et les clés push de votre navigateur, le nom de l’appareil et le type de navigateur, ou le jeton push de votre iPhone, ainsi que votre fuseau horaire pour que les rappels arrivent à une heure raisonnable.",
          "Accès du widget : si vous connectez le widget de l’écran d’accueil, un jeton que nous ne conservons que sous forme hachée.",
          "Position approximative : le ciel de la boutique reflète la météo de l’endroit où vous êtes. Notre hébergeur déduit une position approximative de votre adresse IP ; nous l’arrondissons à environ 10 km, l’utilisons pour obtenir la météo et ne la conservons pas.",
          "Limites d’utilisation et erreurs : le nombre quotidien de requêtes d’IA par compte, pour appliquer la limite partagée, et des journaux d’appels d’IA échoués qui ne contiennent rien de vous.",
          "Journaux serveur : nos fournisseurs d’hébergement et de base de données conservent des journaux techniques (adresse IP, type de navigateur, heure de la requête…) pour faire fonctionner et sécuriser le service.",
        ],
        after: [
          "Nous n’utilisons ni cookies publicitaires, ni identifiants publicitaires, ni outils d’analyse tiers. Rien sur votre utilisation de l’app n’est envoyé à un fournisseur d’analyse.",
        ],
      },
      {
        title: "Comment nous les utilisons",
        body: [
          "Pour fournir l’app : connexion, enregistrement et synchronisation, traduction et reconnaissance, révisions, messages, partages, rappels et widget. Pour qu’elle reste fonctionnelle et sûre : prévenir les abus, appliquer les limites d’utilisation, corriger les problèmes et protéger les comptes. Et pour respecter la loi.",
          "Lorsque des lois sur la protection des données comme le RGPD s’appliquent, nous nous fondons sur l’exécution de notre accord avec vous (fournir les fonctions que vous utilisez), notre intérêt légitime (garder le service sûr et fonctionnel), votre consentement (notifications et autorisations de l’appareil, que vous pouvez retirer) et nos obligations légales.",
        ],
      },
      {
        title: "Fonctions d’IA et Google Gemini",
        body: [
          "Des fonctions comme la reconnaissance d’objets et de menus, la traduction, l’explication de mots, de notes et de messages, la recherche vocale et les interprétations de Yumi envoient depuis notre serveur le texte, le contexte de la note, l’image ou l’audio concernés à l’API Gemini de Google. Une partie de la reconnaissance par caméra s’effectue entièrement sur votre appareil et n’envoie rien. La reconnaissance vocale de votre navigateur ou de votre système peut être assurée par Apple, Google ou un autre fournisseur selon ses propres conditions.",
          "Exchange Notes utilise actuellement l’offre gratuite de Gemini. Selon les conditions de Google pour les services gratuits, Google peut utiliser les contenus qu’il reçoit et les réponses qu’il génère pour fournir, améliorer et développer ses produits et ses technologies d’apprentissage automatique, et des personnes peuvent les lire, les annoter et les traiter. N’envoyez pas d’informations sensibles — données de santé, pièces d’identité, mots de passe, données financières ou informations privées sur d’autres personnes — aux fonctions d’IA.",
          "Les résultats de l’IA peuvent être erronés. Considérez les traductions, reconnaissances et interprétations culturelles comme des suggestions, pas comme des faits.",
        ],
      },
      {
        title: "Prestataires",
        body: [
          "Nous faisons appel à ces prestataires pour faire fonctionner l’app. Chacun traite les données selon ses propres conditions et uniquement pour la finalité indiquée :",
        ],
        points: [
          "Supabase : comptes, base de données et stockage de fichiers (serveurs au Canada).",
          "Vercel : hébergement et fonctions serveur (serveurs principalement aux États-Unis, avec un réseau mondial).",
          "Google : connexion, API Gemini, polices web et un modèle d’image téléchargé depuis les serveurs de Google et exécuté sur votre appareil.",
          "MyMemory (Translated, Italie) et Free Dictionary API : le mot ou la courte expression recherchés, envoyés depuis notre serveur, pour certaines traductions et prononciations.",
          "Open-Meteo : uniquement des coordonnées arrondies, pour la météo de la boutique.",
          "Services push d’Apple, de Google et de Mozilla : pour acheminer les notifications que vous activez.",
        ],
      },
      {
        title: "Qui voit quoi",
        body: [
          "Les autres personnes connectées peuvent trouver votre profil public — nom affiché, Exchange ID, photo de profil et langues — pour vous ajouter en ami. Les messages, notes et mots partagés sont visibles par les personnes à qui vous les envoyez, qui peuvent en garder des copies ou des captures d’écran. Les photos de profil sont stockées à des adresses web publiques pour que les appareils de vos amis puissent les afficher ; toute personne disposant du lien peut voir la photo.",
          "Nous ne vendons ni ne louons de données personnelles. Nous ne les communiquons qu’aux prestataires ci-dessus, lorsque la loi l’exige ou pour protéger la sécurité des personnes, ou, si l’app était cédée à un nouvel exploitant, à cet exploitant dans le cadre de cette politique, en vous en informant.",
        ],
      },
      {
        title: "Traitements internationaux",
        body: [
          "Nous opérons depuis Taïwan et nos prestataires traitent des données au Canada, aux États-Unis et dans d’autres pays où ils disposent d’installations, dont les lois sur la protection des données peuvent différer des vôtres. Nous nous appuyons sur les engagements contractuels de protection des données de nos prestataires, y compris les clauses contractuelles types lorsqu’elles s’appliquent.",
        ],
      },
      {
        title: "Durée de conservation",
        points: [
          "Votre compte et votre contenu : jusqu’à ce que vous les supprimiez ou supprimiez votre compte.",
          "Lorsque vous supprimez votre compte : votre profil, votre contenu, les messages que vous avez envoyés, vos amitiés, vos fichiers et Yumi sont immédiatement supprimés de notre base de données et de notre stockage actifs. Des copies peuvent subsister brièvement dans les sauvegardes chiffrées de notre prestataire, en général pas plus de 30 jours, avant d’être écrasées.",
          "Les caches partagés de traductions et de prononciations sont conservés pour accélérer les recherches ; ils sont organisés par mot, pas par personne.",
          "Les journaux serveur sont conservés brièvement par nos prestataires selon leurs propres réglages.",
          "Les contenus envoyés à Gemini sont conservés par Google selon ses propres conditions.",
        ],
        after: [
          "Nous ne supprimons pas automatiquement les comptes inactifs pour l’instant. Si cela change, nous vous préviendrons avant.",
        ],
      },
      {
        title: "Vos choix et vos droits",
        body: [
          "Vous pouvez à tout moment modifier votre profil, supprimer des notes, mots et messages, arrêter un partage, désactiver les notifications et changer les autorisations de caméra, de micro et de notifications. Vous pouvez supprimer tout votre compte dans Réglages → Supprimer le compte.",
          "Selon l’endroit où vous vivez, vous pouvez aussi avoir le droit d’accéder à vos données, d’en obtenir une copie portable, de les rectifier, de les effacer, d’en limiter le traitement ou de vous y opposer, et de retirer votre consentement. À Taïwan, la loi sur la protection des données personnelles vous permet de consulter vos données, d’en demander l’accès et une copie, de les compléter ou de les corriger, et de nous demander d’arrêter de les collecter, de les traiter ou de les utiliser, ou de les supprimer. Écrivez-nous pour faire une demande ; nous répondrons sous 30 jours et devrons peut-être vérifier votre identité. Vous pouvez aussi saisir l’autorité de protection des données de votre pays.",
          "Nous ne vendons ni ne partageons d’informations personnelles à des fins de publicité comportementale intercontextuelle.",
        ],
      },
      {
        title: "Âge",
        body: [
          "Exchange Notes est réservée aux personnes de 18 ans et plus, car les conditions de notre fournisseur d’IA n’autorisent pas les services destinés aux plus jeunes ou susceptibles d’être utilisés par eux. Nous ne collectons pas sciemment de données de personnes de moins de 18 ans. Si vous pensez qu’une personne de moins de 18 ans a un compte, contactez-nous et nous le supprimerons.",
        ],
      },
      {
        title: "Sécurité",
        body: [
          "Les connexions sont chiffrées en HTTPS. Les règles de la base de données limitent chaque compte à ses propres données et à ce que d’autres ont partagé avec lui, les images enregistrées avec vos mots sont stockées de façon privée, et les clés capables de contourner ces règles ne se trouvent que sur notre serveur. Une partie de vos notes et de vos mots est aussi conservée sur votre appareil pour l’usage hors ligne et effacée à la déconnexion.",
          "Aucun service en ligne n’est parfaitement sûr. Ne conservez pas de mots de passe, de pièces d’identité ou d’autres informations sensibles dans l’app. Si nous apprenons une violation touchant vos données, nous vous en informerons, ainsi que les autorités compétentes, comme la loi l’exige.",
        ],
      },
      {
        title: "Cookies et stockage local",
        body: [
          "Nous n’utilisons que ce dont l’app a besoin pour fonctionner : cookies de connexion, vos préférences de langue et d’affichage, et des copies hors ligne de votre contenu sur votre appareil. Aucun n’est utilisé pour la publicité ou le suivi entre sites.",
        ],
      },
      {
        title: "Modifications de cette politique",
        body: [
          "Lorsque nous modifierons cette politique, nous mettrons à jour la date en haut de page. Si un changement affecte de façon importante l’utilisation de vos données, nous vous en informerons dans l’app ou par e-mail avant son entrée en vigueur et, lorsque la loi l’exige, nous vous demanderons votre consentement.",
        ],
      },
    ],
    contact: "Une question, une demande concernant vos données ou une inquiétude ? Écrivez à Hungchi Studio :",
  },
  terms: {
    intro:
      "Ces conditions constituent l’accord entre vous et Hungchi Studio pour l’utilisation d’Exchange Notes. Lisez-les avec la Politique de confidentialité et les principes Communauté et sécurité.",
    summaryTitle: "En bref",
    summary: [
      "Vous devez avoir 18 ans ou plus et vous connecter avec votre propre compte Google.",
      "Ce que vous écrivez reste à vous ; vous nous autorisez seulement à le conserver et à le traiter pour faire fonctionner l’app pour vous.",
      "Les résultats de l’IA peuvent être erronés et ne constituent pas un conseil professionnel.",
      "Les biscuits d’énergie et les objets de la boutique sont gratuits, virtuels et sans valeur monétaire.",
      "L’app est en bêta et fournie en l’état. Le droit taïwanais s’applique.",
    ],
    sections: [
      {
        title: "À propos de ces conditions",
        body: [
          "Exchange Notes (l’« app ») est fournie par Hungchi Studio, un studio indépendant tenu par une personne physique à Taïwan (« nous »). En créant un compte ou en utilisant l’app, vous acceptez ces conditions. Si vous ne les acceptez pas, n’utilisez pas l’app.",
        ],
      },
      {
        title: "Qui peut l’utiliser",
        body: [
          "Vous devez avoir au moins 18 ans et la capacité de conclure un contrat. Vous vous connectez avec votre propre compte Google et êtes responsable de l’activité de votre compte ainsi que de la sécurité de votre compte Google. Prévenez-nous rapidement si vous pensez que quelqu’un d’autre utilise votre compte.",
        ],
      },
      {
        title: "Le service",
        body: [
          "Exchange Notes est actuellement gratuite et en bêta. Des fonctions peuvent évoluer, être limitées — par exemple, les fonctions d’IA partagent une limite quotidienne entre tous — ou être arrêtées, et l’app peut parfois être indisponible. Nous essaierons de prévenir raisonnablement à l’avance des changements importants et, avant de fermer le service, nous vous laisserons la possibilité de sauvegarder vos notes.",
        ],
      },
      {
        title: "Votre contenu",
        body: [
          "Vous restez propriétaire de tout ce que vous créez ou importez. Vous nous accordez une licence mondiale, non exclusive et gratuite pour l’héberger, le stocker, le copier, le traiter, le traduire et l’afficher uniquement dans la mesure nécessaire pour faire fonctionner l’app pour vous — y compris l’envoyer aux prestataires décrits dans la Politique de confidentialité, comme Google Gemini, et le montrer aux personnes avec qui vous choisissez de le partager. Cette licence prend fin lorsque vous supprimez le contenu ou votre compte, sauf pour les copies que d’autres ont déjà enregistrées et les sauvegardes conservées pour une durée limitée.",
          "Vous êtes responsable de votre contenu et confirmez avoir le droit de le partager, y compris les citations, les photos et tout ce qui concerne d’autres personnes.",
        ],
      },
      {
        title: "Utilisation acceptable",
        body: ["Respectez les principes Communauté et sécurité. En particulier, ne :"],
        points: [
          "violez pas la loi ni les droits d’autrui, notamment le droit d’auteur et la vie privée ;",
          "harcelez, menacez, usurpez l’identité ni trompez personne, et ne promouvez ni la haine ni la violence ;",
          "partagez aucun contenu sexuel impliquant des mineurs, que nous signalerons aux autorités ;",
          "envoyez ni spam, ni logiciel malveillant, ni publicité non sollicitée ;",
          "accédez pas aux données d’autrui, ne testez ni ne contournez la sécurité ou les limites d’utilisation, et ne surchargez pas le service ;",
          "extrayez, copiez ou revendez pas l’app ou son contenu avec des outils automatisés, et ne l’utilisez pas pour créer un modèle d’IA concurrent.",
        ],
      },
      {
        title: "Fonctions d’IA",
        body: [
          "Les reconnaissances, traductions, explications et interprétations de Yumi sont générées automatiquement et peuvent être inexactes, incomplètes ou culturellement maladroites. Elles ne constituent pas un conseil médical, juridique, financier, diététique ou professionnel. La reconnaissance de menus ne peut pas confirmer les ingrédients ou les allergènes : demandez toujours au restaurant. Vérifiez tout ce qui est important auprès d’une source fiable et n’envoyez pas d’informations sensibles aux fonctions d’IA.",
        ],
      },
      {
        title: "Yumi, les biscuits d’énergie et la boutique",
        body: [
          "Les biscuits d’énergie se gagnent en apprenant et se dépensent en objets pour Yumi. Biscuits et objets sont virtuels, sans valeur monétaire, ne peuvent être échangés contre de l’argent, vendus ou transférés, et ne sont pas votre propriété. Nous pouvons ajuster les soldes pour corriger des erreurs ou des abus. Rien ne peut être acheté avec de l’argent réel aujourd’hui ; si des objets payants sont un jour proposés, le prix et les éventuelles conditions supplémentaires seront affichés avant le paiement.",
        ],
      },
      {
        title: "Nos droits",
        body: [
          "L’app, son design et son code, le nom et le logo Exchange Notes et le personnage de Yumi appartiennent à Hungchi Studio, à l’exception des composants tiers utilisés sous leurs propres licences. Ces conditions ne vous donnent aucun droit d’utiliser notre nom, notre logo ou Yumi en dehors de l’utilisation de l’app.",
        ],
      },
      {
        title: "Autres services et liens",
        body: [
          "L’app renvoie vers des sources d’actualité et s’appuie sur des services comme Google. Leurs contenus et services relèvent de leurs propres conditions et politiques, et nous n’en sommes pas responsables.",
        ],
      },
      {
        title: "Fin de l’utilisation",
        body: [
          "Vous pouvez cesser d’utiliser l’app et supprimer votre compte à tout moment dans Réglages → Supprimer le compte. Nous pouvons suspendre ou fermer un compte qui enfreint gravement ou de façon répétée ces conditions, ou lorsque la loi l’exige. Lorsque c’est raisonnable, nous vous en indiquerons la raison et vous laisserons la possibilité de répondre.",
        ],
      },
      {
        title: "Exclusion de garanties",
        body: [
          "Dans la mesure permise par la loi, l’app est fournie « en l’état » et « selon disponibilité », sans garantie d’aucune sorte, notamment de fonctionnement ininterrompu, sans erreur ou adapté à un usage particulier.",
        ],
      },
      {
        title: "Limitation de responsabilité",
        body: [
          "Dans la mesure permise par la loi, Hungchi Studio n’est pas responsable des pertes indirectes, accessoires ou consécutives, ni des pertes de données, de bénéfices ou de réputation liées à l’utilisation de l’app. Rien dans ces conditions ne limite une responsabilité que la loi ne permet pas de limiter, comme en cas de faute intentionnelle ou lourde, ni vos droits de consommateur prévus par les lois impératives du lieu où vous vivez.",
        ],
      },
      {
        title: "Modifications de ces conditions",
        body: [
          "Nous pouvons mettre à jour ces conditions. Nous changerons la date en haut de page et, pour les changements importants, nous vous en informerons dans l’app ou par e-mail avant leur entrée en vigueur. Si vous continuez à utiliser l’app ensuite, les conditions mises à jour s’appliquent ; si vous n’êtes pas d’accord, vous pouvez supprimer votre compte.",
        ],
      },
      {
        title: "Droit applicable",
        body: [
          "Ces conditions sont régies par le droit de Taïwan (République de Chine). Les litiges relèvent d’un tribunal compétent à Taïwan, sauf si les lois impératives du lieu où vous vivez en tant que consommateur vous permettent de saisir les tribunaux de ce lieu.",
        ],
      },
    ],
    contact: "Une question sur ces conditions ? Écrivez à Hungchi Studio :",
  },
};

export default legal;
