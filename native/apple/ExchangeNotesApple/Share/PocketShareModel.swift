import AVFoundation
import Foundation

/// What Yumi Pocket Lookup's share extension knows and does (Chi, 2026-11-12).
///
/// With the extension's own key (Shared/PocketKeyStore.swift) a shared word
/// is looked up by the app's AI lookup, under the reader's account, and can
/// be saved with 收藏: never by itself. Without a key, or without a
/// connection, it falls back to the built-in dictionary and says so; a key
/// the server refuses is forgotten, and the reader is asked to open the app
/// once, which issues a new one.
@MainActor final class PocketShareModel: ObservableObject {
    enum Phase: Equatable { case idle, looking, found, missing }
    enum SaveState: Equatable { case idle, saving, saved, duplicate, failed }

    @Published var preferences = PocketPreferences.load()
    @Published var query = ""
    @Published private(set) var phase: Phase = .idle
    @Published private(set) var entry: PocketAPI.Entry?
    /// The answer came from the built-in dictionary, not the AI lookup.
    @Published private(set) var fromDictionary = false
    @Published private(set) var saveState: SaveState = .idle
    /// No key (or a refused one): saving waits for the app to be opened once.
    @Published private(set) var needsConnection: Bool

    private var key = PocketKeyStore.load()
    private let dictionary = PocketDictionary()
    private let speech = AVSpeechSynthesizer()
    private var task: Task<Void, Never>?

    init() {
        needsConnection = key == nil
    }

    var canSave: Bool { key != nil && entry != nil && !fromDictionary }

    private var trimmedQuery: String {
        query.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    var queryIsUsable: Bool {
        !trimmedQuery.isEmpty && trimmedQuery.count <= 200
            && preferences.learningLanguageCode != preferences.translationLanguageCode
    }

    /// Forgets the last answer: the text or a language changed.
    func invalidate() {
        task?.cancel()
        stopSpeech()
        entry = nil
        fromDictionary = false
        saveState = .idle
        phase = .idle
    }

    func lookup() {
        invalidate()
        guard queryIsUsable else { return }
        let text = trimmedQuery
        guard let key else {
            lookupInDictionary(text)
            return
        }
        phase = .looking
        let explain = PocketAPI.languageCode(forInterface: preferences.interfaceLanguage)
        task = Task { [weak self] in
            do {
                let found = try await PocketAPI.lookup(text, explainLanguage: explain, key: key.key)
                guard let self, !Task.isCancelled else { return }
                self.entry = found
                self.fromDictionary = false
                self.phase = .found
            } catch PocketAPI.Failure.unauthorized {
                guard let self, !Task.isCancelled else { return }
                self.forgetKey()
                self.lookupInDictionary(text)
            } catch {
                guard let self, !Task.isCancelled else { return }
                self.lookupInDictionary(text)
            }
        }
    }

    func save() {
        guard let key, let entry, !fromDictionary, saveState == .idle || saveState == .failed else { return }
        saveState = .saving
        Task { [weak self] in
            do {
                let outcome = try await PocketAPI.save(entry, key: key.key)
                self?.saveState = outcome == "duplicate" ? .duplicate : .saved
            } catch PocketAPI.Failure.unauthorized {
                self?.forgetKey()
                self?.saveState = .failed
            } catch {
                self?.saveState = .failed
            }
        }
    }

    private func lookupInDictionary(_ text: String) {
        let learning = preferences.learningLanguageCode
        let translation = preferences.translationLanguageCode
        if let (word, gloss) = dictionary.lookup(text, from: learning, to: translation) {
            entry = PocketAPI.Entry(
                term: word,
                translation: gloss,
                termLanguage: learning,
                translationLanguage: translation
            )
            fromDictionary = true
            phase = .found
        } else {
            phase = .missing
        }
    }

    private func forgetKey() {
        PocketKeyStore.clear()
        key = nil
        needsConnection = true
    }

    func stopSpeech() {
        speech.stopSpeaking(at: .immediate)
    }

    func speak(_ text: String, language: String) {
        stopSpeech()
        let utterance = AVSpeechUtterance(string: text)
        let tag = YumiWidgetLanguage.speechTag(for: language)
        // The best voice installed for the language, else the system's own.
        utterance.voice = AVSpeechSynthesisVoice.speechVoices()
            .filter { $0.language == tag }
            .max { $0.quality.rawValue < $1.quality.rawValue }
            ?? AVSpeechSynthesisVoice(language: tag)
        utterance.rate = AVSpeechUtteranceDefaultSpeechRate * 0.9
        speech.speak(utterance)
    }
}

/// The two requests the extension's key may make (lib/pocket/keys.ts): the
/// app's own lookup and the pocket save. Nothing else accepts the key.
enum PocketAPI {
    enum Failure: Error { case unauthorized, server }

    /// The fields of a lookup the extension shows and saves.
    struct Entry: Codable, Equatable {
        var term: String
        var translation: String
        var partOfSpeech: String?
        var termIpa: String?
        var termExample: String?
        var translationExample: String?
        var confidence: String?
        var category: String?
        var termLanguage: String?
        var translationLanguage: String?
    }

    static func languageCode(forInterface language: String) -> String {
        switch language {
        case "traditional-chinese": "zh-TW"
        case "spanish": "es"
        case "french": "fr"
        case "italian": "it"
        default: "en"
        }
    }

    private static func request(_ path: String, key: String, body: [String: Any]) throws -> URLRequest {
        var request = URLRequest(url: ExchangeNotesRoute.rootURL.appendingPathComponent(path))
        request.httpMethod = "POST"
        request.timeoutInterval = 25
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(key)", forHTTPHeaderField: "Authorization")
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        return request
    }

    private static func send(_ request: URLRequest) async throws -> Data {
        let (data, response) = try await URLSession.shared.data(for: request)
        let status = (response as? HTTPURLResponse)?.statusCode ?? 0
        if status == 401 { throw Failure.unauthorized }
        guard (200..<300).contains(status) else { throw Failure.server }
        return data
    }

    static func lookup(_ text: String, explainLanguage: String, key: String) async throws -> Entry {
        let data = try await send(request("api/classify-text", key: key, body: [
            "text": text,
            "explainLanguage": explainLanguage,
        ]))
        let entry = try JSONDecoder().decode(Entry.self, from: data)
        guard !entry.term.isEmpty else { throw Failure.server }
        return entry
    }

    /// "saved" or "duplicate".
    static func save(_ entry: Entry, key: String) async throws -> String {
        var body: [String: Any] = ["term": entry.term, "translation": entry.translation]
        body["termLanguage"] = entry.termLanguage
        body["translationLanguage"] = entry.translationLanguage
        body["partOfSpeech"] = entry.partOfSpeech
        body["termExample"] = entry.termExample
        body["translationExample"] = entry.translationExample
        body["confidence"] = entry.confidence
        body["category"] = entry.category
        let data = try await send(request("api/pocket/save", key: key, body: body))
        let outcome = try JSONSerialization.jsonObject(with: data) as? [String: Any]
        return (outcome?["status"] as? String) ?? "saved"
    }
}
