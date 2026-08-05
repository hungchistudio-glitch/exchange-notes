import Foundation

struct YumiWidgetLocalizedText: Codable {
    let headline: String
    let hint: String
    let emptyWord: String
    let cookieUnit: String

    static let preview = YumiWidgetLocalizedText(
        headline: "Yumi 對今天的單字很好奇",
        hint: "再學一個試試？",
        emptyWord: "還沒有今日單字",
        cookieUnit: "餅乾"
    )

    static let empty = YumiWidgetLocalizedText(
        headline: "Open Exchange Notes",
        hint: "打開 App 同步 Yumi",
        emptyWord: "Yumi 正在等待同步",
        cookieUnit: ""
    )
}

struct YumiWidgetWord: Codable, Hashable {
    let id: String
    let englishWord: String
    let traditionalChineseWord: String
    let pinyin: String
    let zhuyin: String

    static let empty = YumiWidgetWord(
        id: "empty",
        englishWord: "",
        traditionalChineseWord: "",
        pinyin: "",
        zhuyin: ""
    )
}

struct YumiWidgetData: Codable {
    let cookieCount: Int
    let cookieGoal: Int

    let englishWord: String
    let traditionalChineseWord: String
    let pinyin: String
    let zhuyin: String

    /// Recent saved words used by the interactive previous/next controls.
    /// Optional keeps existing App Group payloads backward-compatible.
    let words: [YumiWidgetWord]?

    /// App interface language. This controls dynamic companion copy supplied
    /// by the existing web i18n system.
    let interfaceLanguage: String

    /// Learning language. This controls which side of the bilingual word card
    /// receives visual priority, while both languages remain visible.
    let learningLanguage: String

    /// Mood identifier computed by the existing web mood engine.
    let moodKey: String

    /// Already localized by the web app's existing i18n dictionary.
    let localizedText: YumiWidgetLocalizedText

    let updatedAt: Date

    var progress: Double {
        guard cookieGoal > 0 else {
            return 0
        }

        return min(
            max(Double(cookieCount) / Double(cookieGoal), 0),
            1
        )
    }

    var mood: YumiMood {
        YumiMood.from(rawValue: moodKey)
    }

    var availableWords: [YumiWidgetWord] {
        let recent = (words ?? []).filter {
            !$0.englishWord.isEmpty
            || !$0.traditionalChineseWord.isEmpty
        }

        if !recent.isEmpty {
            return recent
        }

        if !englishWord.isEmpty
            || !traditionalChineseWord.isEmpty
        {
            return [
                YumiWidgetWord(
                    id: "legacy-current-word",
                    englishWord: englishWord,
                    traditionalChineseWord:
                        traditionalChineseWord,
                    pinyin: pinyin,
                    zhuyin: zhuyin
                )
            ]
        }

        return []
    }

    var isLearningTraditionalChinese: Bool {
        learningLanguage == "traditional-chinese"
    }

    static let preview = YumiWidgetData(
        cookieCount: 2,
        cookieGoal: 3,
        englishWord: "curious",
        traditionalChineseWord: "好奇的",
        pinyin: "hǎo qí de",
        zhuyin: "ㄏㄠˇ ㄑㄧˊ ㄉㄜ˙",
        words: [
            YumiWidgetWord(
                id: "preview-curious",
                englishWord: "curious",
                traditionalChineseWord: "好奇的",
                pinyin: "hǎo qí de",
                zhuyin: "ㄏㄠˇ ㄑㄧˊ ㄉㄜ˙"
            ),
            YumiWidgetWord(
                id: "preview-discipline",
                englishWord: "discipline",
                traditionalChineseWord: "自律",
                pinyin: "zì lǜ",
                zhuyin: "ㄗˋ ㄌㄩˋ"
            ),
            YumiWidgetWord(
                id: "preview-observe",
                englishWord: "observe",
                traditionalChineseWord: "觀察",
                pinyin: "guān chá",
                zhuyin: "ㄍㄨㄢ ㄔㄚˊ"
            ),
        ],
        interfaceLanguage: "traditional-chinese",
        learningLanguage: "english",
        moodKey: YumiMood.curious.rawValue,
        localizedText: .preview,
        updatedAt: Date()
    )

