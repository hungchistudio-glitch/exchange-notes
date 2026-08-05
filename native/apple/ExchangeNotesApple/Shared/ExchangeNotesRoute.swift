import Foundation

enum ExchangeNotesRoute: String {
    case home
    case vocabulary
    case review

    private static let productionURL =
        URL(string: "https://exchange-notes-app.vercel.app")!

    var webURL: URL {
        switch self {
        case .home:
            return Self.productionURL
        case .vocabulary:
            return Self.productionURL
                .appendingPathComponent("vocabulary")
        case .review:
            return Self.productionURL
                .appendingPathComponent("review")
        }
    }

    init(deepLinkURL url: URL) {
        self = ExchangeNotesRoute(rawValue: url.host ?? "") ?? .home
    }
}
