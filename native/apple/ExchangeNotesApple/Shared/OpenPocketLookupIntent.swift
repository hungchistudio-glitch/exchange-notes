import AppIntents
import Foundation

@available(iOS 18.0, *)
struct OpenPocketLookupIntent: AppIntent {
    static let title: LocalizedStringResource = "intent.pocket.title"
    static let description = IntentDescription("intent.pocket.description")
    @Parameter(title: "intent.pocket.voice", default: false) var voice: Bool
    func perform() async throws -> some IntentResult & OpensIntent {
        let url = URL(string: "exchangenotes://lookup?input=\(voice ? "voice" : "text")")!
        return .result(opensIntent: OpenURLIntent(url))
    }
}
