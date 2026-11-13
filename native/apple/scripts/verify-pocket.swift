import Foundation

// Isolated test suite: never reads or modifies a user's App Group preferences.
enum YumiWidgetStore { static let suiteName = "pocket-verification-\(ProcessInfo.processInfo.processIdentifier)" }
@main enum VerifyPocket {
    static func main() throws {
        let defaults = UserDefaults(suiteName:YumiWidgetStore.suiteName)!
        defer { defaults.removePersistentDomain(forName:YumiWidgetStore.suiteName) }
        let payload: [String:Any] = ["version":1,"appMode":"cosmic","interfaceLanguage":"french","learningLanguageCode":"fr","translationLanguageCode":"zh-TW"]
        let preferences = PocketPreferences(payload:payload)!
        precondition(preferences.saveIfChanged())
        precondition(!preferences.saveIfChanged(), "Identical settings must not reload WidgetKit")
        precondition(PocketPreferences.load() == preferences)
        for (key,value) in [("version",2 as Any),("appMode","invalid"),("interfaceLanguage","zh-CN"),("learningLanguageCode","ja"),("translationLanguageCode","fr")] {
            var invalid=payload; invalid[key]=value
            precondition(PocketPreferences(payload:invalid) == nil, "Reject invalid \(key)")
        }
        var corrupt=preferences; corrupt.appMode="invalid"
        defaults.set(try JSONEncoder().encode(corrupt),forKey:PocketPreferences.key)
        precondition(PocketPreferences.load() == PocketPreferences())
        let data = try Data(contentsOf:URL(fileURLWithPath:CommandLine.arguments[1]))
        let dictionary = try PocketDictionary(data:data)
        precondition(dictionary.rows.count >= 4000)
        let terms = ["en":"thank you","zh-TW":"謝謝","es":"gracias","fr":"merci","it":"grazie"]
        var pairs=0
        for (source,word) in terms {
            for (target,translation) in terms where target != source {
                precondition(dictionary.lookup("  \(word.uppercased())  ",from:source,to:target)?.1 == translation)
                pairs += 1
            }
        }
        precondition(dictionary.lookup("missingxyz",from:"en",to:"fr") == nil)
        precondition(dictionary.lookup(String(repeating:"a",count:201),from:"en",to:"fr") == nil)
        precondition(dictionary.lookup("merci",from:"fr",to:"fr") == nil)
        print("Pocket preferences, stale-setting protection, dictionary export and \(pairs) language pairs passed.")
    }
}
