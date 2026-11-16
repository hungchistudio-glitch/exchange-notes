import Foundation

struct PocketPreferences: Codable, Equatable {
    var appMode = "standard"
    var interfaceLanguage = "english"
    var learningLanguageCode = "en"
    var translationLanguageCode = "zh-TW"
    static let key = "yumi-pocket-preferences-v1"
    static let languages = ["en", "zh-TW", "es", "fr", "it", "ja", "ko"]
    static let interfaceLanguages = ["english", "traditional-chinese", "spanish", "french", "italian", "japanese", "korean"]

    init() {}
    init?(payload: [String: Any]) {
        guard payload["version"] as? Int == 1,
              let mode = payload["appMode"] as? String, ["standard", "cosmic"].contains(mode),
              let ui = payload["interfaceLanguage"] as? String,
              Self.interfaceLanguages.contains(ui),
              let learning = payload["learningLanguageCode"] as? String, Self.languages.contains(learning),
              let translation = payload["translationLanguageCode"] as? String, Self.languages.contains(translation), learning != translation else { return nil }
        appMode = mode; interfaceLanguage = ui
        learningLanguageCode = learning; translationLanguageCode = translation
    }
    static func load() -> Self {
        guard let raw = UserDefaults(suiteName: YumiWidgetStore.suiteName)?.data(forKey: key),
              let value = try? JSONDecoder().decode(Self.self, from: raw),
              ["standard", "cosmic"].contains(value.appMode),
              Self.interfaceLanguages.contains(value.interfaceLanguage),
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
        let index = PocketPreferences.interfaceLanguages.firstIndex(of: language) ?? 0
        return rows[key]?[index] ?? key
    }
    private static let rows: [String: [String]] = [
        "title": ["Yumi Pocket Lookup", "Yumi 隨行查字", "Yumi · Consulta rápida", "Yumi · Recherche express", "Yumi · Ricerca rapida", "Yumi ポケット辞書", "Yumi 포켓 사전"],
        "search": ["Look up a word…", "查一個新單字…", "Busca una palabra…", "Chercher un mot…", "Cerca una parola…", "単語を調べる…", "단어 찾아보기…"],
        "voice": ["Voice lookup", "語音查字", "Consulta por voz", "Recherche vocale", "Ricerca vocale", "音声で調べる", "음성으로 찾기"],
        "description": ["Open a word or voice lookup in Exchange Notes.", "直接開啟 Exchange Notes 查字或語音輸入。", "Abre una consulta escrita o por voz.", "Ouvrir une recherche écrite ou vocale.", "Apri una ricerca scritta o vocale.", "Exchange Notes で文字や音声の検索を開きます。", "Exchange Notes에서 글자나 음성으로 찾기를 열어요."],
        "done": ["Done", "完成", "Listo", "Terminé", "Fine", "完了", "완료"],
        "lookup": ["Look up", "查字", "Consultar", "Rechercher", "Cerca", "調べる", "찾기"],
        "offline": ["Built-in dictionary · available offline", "內建字典・離線也可查詢", "Diccionario integrado · sin conexión", "Dictionnaire intégré · hors ligne", "Dizionario integrato · offline", "内蔵辞書・オフラインでも使えます", "내장 사전 · 오프라인에서도 사용 가능"],
        "missing": ["Not in the built-in dictionary. Try a different spelling or look it up in the app.", "內建字典尚未收錄，請換個拼法或到 App 查詢。", "No está en el diccionario integrado. Prueba otra forma o consulta en la app.", "Absent du dictionnaire intégré. Essayez une autre forme ou cherchez dans l’app.", "Non presente nel dizionario integrato. Prova un’altra forma o cerca nell’app.", "内蔵辞書にはまだありません。別のつづりで試すか、アプリで調べてください。", "내장 사전에 아직 없어요. 다른 철자로 해 보거나 앱에서 찾아보세요."],
        "invalid": ["Share selected text, or type a word here (up to 200 characters).", "請分享選取的文字，或在此輸入單字（最多 200 字元）。", "Comparte texto o escribe aquí (hasta 200 caracteres).", "Partagez du texte ou saisissez un mot (200 caractères maximum).", "Condividi del testo o scrivi qui (massimo 200 caratteri).", "選択したテキストを共有するか、ここに単語を入力してください（200文字まで）。", "선택한 텍스트를 공유하거나 여기에 단어를 입력하세요(최대 200자)."],
        "source": ["Learning language", "學習語言", "Idioma de aprendizaje", "Langue d’apprentissage", "Lingua di studio", "学習言語", "학습 언어"],
        "target": ["Translation language", "翻譯語言", "Idioma de traducción", "Langue de traduction", "Lingua della traduzione", "翻訳言語", "번역 언어"],
        "aiSource": ["Yumi · AI lookup", "Yumi・AI 查字", "Yumi · Consulta con IA", "Yumi · Recherche IA", "Yumi · Ricerca IA", "Yumi・AI 検索", "Yumi · AI 찾기"],
        "looking": ["Yumi is looking it up…", "Yumi 查詢中…", "Yumi lo está buscando…", "Yumi cherche…", "Yumi sta cercando…", "Yumi が調べています…", "Yumi가 찾는 중…"],
        "save": ["Save word", "收藏", "Guardar palabra", "Enregistrer le mot", "Salva la parola", "単語を保存", "단어 저장"],
        "saving": ["Saving…", "收藏中…", "Guardando…", "Enregistrement…", "Salvataggio…", "保存中…", "저장하는 중…"],
        "saved": ["Saved", "已收藏", "Guardada", "Enregistré", "Salvata", "保存しました", "저장됨"],
        "duplicate": ["Already in your vocabulary", "已在你的單字本裡", "Ya está en tu vocabulario", "Déjà dans votre vocabulaire", "Già nel tuo vocabolario", "もう単語帳に入っています", "이미 단어장에 있어요"],
        "saveFailed": ["Couldn’t save. Try again.", "收藏失敗，請再試一次。", "No se pudo guardar. Inténtalo de nuevo.", "Échec de l’enregistrement. Réessayez.", "Salvataggio non riuscito. Riprova.", "保存できませんでした。もう一度お試しください。", "저장하지 못했어요. 다시 시도해 주세요."],
        "connect": ["Open Exchange Notes once to connect sharing to your account. Until then, only the built-in dictionary is used.", "請先打開 Exchange Notes 一次，分享查字就會連到你的帳號；在那之前只用內建字典。", "Abre Exchange Notes una vez para conectar el uso compartido con tu cuenta. Hasta entonces, solo el diccionario integrado.", "Ouvrez Exchange Notes une fois pour relier le partage à votre compte. D’ici là, seul le dictionnaire intégré est utilisé.", "Apri Exchange Notes una volta per collegare la condivisione al tuo account. Fino ad allora, solo il dizionario integrato.", "一度 Exchange Notes を開くと、共有がアカウントにつながります。それまでは内蔵辞書だけを使います。", "Exchange Notes를 한 번 열면 공유가 계정에 연결돼요. 그 전까지는 내장 사전만 써요."],
        "offlineFallback": ["No connection: built-in dictionary. Saving needs a connection.", "沒有網路：使用內建字典，收藏需要連線。", "Sin conexión: diccionario integrado. Para guardar hace falta conexión.", "Pas de connexion : dictionnaire intégré. L’enregistrement demande une connexion.", "Nessuna connessione: dizionario integrato. Per salvare serve la connessione.", "接続がありません：内蔵辞書を使います。保存には接続が必要です。", "연결 없음: 내장 사전을 써요. 저장하려면 연결이 필요해요."],
        "nosave": ["This preview does not save to your vocabulary. Open the app to save a word.", "此處只查字，不會自動收藏；請到 App 收藏單字。", "Esta consulta no guarda palabras. Abre la app para guardarlas.", "Cette recherche n’enregistre pas les mots. Ouvrez l’app pour les conserver.", "Questa ricerca non salva parole. Apri l’app per salvarle.", "ここでは調べるだけで、単語帳には保存されません。保存はアプリで行ってください。", "여기서는 찾기만 하고 단어장에 저장하지 않아요. 저장은 앱에서 해 주세요."],
    ]
}
