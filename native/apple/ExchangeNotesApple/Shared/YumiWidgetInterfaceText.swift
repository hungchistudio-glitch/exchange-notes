import Foundation

/// The widget's own interface text, in the language the app is set to.
///
/// Everything else the widget says arrives already translated in the App
/// Group payload, written by the web app's i18n dictionaries. These few
/// strings are drawn by the widget itself — button labels, VoiceOver
/// sentences, and the placeholder shown before the first sync — so they live
/// here, worded to match `lib/i18n/{en,zh-TW,es,fr,it,ja,ko}.ts`.
///
/// Keys are the app's interface-language form (`english`,
/// `traditional-chinese`, `spanish`, `french`, `italian`, `japanese`,
/// `korean`). An unknown value
/// falls back to English rather than trapping.
enum YumiWidgetInterfaceText {
    /// The app's interface language guessed from the device, for the moments
    /// before the app has synced and said what it is set to.
    static var deviceInterfaceLanguage: String {
        for identifier in Locale.preferredLanguages {
            let code = identifier.lowercased()

            if code.hasPrefix("zh") { return "traditional-chinese" }
            if code.hasPrefix("es") { return "spanish" }
            if code.hasPrefix("fr") { return "french" }
            if code.hasPrefix("it") { return "italian" }
            if code.hasPrefix("ja") { return "japanese" }
            if code.hasPrefix("ko") { return "korean" }
            if code.hasPrefix("en") { return "english" }
        }

        return "english"
    }

    static func addWord(_ language: String) -> String {
        switch language {
        case "traditional-chinese": return "新增單字"
        case "spanish": return "Añadir palabra"
        case "french": return "Ajouter un mot"
        case "italian": return "Aggiungi parola"
        case "japanese": return "単語を追加"
        case "korean": return "단어 추가"
        default: return "Add word"
        }
    }

    static func identifyWithCamera(_ language: String) -> String {
        switch language {
        case "traditional-chinese": return "相機辨識"
        case "spanish": return "Identificar con la cámara"
        case "french": return "Identifier avec l'appareil photo"
        case "italian": return "Riconosci con la fotocamera"
        case "japanese": return "カメラで識別"
        case "korean": return "카메라로 알아보기"
        default: return "Identify with camera"
        }
    }

    static func previousWord(_ language: String) -> String {
        switch language {
        case "traditional-chinese": return "上一個單字"
        case "spanish": return "Palabra anterior"
        case "french": return "Mot précédent"
        case "italian": return "Parola precedente"
        case "japanese": return "前の単語"
        case "korean": return "이전 단어"
        default: return "Previous word"
        }
    }

    static func nextWord(_ language: String) -> String {
        switch language {
        case "traditional-chinese": return "下一個單字"
        case "spanish": return "Palabra siguiente"
        case "french": return "Mot suivant"
        case "italian": return "Parola successiva"
        case "japanese": return "次の単語"
        case "korean": return "다음 단어"
        default: return "Next word"
        }
    }

    /// The widget gallery's sample card.
    static func preview(_ language: String) -> YumiWidgetLocalizedText {
        switch language {
        case "traditional-chinese":
            return YumiWidgetLocalizedText(
                headline: "Yumi 對今天的單字很好奇",
                hint: "再學一個試試？",
                emptyWord: "還沒有今日單字",
                cookieUnit: ""
            )
        case "spanish":
            return YumiWidgetLocalizedText(
                headline: "Yumi tiene curiosidad por la palabra de hoy",
                hint: "¿Pruebas con una más?",
                emptyWord: "Aún no hay palabra de hoy",
                cookieUnit: ""
            )
        case "french":
            return YumiWidgetLocalizedText(
                headline: "Yumi s'intéresse au mot du jour",
                hint: "Et si vous en appreniez un autre ?",
                emptyWord: "Pas encore de mot du jour",
                cookieUnit: ""
            )
        case "italian":
            return YumiWidgetLocalizedText(
                headline: "Yumi vuole scoprire la parola di oggi",
                hint: "Ne provi un'altra?",
                emptyWord: "Ancora nessuna parola di oggi",
                cookieUnit: ""
            )
        case "japanese":
            return YumiWidgetLocalizedText(
                headline: "Yumi は今日の単語に興味しんしん",
                hint: "もうひとつ覚えてみる？",
                emptyWord: "今日の単語はまだありません",
                cookieUnit: ""
            )
        case "korean":
            return YumiWidgetLocalizedText(
                headline: "Yumi가 오늘의 단어를 궁금해해요",
                hint: "하나 더 배워 볼까요?",
                emptyWord: "아직 오늘의 단어가 없어요",
                cookieUnit: ""
            )
        default:
            return YumiWidgetLocalizedText(
                headline: "Yumi is curious about today’s word",
                hint: "Try one more?",
                emptyWord: "No word for today yet",
                cookieUnit: ""
            )
        }
    }

    /// What the widget shows before the app has synced anything.
    static func empty(_ language: String) -> YumiWidgetLocalizedText {
        switch language {
        case "traditional-chinese":
            return YumiWidgetLocalizedText(
                headline: "打開 Exchange Notes",
                hint: "打開 App 同步 Yumi",
                emptyWord: "Yumi 正在等待同步",
                cookieUnit: ""
            )
        case "spanish":
            return YumiWidgetLocalizedText(
                headline: "Abre Exchange Notes",
                hint: "Abre la app para sincronizar a Yumi",
                emptyWord: "Yumi está esperando la sincronización",
                cookieUnit: ""
            )
        case "french":
            return YumiWidgetLocalizedText(
                headline: "Ouvrez Exchange Notes",
                hint: "Ouvrez l'app pour synchroniser Yumi",
                emptyWord: "Yumi attend la synchronisation",
                cookieUnit: ""
            )
        case "italian":
            return YumiWidgetLocalizedText(
                headline: "Apri Exchange Notes",
                hint: "Apri l'app per sincronizzare Yumi",
                emptyWord: "Yumi è in attesa della sincronizzazione",
                cookieUnit: ""
            )
        case "japanese":
            return YumiWidgetLocalizedText(
                headline: "Exchange Notes を開く",
                hint: "アプリを開いて Yumi を同期",
                emptyWord: "Yumi は同期を待っています",
                cookieUnit: ""
            )
        case "korean":
            return YumiWidgetLocalizedText(
                headline: "Exchange Notes 열기",
                hint: "앱을 열어 Yumi를 동기화하세요",
                emptyWord: "Yumi가 동기화를 기다리고 있어요",
                cookieUnit: ""
            )
        default:
            return YumiWidgetLocalizedText(
                headline: "Open Exchange Notes",
                hint: "Open the app to sync Yumi",
                emptyWord: "Yumi is waiting to sync",
                cookieUnit: ""
            )
        }
    }
}
