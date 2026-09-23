import type { InfoCopy } from "./types";

const info: InfoCopy = {
  nav: { about: "Informazioni su Exchange Notes", community: "Comunità e sicurezza", privacy: "Informazioni sulla privacy", contact: "Contattaci", home: "Torna alla pagina iniziale", back: "Torna ad Aiuto e informazioni", related: "Continua a scoprire" },
  help: { description: "Scopri l’idea alla base di Exchange Notes, i principi della condivisione e come vengono trattati i dati. Puoi anche ripetere la presentazione guidata.", about: "Scambia una frase. Scopri un altro modo di vedere il mondo.", community: "Coltiva la curiosità e rispetta i confini degli altri", privacy: "Conosci i tuoi dati, i servizi di IA e le tue scelte" },
  about: {
    tagline: "Scambia una frase. Scopri un altro modo di vedere il mondo.",
    greeting: "Ciao, sono Yumi. Ogni frase che ricordi ha una storia. Scopriamola insieme e ascoltiamo come la comprendono gli altri.",
    storyTitle: "Perché esiste Exchange Notes",
    story: [
      "Alcune parole ci incontrano durante un viaggio. Altre acquistano senso solo crescendo. Portano con sé i luoghi, i legami e le emozioni di quel momento, anche molto tempo dopo.",
      "Ho creato Exchange Notes per conservare questi momenti. Salva una frase, il suo contesto e ciò che significa per te. Quando una persona di un altro paese, di un’altra generazione o cultura incontra le stesse parole, può ricordare una storia diversa o cogliere un altro significato. Ogni interpretazione ha le proprie radici.",
      "Vorrei che imparare una lingua iniziasse da questa curiosità: comprendere le parole, percepire il tono e avvicinarsi a chi parla. Ogni scambio può diventare un’occasione per conoscere il mondo e noi stessi.",
    ],
    featuresTitle: "Impara a partire dalla vita quotidiana",
    features: [
      { title: "Comprendi ciò che hai davanti", body: "Identifica oggetti con la fotocamera e leggi i menu. Trasforma ciò che incontri in viaggio in materiale per imparare." },
      { title: "Trova le parole che ti servono", body: "Usa testo, riconoscimento vocale e traduzione per esercitarti a esprimerti ed esplorare possibili sfumature e contesti culturali." },
      { title: "Conserva la tua curiosità", body: "Esplora il mondo con le notizie di Discovery, estrai le parole da imparare, salvale e ripassale nel tuo quaderno di lingue." },
    ],
    ai: { title: "Impara con l’IA, conserva il tuo giudizio", body: "L’IA aiuta a riconoscere, tradurre e organizzare, per iniziare prima a comprendere e a esercitarti. Yumi è la tua compagna di apprendimento con IA. Le sue interpretazioni culturali sono spunti: possono essere sbagliate e non determinano le vere intenzioni di nessuno. Se il significato non è chiaro, fare un’altra domanda è parte dell’apprendimento." },
    closing: "Trasforma il mondo che incontri in appunti da scambiare.",
    planet: "Pianeta di servizio principale: la Terra.",
  },
  community: {
    intro: "Ogni storia merita rispetto. Aiutaci a rendere Exchange Notes un luogo dove fare domande, condividere e imparare con attenzione agli altri.",
    rules: [
      { title: "Rispetta le differenze", body: "Rispetta lingue, accenti, identità e culture. Condividi la tua esperienza senza considerare l’opinione di una persona come la voce di un intero gruppo." },
      { title: "Condividi ciò che hai diritto di condividere", body: "Rispetta il diritto d’autore e la privacy. Mantieni la fonte quando citi notizie. Ottieni un consenso adeguato prima di registrare, fotografare o condividere conversazioni o informazioni che identificano altre persone." },
      { title: "Non danneggiare né sfruttare gli altri", body: "Sono vietati molestie, minacce, odio, truffe, furto d’identità e divulgazione di informazioni private, così come contenuti relativi allo sfruttamento sessuale dei minori o all’incitamento alla violenza." },
      { title: "Distingui i fatti dalle interpretazioni", body: "Sensazioni personali, notizie e ipotesi dell’IA sono cose diverse. Non presentare traduzioni, riassunti o interpretazioni culturali come fatti verificati. Controlla l’originale e la fonte prima di condividere." },
      { title: "Proteggi te e gli altri", body: "Non inviare password, documenti d’identità, dati di pagamento o contenuti privati che non sei autorizzato a condividere. Interrompi lo scambio e contattaci se qualcuno chiede denaro, codici di verifica o immagini intime." },
      { title: "Verifica le decisioni importanti", body: "Il riconoscimento dei menu non garantisce informazioni complete su ingredienti o allergeni: chiedi al ristorante. Per decisioni mediche, legali, di sicurezza personale o altre scelte importanti, consulta un professionista qualificato o una fonte ufficiale." },
    ],
    contact: "Scrivici se incontri contenuti dannosi o problemi in uno scambio. Descrivi l’accaduto senza includere informazioni private non necessarie.",
  },
  privacy: {
    intro: "I tuoi appunti custodiscono esperienze personali e possono includere storie altrui. Questa pagina descrive il trattamento dei dati nelle funzioni attuali e le scelte disponibili.",
    status: "Bozza prima della pubblicazione",
    notice: "Queste informazioni sono una bozza, non un’informativa sulla privacy completa e definitiva. Restano da confermare i dati legali del gestore, le regioni del servizio, i periodi di conservazione, le procedure di cancellazione, l’età minima e il piano del fornitore di IA. Questi dettagli e una data di entrata in vigore saranno aggiunti prima della pubblicazione definitiva.",
    sections: [
      { title: "Quali dati trattiamo", body: "In base alle funzioni utilizzate, Exchange Notes tratta dati dell’account e preferenze linguistiche, appunti, vocaboli, messaggi, registri di apprendimento e testo, immagini o audio inviati. Servono per accesso, salvataggio, sincronizzazione, scambi, riconoscimento e traduzione. Promemoria e collegamenti dei dispositivi richiedono anche le relative informazioni di iscrizione e connessione." },
      { title: "IA e altri fornitori", body: "Alcune funzioni usano Google Gemini e inviano a quel fornitore il testo, il contesto degli appunti, le immagini o l’audio pertinenti. Account e dati nel cloud utilizzano Supabase. Il riconoscimento vocale può anche usare servizi del browser o del sistema operativo: non va considerato sempre locale. Le condizioni di conservazione, miglioramento dei modelli e revisione umana vanno ancora confermate in base al piano effettivo." },
      { title: "Condivisione e collegamenti esterni", body: "Quando invii messaggi o condividi appunti, i destinatari possono vedere il contenuto e le informazioni del profilo associate secondo i permessi della funzione. Possono conservarne copie o schermate; revocare l’accesso non garantisce di recuperarle. I siti esterni, comprese le fonti delle notizie di Discovery, trattano i dati secondo le proprie informative." },
      { title: "Permessi e archiviazione locale", body: "Cookie e archiviazione locale supportano accesso, preferenze di lingua e interfaccia e cache. Puoi modificare i permessi di fotocamera, microfono e notifiche nelle impostazioni del dispositivo o del browser. La revoca può influire sulle funzioni, ma non cancella automaticamente quanto già inviato. Uscire o disinstallare non elimina l’account nel cloud." },
      { title: "Conservazione e cancellazione", body: "I tempi di conservazione e cancellazione di account, appunti, allegati, contenuti IA, registri e backup sono ancora da confermare. Non possiamo promettere cancellazione immediata o conservazione nulla. Puoi richiedere via email la cancellazione dei dati o dell’account; la gestione dipende dai dati, dalle copie dei destinatari e dalla legge applicabile." },
      { title: "I tuoi diritti", body: "In base al luogo in cui ti trovi e alla legge applicabile, potresti avere diritti di accesso, rettifica, cancellazione, portabilità, limitazione o opposizione al trattamento e revoca del consenso. Contattaci all’indirizzo sotto; potrebbe essere necessaria una verifica adeguata dell’identità. Puoi anche rivolgerti all’autorità competente per la protezione dei dati." },
      { title: "Regioni del servizio e sicurezza", body: "Desideriamo servire persone di paesi e regioni diversi. La disponibilità dipende dai territori di distribuzione, dal supporto dei fornitori e dalla legge applicabile. I dati possono essere trattati all’estero; luoghi e garanzie specifici restano da confermare. Nessun servizio online può promettere sicurezza assoluta. Evita di inviare informazioni sensibili non necessarie." },
      { title: "Requisiti di accesso e aggiornamenti", body: "L’età minima e i requisiti di accesso devono essere confermati secondo i mercati e le condizioni del fornitore di IA. Questa pagina non indica che il servizio sia adatto a tutte le età. L’informativa finale aggiungerà dati del gestore, basi del trattamento, informazioni complete sui fornitori e modalità di aggiornamento. Le modifiche importanti saranno comunicate, richiedendo il consenso ove necessario." },
    ],
    contact: "Per domande sulla privacy, richieste relative ai dati o cancellazioni, contatta:",
  },
};
export default info;