    static let empty = YumiWidgetData(
        cookieCount: 0,
        cookieGoal: 3,
        englishWord: "",
        traditionalChineseWord: "",
        pinyin: "",
        zhuyin: "",
        words: [],
        interfaceLanguage: "english",
        learningLanguage: "english",
        moodKey: YumiMood.waiting.rawValue,
        localizedText: .empty,
        updatedAt: Date()
    )
}

enum YumiWidgetStore {
    static let suiteName =
        "group.art.hungchi.exchangenotes"

    static let storageKey =
        "yumi-widget-data"

    static let selectionKey =
        "yumi-widget-selected-word-index"

    private static let fileName =
        "yumi-widget-data.json"

    private static var sharedFileURL: URL? {
        FileManager.default
            .containerURL(
                forSecurityApplicationGroupIdentifier:
                    suiteName
            )?
            .appendingPathComponent(
                fileName,
                isDirectory: false
            )
    }

    static func selectedIndex(
        for data: YumiWidgetData
    ) -> Int {
        let count = data.availableWords.count

        guard count > 0 else {
            return 0
        }

        let stored = UserDefaults(
            suiteName: suiteName
        )?.integer(
            forKey: selectionKey
        ) ?? 0

        return normalizedIndex(
            stored,
            count: count
        )
    }

    static func selectedWord(
        in data: YumiWidgetData
    ) -> YumiWidgetWord {
        let words = data.availableWords

        guard !words.isEmpty else {
            return .empty
        }

        return words[selectedIndex(for: data)]
    }

    static func moveSelection(
        by offset: Int
    ) {
        let data = load()
        let count = data.availableWords.count

        guard count > 1 else {
            return
        }

        let next = normalizedIndex(
            selectedIndex(for: data) + offset,
            count: count
        )

        UserDefaults(
            suiteName: suiteName
        )?.set(
            next,
            forKey: selectionKey
        )
    }

    private static func normalizedIndex(
        _ index: Int,
        count: Int
    ) -> Int {
        guard count > 0 else {
            return 0
        }

        return ((index % count) + count) % count
    }

    static func load() -> YumiWidgetData {
        let decoder = JSONDecoder()

        if
            let fileURL = sharedFileURL,
            let raw = try? Data(
                contentsOf: fileURL
            ),
            let decoded = try? decoder.decode(
                YumiWidgetData.self,
                from: raw
            )
        {
            return decoded
        }

        if
            let defaults = UserDefaults(
                suiteName: suiteName
            ),
            let raw = defaults.data(
                forKey: storageKey
            ),
            let decoded = try? decoder.decode(
                YumiWidgetData.self,
                from: raw
            )
        {
            return decoded
        }

        return .empty
    }

    @discardableResult
    static func save(
        _ data: YumiWidgetData
    ) -> Bool {
        guard
            let encoded = try? JSONEncoder()
                .encode(data)
        else {
            return false
        }

        var saved = false

        if let fileURL = sharedFileURL {
            do {
                try encoded.write(
                    to: fileURL,
                    options: .atomic
                )
                saved = true
            } catch {
                // UserDefaults remains as a compatibility fallback.
            }
        }

        if let defaults = UserDefaults(
            suiteName: suiteName
        ) {
            defaults.set(
                encoded,
                forKey: storageKey
            )

            let count = data.availableWords.count
            let current = defaults.integer(
                forKey: selectionKey
            )

            if count == 0 || current >= count {
                defaults.set(
                    0,
                    forKey: selectionKey
                )
            }

            saved = true
        }

        return saved
    }
}
