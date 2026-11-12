import Foundation

/// An offline export of the app's existing dictionary, never a second authored word bank.
struct PocketDictionary {
    let rows: [[String: [String]]]
    init(bundle: Bundle = .main) {
        if let url = bundle.url(forResource: "pocket-lexicon", withExtension: "json"),
           let data = try? Data(contentsOf: url),
           let parsed = try? JSONDecoder().decode([[String: [String]]].self, from: data) { rows = parsed }
        else { rows = [] }
    }
    init(data: Data) throws { rows = try JSONDecoder().decode([[String: [String]]].self, from: data) }
    static func normalized(_ value: String) -> String {
        value.trimmingCharacters(in: .whitespacesAndNewlines)
            .precomposedStringWithCanonicalMapping.lowercased()
            .replacingOccurrences(of: "’", with: "'")
    }
    func lookup(_ word: String, from source: String, to target: String) -> (String, String)? {
        let query = Self.normalized(word)
        guard !query.isEmpty, query.count <= 200, source != target else { return nil }
        for row in rows where row[source]?.contains(where: { Self.normalized($0) == query }) == true {
            if let a = row[source]?.first, let b = row[target]?.first { return (a,b) }
        }
        return nil
    }
}
