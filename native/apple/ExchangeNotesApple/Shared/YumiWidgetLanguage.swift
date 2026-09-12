import Foundation

/// How the widget names and sounds each language.
///
/// A deliberate hand-kept copy of the five rows in `lib/languages.ts`. The
/// widget extension cannot read the app's TypeScript, and the alternative —
/// generating this file — would add a build step to a table that changes once
/// a year. `tests/yumiWidgetLanguages.test.ts` compares the two so a drift
/// fails in CI rather than on someone's home screen.
///
/// Everything here takes a BCP-47 content code (`en`, `zh-TW`, `es`, `fr`,
/// `it`) and answers for an unknown one rather than trapping: a widget is the
/// worst place to crash, and an App Group file written by a newer build than
/// the installed extension is a normal thing to meet.
enum YumiWidgetLanguage {
    /// The short mark on an audio button. Two Latin letters, or the character
    /// for a language whose own script is the point.
    static func badge(for code: String) -> String {
        switch normalized(code) {
        case "en": return "En"
        case "zh-TW": return "中"
        case "es": return "Es"
        case "fr": return "Fr"
        case "it": return "It"
        default: return "·"
        }
    }

    /// The voice `AVSpeechSynthesisVoice` is asked for.
    static func speechTag(for code: String) -> String {
        switch normalized(code) {
        case "en": return "en-US"
        case "zh-TW": return "zh-TW"
        case "es": return "es-ES"
        case "fr": return "fr-FR"
        case "it": return "it-IT"
        default: return "en-US"
        }
    }

    /// The language's name, in the language the app is currently set to.
    ///
    /// `interfaceLanguage` arrives in the app's own form
    /// (`traditional-chinese`, `spanish`, …) rather than as a content code,
    /// because that is what the payload carries.
    static func name(
        for code: String,
        displayedIn interfaceLanguage: String
    ) -> String {
        let names = nameTable[normalized(code)]
        return names?[interfaceLanguage]
            ?? names?["english"]
            ?? code
    }

    /// The whole VoiceOver sentence for an audio button.
    static func playPronunciationLabel(
        for code: String,
        displayedIn interfaceLanguage: String
    ) -> String {
        let language = name(for: code, displayedIn: interfaceLanguage)

        switch interfaceLanguage {
        case "traditional-chinese": return "播放\(language)發音"
        case "spanish": return "Reproducir la pronunciación en \(language)"
        case "french": return "Écouter la prononciation en \(language)"
        case "italian": return "Ascolta la pronuncia in \(language)"
        default: return "Play \(language) pronunciation"
        }
    }

    /// Legacy snapshots wrote the interface-language form into content
    /// fields. Accepting both keeps a widget that has not been refreshed
    /// since the upgrade readable.
    private static func normalized(_ code: String) -> String {
        switch code {
        case "english": return "en"
        case "traditional-chinese": return "zh-TW"
        case "spanish": return "es"
        case "french": return "fr"
        case "italian": return "it"
        default: return code
        }
    }

    private static let nameTable: [String: [String: String]] = [
        "en": [
            "english": "English",
            "traditional-chinese": "英文",
            "spanish": "Inglés",
            "french": "Anglais",
            "italian": "Inglese",
        ],
        "zh-TW": [
            "english": "Traditional Chinese",
            "traditional-chinese": "繁體中文",
            "spanish": "Chino tradicional",
            "french": "Chinois traditionnel",
            "italian": "Cinese tradizionale",
        ],
        "es": [
            "english": "Spanish",
            "traditional-chinese": "西班牙文",
            "spanish": "Español",
            "french": "Espagnol",
            "italian": "Spagnolo",
        ],
        "fr": [
            "english": "French",
            "traditional-chinese": "法文",
            "spanish": "Francés",
            "french": "Français",
            "italian": "Francese",
        ],
        "it": [
            "english": "Italian",
            "traditional-chinese": "義大利文",
            "spanish": "Italiano",
            "french": "Italien",
            "italian": "Italiano",
        ],
    ]
}
