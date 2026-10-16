import type { LegalCopy } from "./types";

const legal: LegalCopy = {
  effective: "In vigore dal {date}",
  privacy: {
    intro:
      "Le tue note custodiscono esperienze personali e talvolta le storie di altre persone. Questa informativa spiega quali dati raccoglie Exchange Notes, perché, chi li tratta con noi, per quanto tempo vengono conservati e quali scelte hai.",
    summaryTitle: "In breve",
    summary: [
      "Exchange Notes è gestita da Hungchi Studio, uno studio indipendente condotto da una persona a Taiwan.",
      "Dal tuo account Google riceviamo solo nome, indirizzo email, foto del profilo e identificativo dell’account, e li usiamo solo per gestire il tuo account.",
      "Le funzioni di IA inviano il testo, le immagini o l’audio pertinenti a Google Gemini. Usiamo il livello gratuito di Gemini, in cui Google può usare questi contenuti per migliorare i suoi prodotti e delle persone possono esaminarli: non inviare nulla di sensibile.",
      "Non vendiamo i tuoi dati, non mostriamo pubblicità e non usiamo tracker pubblicitari o di analisi.",
      "Puoi eliminare il tuo account e i suoi dati in qualsiasi momento da Impostazioni → Elimina account.",
    ],
    sections: [
      {
        title: "Chi siamo",
        body: [
          "Exchange Notes (l’“app”) è gestita da Hungchi Studio, uno studio indipendente condotto da una persona fisica a Taiwan e non da una società registrata. Hungchi Studio stabilisce come e perché vengono trattati i dati personali descritti qui e ne è titolare. Puoi scriverci all’indirizzo indicato in fondo a questa pagina.",
        ],
      },
      {
        title: "Cosa riceviamo dal tuo account Google",
        body: [
          "Accedi con Google. Con il tuo permesso, Google ci fornisce il tuo nome, il tuo indirizzo email, la tua foto del profilo e un identificativo univoco dell’account Google. Li usiamo solo per creare e proteggere il tuo account, mostrare il tuo profilo e mantenerti connesso.",
          "Non riceviamo mai la tua password di Google e non chiediamo accesso a Gmail, Drive, Contatti o altri servizi Google. Non vendiamo i dati degli utenti Google, non li usiamo per la pubblicità né per addestrare modelli di IA. Puoi revocare l’accesso dell’app in qualsiasi momento dalle impostazioni di sicurezza del tuo account Google.",
        ],
      },
      {
        title: "Ciò che crei e invii",
        body: [
          "A seconda delle funzioni che usi, conserviamo ciò che inserisci nell’app perché funzioni e si sincronizzi tra i tuoi dispositivi:",
        ],
        points: [
          "Il tuo profilo: nome visualizzato, Exchange ID, foto del profilo, lingua madre e lingua di studio, e preferenze come lingua dell’interfaccia, modalità e obiettivo giornaliero.",
          "Note e vocabolario: parole, traduzioni, esempi, note, fonti, etichette, immagini salvate con esse, raccolte e cronologia dei ripassi.",
          "Messaggi e condivisioni: messaggi, allegati e parole che invii, note che condividi, richieste di amicizia e amicizie.",
          "Apprendimento e Yumi: punteggi di pronuncia (conserviamo i punteggi, non le registrazioni), risultati dei ripassi, lo stato di Yumi, i biscotti energia e gli oggetti che indossa.",
        ],
      },
      {
        title: "Ciò che viene raccolto automaticamente",
        body: ["Durante l’uso dell’app vengono generate automaticamente alcune informazioni:"],
        points: [
          "Iscrizioni alle notifiche: se attivi i promemoria, l’endpoint e le chiavi push del browser, il nome del dispositivo e il tipo di browser, oppure il token push del tuo iPhone, oltre al tuo fuso orario perché i promemoria arrivino a un’ora ragionevole.",
          "Accesso del widget: se colleghi il widget della schermata Home, un token che conserviamo solo in forma di hash.",
          "Posizione approssimativa: il cielo del negozio mostra il meteo del luogo in cui ti trovi. Il nostro hosting ricava una posizione approssimativa dal tuo indirizzo IP; la arrotondiamo a circa 10 km, la usiamo per ottenere il meteo e non la conserviamo.",
          "Limiti d’uso ed errori: il numero giornaliero di richieste di IA per account, per applicare il limite condiviso, e registri delle chiamate di IA non riuscite che non contengono nulla di tuo.",
          "Log del server: i nostri fornitori di hosting e database conservano log tecnici (come indirizzo IP, tipo di browser e ora della richiesta) per gestire e proteggere il servizio.",
        ],
        after: [
          "Non usiamo cookie pubblicitari, identificativi pubblicitari né strumenti di analisi di terze parti. Nulla su come usi l’app viene inviato a un fornitore di analisi.",
        ],
      },
      {
        title: "Come li usiamo",
        body: [
          "Per fornire l’app: accesso, salvataggio e sincronizzazione, traduzione e riconoscimento, ripassi, messaggi, condivisioni, promemoria e widget. Per mantenerla funzionante e sicura: prevenire abusi, applicare i limiti d’uso, risolvere problemi e proteggere gli account. E per rispettare la legge.",
          "Dove si applicano leggi sulla protezione dei dati come il GDPR, ci basiamo sull’esecuzione del nostro accordo con te (fornire le funzioni che usi), sul nostro legittimo interesse (mantenere il servizio sicuro e funzionante), sul tuo consenso (notifiche e permessi del dispositivo, che puoi revocare) e sugli obblighi di legge.",
        ],
      },
      {
        title: "Funzioni di IA e Google Gemini",
        body: [
          "Funzioni come il riconoscimento di oggetti e menu, la traduzione, la spiegazione di parole, note e messaggi, la ricerca vocale e le interpretazioni di Yumi inviano dal nostro server il testo, il contesto della nota, l’immagine o l’audio pertinenti all’API Gemini di Google. Parte del riconoscimento tramite fotocamera avviene interamente sul tuo dispositivo e non invia nulla. Il riconoscimento vocale del browser o del sistema operativo può essere gestito da Apple, Google o da un altro fornitore secondo le proprie condizioni.",
          "Al momento Exchange Notes usa il livello gratuito di Gemini. In base alle condizioni di Google per i servizi gratuiti, Google può usare i contenuti che riceve e le risposte che genera per fornire, migliorare e sviluppare i propri prodotti e le tecnologie di apprendimento automatico, e delle persone possono leggerli, annotarli ed elaborarli. Non inviare informazioni sensibili — come dati sanitari, documenti d’identità, password, dati finanziari o informazioni private su altre persone — alle funzioni di IA.",
          "I risultati dell’IA possono essere sbagliati. Considera traduzioni, riconoscimenti e interpretazioni culturali come suggerimenti, non come fatti.",
        ],
      },
      {
        title: "Fornitori di servizi",
        body: [
          "Ci avvaliamo di questi fornitori per far funzionare l’app. Ciascuno tratta i dati secondo le proprie condizioni e solo per lo scopo indicato:",
        ],
        points: [
          "Supabase: account, database e archiviazione dei file (server in Canada).",
          "Vercel: hosting e funzioni server (server principalmente negli Stati Uniti, con una rete globale).",
          "Google: accesso, API Gemini, font web e un modello di immagini scaricato dai server di Google ed eseguito sul tuo dispositivo.",
          "MyMemory (Translated, Italia) e Free Dictionary API: la parola o la breve frase cercata, inviata dal nostro server, per alcune traduzioni e pronunce.",
          "Open-Meteo: solo coordinate arrotondate, per il meteo del negozio.",
          "Servizi push di Apple, Google e Mozilla: per recapitare le notifiche che attivi.",
        ],
      },
      {
        title: "Chi vede cosa",
        body: [
          "Le altre persone che hanno effettuato l’accesso possono trovare il tuo profilo pubblico — nome visualizzato, Exchange ID, foto del profilo e lingue — per aggiungerti come amico. Messaggi, note e parole condivisi sono visibili alle persone a cui li invii, che possono conservarne copie o screenshot. Le foto del profilo sono archiviate a indirizzi web pubblici perché i dispositivi dei tuoi amici possano mostrarle; chiunque abbia il link può vedere la foto.",
          "Non vendiamo né affittiamo dati personali. Li comunichiamo solo ai fornitori indicati sopra, quando la legge lo richiede o per proteggere la sicurezza delle persone, oppure, se l’app passasse a un nuovo gestore, a quel gestore nel rispetto di questa informativa e avvisandoti.",
        ],
      },
      {
        title: "Trattamento internazionale",
        body: [
          "Operiamo da Taiwan e i nostri fornitori trattano dati in Canada, negli Stati Uniti e in altri paesi in cui hanno strutture, le cui leggi sulla protezione dei dati possono essere diverse dalle tue. Ci affidiamo agli impegni contrattuali di protezione dei dati dei nostri fornitori, incluse le clausole contrattuali standard ove applicabili.",
        ],
      },
      {
        title: "Per quanto tempo li conserviamo",
        points: [
          "Il tuo account e i tuoi contenuti: finché non li elimini o non elimini l’account.",
          "Quando elimini l’account: profilo, contenuti, messaggi che hai inviato, amicizie, file e Yumi vengono eliminati subito dal nostro database e dall’archivio attivi. Alcune copie possono restare per poco tempo nei backup cifrati del nostro fornitore, di norma non oltre 30 giorni, prima di essere sovrascritte.",
          "Le cache condivise di traduzioni e pronunce vengono conservate per velocizzare le ricerche; sono organizzate per parola, non per persona.",
          "I log del server sono conservati per brevi periodi dai nostri fornitori secondo le loro impostazioni.",
          "I contenuti inviati a Gemini sono conservati da Google secondo le proprie condizioni.",
        ],
        after: [
          "Al momento non eliminiamo automaticamente gli account inattivi. Se questo cambierà, ti avviseremo prima.",
        ],
      },
      {
        title: "Le tue scelte e i tuoi diritti",
        body: [
          "Puoi modificare il profilo, eliminare singole note, parole e messaggi, interrompere una condivisione, disattivare le notifiche e cambiare i permessi di fotocamera, microfono e notifiche in qualsiasi momento. Puoi eliminare l’intero account da Impostazioni → Elimina account.",
          "A seconda di dove vivi, potresti avere anche il diritto di accedere ai tuoi dati, ottenerne una copia portabile, rettificarli, cancellarli, limitarne o opporti al trattamento e revocare il consenso. A Taiwan, la legge sulla protezione dei dati personali ti consente di consultare i tuoi dati, chiederne la visione e una copia, integrarli o correggerli, e chiederci di smettere di raccoglierli, trattarli o usarli, oppure di cancellarli. Scrivici per presentare una richiesta; risponderemo entro 30 giorni e potremmo dover verificare la tua identità. Puoi anche presentare un reclamo all’autorità per la protezione dei dati del tuo paese.",
          "Non vendiamo né condividiamo informazioni personali per pubblicità comportamentale tra contesti diversi.",
        ],
      },
      {
        title: "Età",
        body: [
          "Exchange Notes è destinata a persone di almeno 18 anni, perché le condizioni del nostro fornitore di IA non consentono servizi rivolti a persone più giovani o che possano essere usati da loro. Non raccogliamo consapevolmente dati di minori di 18 anni. Se ritieni che una persona minore di 18 anni abbia un account, contattaci e lo elimineremo.",
        ],
      },
      {
        title: "Sicurezza",
        body: [
          "Le connessioni sono cifrate con HTTPS. Le regole del database limitano ogni account ai propri dati e a ciò che altri hanno condiviso con esso, le immagini salvate con le tue parole sono archiviate in modo privato e le chiavi in grado di aggirare queste regole si trovano solo sul nostro server. Parte delle tue note e parole è conservata anche sul dispositivo per l’uso offline e viene cancellata quando esci.",
          "Nessun servizio online è perfettamente sicuro. Non conservare nell’app password, documenti d’identità o altre informazioni sensibili. Se veniamo a conoscenza di una violazione che riguarda i tuoi dati, informeremo te e le autorità competenti come richiesto dalla legge.",
        ],
      },
      {
        title: "Cookie e archiviazione locale",
        body: [
          "Usiamo solo ciò che serve all’app per funzionare: cookie di accesso, le tue preferenze di lingua e visualizzazione e copie offline dei tuoi contenuti sul dispositivo. Nessuno è usato per la pubblicità o per il tracciamento tra siti.",
        ],
      },
      {
        title: "Modifiche a questa informativa",
        body: [
          "Quando modificheremo questa informativa aggiorneremo la data in alto. Se una modifica incide in modo significativo sull’uso dei tuoi dati, te lo comunicheremo nell’app o via email prima che entri in vigore e, se la legge lo richiede, ti chiederemo il consenso.",
        ],
      },
    ],
    contact: "Domande, richieste sui tuoi dati o dubbi? Scrivi a Hungchi Studio:",
  },
  terms: {
    intro:
      "Questi termini sono l’accordo tra te e Hungchi Studio per l’uso di Exchange Notes. Leggili insieme all’Informativa sulla privacy e ai principi di Comunità e sicurezza.",
    summaryTitle: "In breve",
    summary: [
      "Devi avere almeno 18 anni e accedere con il tuo account Google.",
      "Ciò che scrivi resta tuo; ci permetti solo di conservarlo e trattarlo per far funzionare l’app per te.",
      "I risultati dell’IA possono essere sbagliati e non sono consulenza professionale.",
      "I biscotti energia e gli oggetti del negozio sono gratuiti, virtuali e senza valore economico.",
      "L’app è in beta e viene fornita così com’è. Si applica la legge di Taiwan.",
    ],
    sections: [
      {
        title: "Informazioni su questi termini",
        body: [
          "Exchange Notes (l’“app”) è fornita da Hungchi Studio, uno studio indipendente condotto da una persona fisica a Taiwan (“noi”). Creando un account o usando l’app, accetti questi termini. Se non li accetti, non usare l’app.",
        ],
      },
      {
        title: "Chi può usarla",
        body: [
          "Devi avere almeno 18 anni e la capacità di concludere un contratto vincolante. Accedi con il tuo account Google e sei responsabile dell’attività del tuo account e della sicurezza del tuo account Google. Avvisaci subito se pensi che qualcun altro stia usando il tuo account.",
        ],
      },
      {
        title: "Il servizio",
        body: [
          "Exchange Notes è attualmente gratuita e in beta. Le funzioni possono cambiare, essere limitate — ad esempio, le funzioni di IA condividono un limite giornaliero tra tutti — o essere interrotte, e l’app può a volte non essere disponibile. Cercheremo di avvisare con ragionevole anticipo dei cambiamenti importanti e, prima di chiudere il servizio, ti daremo modo di salvare le tue note.",
        ],
      },
      {
        title: "I tuoi contenuti",
        body: [
          "Resti proprietario di tutto ciò che crei o carichi. Ci concedi una licenza mondiale, non esclusiva e gratuita per ospitarlo, archiviarlo, copiarlo, elaborarlo, tradurlo e mostrarlo solo nella misura necessaria a far funzionare l’app per te, compreso l’invio ai fornitori descritti nell’Informativa sulla privacy, come Google Gemini, e la visualizzazione alle persone con cui scegli di condividerlo. Questa licenza termina quando elimini i contenuti o l’account, tranne che per le copie già salvate da altre persone e per i backup conservati per un periodo limitato.",
          "Sei responsabile dei tuoi contenuti e confermi di avere il diritto di condividerli, comprese citazioni, fotografie e tutto ciò che riguarda altre persone.",
        ],
      },
      {
        title: "Uso consentito",
        body: ["Segui i principi di Comunità e sicurezza. In particolare, non:"],
        points: [
          "violare la legge o i diritti altrui, inclusi diritto d’autore e privacy;",
          "molestare, minacciare, impersonare o ingannare altre persone, né promuovere odio o violenza;",
          "condividere contenuti sessuali che coinvolgono minori, che segnaleremo alle autorità;",
          "inviare spam, malware o pubblicità non richiesta;",
          "accedere ai dati di altre persone, sondare o aggirare la sicurezza o i limiti d’uso, né sovraccaricare il servizio;",
          "estrarre, copiare o rivendere l’app o i suoi contenuti con strumenti automatici, né usarla per creare un modello di IA concorrente.",
        ],
      },
      {
        title: "Funzioni di IA",
        body: [
          "Riconoscimenti, traduzioni, spiegazioni e interpretazioni di Yumi sono generati automaticamente e possono essere imprecisi, incompleti o culturalmente inadeguati. Non costituiscono consulenza medica, legale, finanziaria, alimentare o professionale. Il riconoscimento dei menu non può confermare ingredienti o allergeni: chiedi sempre al ristorante. Verifica ciò che è importante con una fonte affidabile e non inviare informazioni sensibili alle funzioni di IA.",
        ],
      },
      {
        title: "Yumi, i biscotti energia e il negozio",
        body: [
          "I biscotti energia si guadagnano imparando e si spendono in oggetti per Yumi. Biscotti e oggetti sono virtuali, non hanno valore economico, non possono essere convertiti in denaro, venduti o trasferiti e non sono di tua proprietà. Possiamo modificare i saldi per correggere errori o abusi. Oggi non si può acquistare nulla con denaro reale; se in futuro verranno offerti oggetti a pagamento, il prezzo ed eventuali condizioni aggiuntive saranno mostrati prima del pagamento.",
        ],
      },
      {
        title: "I nostri diritti",
        body: [
          "L’app, il suo design e il suo codice, il nome e il logo Exchange Notes e il personaggio di Yumi appartengono a Hungchi Studio, ad eccezione dei componenti di terze parti usati secondo le rispettive licenze. Questi termini non ti danno alcun diritto di usare il nostro nome, il logo o Yumi se non nell’ambito dell’uso dell’app.",
        ],
      },
      {
        title: "Altri servizi e link",
        body: [
          "L’app rimanda a fonti di notizie e si basa su servizi come Google. I loro contenuti e servizi sono regolati dai rispettivi termini e informative, e non ne siamo responsabili.",
        ],
      },
      {
        title: "Fine dell’uso",
        body: [
          "Puoi smettere di usare l’app ed eliminare l’account in qualsiasi momento da Impostazioni → Elimina account. Possiamo sospendere o chiudere un account che violi questi termini in modo grave o ripetuto, o quando la legge lo richiede. Quando è ragionevole, ti spiegheremo il motivo e ti daremo modo di rispondere.",
        ],
      },
      {
        title: "Esclusione di garanzie",
        body: [
          "Nei limiti consentiti dalla legge, l’app è fornita “così com’è” e “come disponibile”, senza garanzie di alcun tipo, incluse quelle di funzionamento ininterrotto, privo di errori o adatto a uno scopo specifico.",
        ],
      },
      {
        title: "Limitazione di responsabilità",
        body: [
          "Nei limiti consentiti dalla legge, Hungchi Studio non risponde di perdite indirette, incidentali o consequenziali, né della perdita di dati, profitti o reputazione derivante dall’uso dell’app. Nulla in questi termini limita la responsabilità che la legge non consente di limitare, come in caso di dolo o colpa grave, né i tuoi diritti di consumatore previsti dalle leggi inderogabili del luogo in cui vivi.",
        ],
      },
      {
        title: "Modifiche a questi termini",
        body: [
          "Possiamo aggiornare questi termini. Cambieremo la data in alto e, per le modifiche importanti, te lo comunicheremo nell’app o via email prima che entrino in vigore. Se continui a usare l’app dopo, si applicano i termini aggiornati; se non sei d’accordo, puoi eliminare l’account.",
        ],
      },
      {
        title: "Legge applicabile",
        body: [
          "Questi termini sono regolati dalle leggi di Taiwan (Repubblica di Cina). Le controversie saranno decise da un tribunale competente a Taiwan, salvo che le leggi inderogabili del luogo in cui vivi come consumatore ti consentano di rivolgerti ai tribunali di quel luogo.",
        ],
      },
    ],
    contact: "Domande su questi termini? Scrivi a Hungchi Studio:",
  },
};

export default legal;
