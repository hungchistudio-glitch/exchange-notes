import Foundation

struct PocketPreferences: Codable, Equatable {
    var appMode = "standard"
    var interfaceLanguage = "english"
    var learningLanguageCode = "en"
    var translationLanguageCode = "zh-TW"
    static let key = "yumi-pocket-preferences-v1"
    static let languages = ["en", "zh-TW", "es", "fr", "it"]

    init() {}
    init?(payload: [String: Any]) {
        guard payload["version"] as? Int == 1,
              let mode = payload["appMode"] as? String, ["standard", "cosmic"].contains(mode),
              let ui = payload["interfaceLanguage"] as? String,
              ["english", "traditional-chinese", "spanish", "french", "italian"].contains(ui),
              let learning = payload["learningLanguageCode"] as? String, Self.languages.contains(learning),
              let translation = payload["translationLanguageCode"] as? String, Self.languages.contains(translation), learning != translation else { return nil }
        appMode = mode; interfaceLanguage = ui
        learningLanguageCode = learning; translationLanguageCode = translation
    }
    static func load() -> Self {
        guard let raw = UserDefaults(suiteName: YumiWidgetStore.suiteName)?.data(forKey: key),
              let value = try? JSONDecoder().decode(Self.self, from: raw),
              ["standard", "cosmic"].contains(value.appMode),
              ["english", "traditional-chinese", "spanish", "french", "italian"].contains(value.interfaceLanguage),
              Self.languages.contains(value.learningLanguageCode), Self.languages.contains(value.translationLanguageCode),
              value.learningLanguageCode != value.translationLanguageCode else { return Self() }
        return value
    }
    @discardableResult func saveIfChanged() -> Bool {
        guard let defaults = UserDefaults(suiteName: YumiWidgetStore.suiteName),
              let raw = try? JSONEncoder().encode(self) else { return false }
        if let old = defaults.data(forKey: Self.key),
           let decoded = try? JSONDecoder().decode(Self.self, from: old), decoded == self { return false }
        defaults.set(raw, forKey: Self.key); return true
    }
    var cosmic: Bool { appMode == "cosmic" }
}

enum PocketCopy {
    static func text(_ key: String, _ language: String) -> String {
        let index = ["english", "traditional-chinese", "spanish", "french", "italian"].firstIndex(of: language) ?? 0
        return rows[key]?[index] ?? key
    }
    private static let rows: [String: [String]] = [
        "title": ["Yumi Pocket Lookup", "Yumi 隨行查字", "Yumi · Consulta rápida", "Yumi · Recherche express", "Yumi · Ricerca rapida"],
        "search": ["Look up a word…", "查一個新單字…", "Busca una palabra…", "Chercher un mot…", "Cerca una parola…"],
        "voice": ["Voice lookup", "語音查字", "Consulta por voz", "Recherche vocale", "Ricerca vocale"],
        "description": ["Open a word or voice lookup in Exchange Notes.", "直接開啟 Exchange Notes 查字或語音輸入。", "Abre una consulta escrita o por voz.", "Ouvrir une recherche écrite ou vocale.", "Apri una ricerca scritta o vocale."],
        "done": ["Done", "完成", "Listo", "Terminé", "Fine"],
        "lookup": ["Look up", "查字", "Consultar", "Rechercher", "Cerca"],
        "offline": ["Built-in dictionary · available offline", "內建字典・離線也可查詢", "Diccionario integrado · sin conexión", "Dictionnaire intégré · hors ligne", "Dizionario integrato · offline"],
        "missing": ["Not in the built-in dictionary. Try a different spelling or look it up in the app.", "內建字典尚未收錄，請換個拼法或到 App 查詢。", "No está en el diccionario integrado. Prueba otra forma o consulta en la app.", "Absent du dictionnaire intégré. Essayez une autre forme ou cherchez dans l’app.", "Non presente nel dizionario integrato. Prova un’altra forma o cerca nell’app."],
        "invalid": ["Share selected text, or type a word here (up to 200 characters).", "請分享選取的文字，或在此輸入單字（最多 200 字元）。", "Comparte texto o escribe aquí (hasta 200 caracteres).", "Partagez du texte ou saisissez un mot (200 caractères maximum).", "Condividi del testo o scrivi qui (massimo 200 caratteri)."],
        "source": ["Learning language", "學習語言", "Idioma de aprendizaje", "Langue d’apprentissage", "Lingua di studio"],
        "target": ["Translation language", "翻譯語言", "Idioma de traducción", "Langue de traduction", "Lingua della traduzione"],
        "aiSource": ["Yumi · AI lookup", "Yumi・AI 查字", "Yumi · Consulta con IA", "Yumi · Recherche IA", "Yumi · Ricerca IA"],
        "looking": ["Yumi is looking it up…", "Yumi 查詢中…", "Yumi lo está buscando…", "Yumi cherche…", "Yumi sta cercando…"],
        "save": ["Save word", "收藏", "Guardar palabra", "Enregistrer le mot", "Salva la parola"],
        "saving": ["Saving…", "收藏中…", "Guardando…", "Enregistrement…", "Salvataggio…"],
        "saved": ["Saved", "已收藏", "Guardada", "Enregistré", "Salvata"],
        "duplicate": ["Already in your vocabulary", "已在你的單字本裡", "Ya está en tu vocabulario", "Déjà dans votre vocabulaire", "Già nel tuo vocabolario"],
        "saveFailed": ["Couldn’t save. Try again.", "收藏失敗，請再試一次。", "No se pudo guardar. Inténtalo de nuevo.", "Échec de l’enregistrement. Réessayez.", "Salvataggio non riuscito. Riprova."],
        "connect": ["Open Exchange Notes once to connect sharing to your account. Until then, only the built-in dictionary is used.", "請先打開 Exchange Notes 一次，分享查字就會連到你的帳號；在那之前只用內建字典。", "Abre Exchange Notes una vez para conectar el uso compartido con tu cuenta. Hasta entonces, solo el diccionario integrado.", "Ouvrez Exchange Notes une fois pour relier le partage à votre compte. D’ici là, seul le dictionnaire intégré est utilisé.", "Apri Exchange Notes una volta per collegare la condivisione al tuo account. Fino ad allora, solo il dizionario integrato."],
        "offlineFallback": ["No connection: built-in dictionary. Saving needs a connection.", "沒有網路：使用內建字典，收藏需要連線。", "Sin conexión: diccionario integrado. Para guardar hace falta conexión.", "Pas de connexion : dictionnaire intégré. L’enregistrement demande une connexion.", "Nessuna connessione: dizionario integrato. Per salvare serve la connessione."],
        "nosave": ["This preview does not save to your vocabulary. Open the app to save a word.", "此處只查字，不會自動收藏；請到 App 收藏單字。", "Esta consulta no guarda palabras. Abre la app para guardarlas.", "Cette recherche n’enregistre pas les mots. Ouvrez l’app pour les conserver.", "Questa ricerca non salva parole. Apri l’app per salvarle."],
    ]
}
