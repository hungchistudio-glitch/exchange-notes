import Foundation

enum ExchangeNotesRoute: String {
    case home
    case vocabulary
    case review
    case capture
    case profile
    case pronunciation

    private static let productionURL =
        URL(string: "https://exchange-notes-app.vercel.app")!

    private static var rootURL: URL {
#if DEBUG
        if
            let value = ProcessInfo.processInfo
                .environment["EXCHANGE_NOTES_WEB_URL"],
            let url = URL(string: value),
            let scheme = url.scheme?.lowercased(),
            scheme == "http" || scheme == "https"
        {
            return url
        }
#endif

        return productionURL
    }

    var webURL: URL {
        switch self {
        case .home:
            return Self.rootURL
        case .vocabulary:
            return Self.rootURL
                .appendingPathComponent("vocabulary")
        case .review:
            return Self.rootURL
                .appendingPathComponent("review")
        case .capture:
            return Self.rootURL
                .appendingPathComponent("capture")
        case .profile:
            return Self.rootURL
                .appendingPathComponent("profile")
        case .pronunciation:
            return Self.rootURL
                .appendingPathComponent("pronunciation")
        }
    }

    static func webURL(
        for deepLinkURL: URL
    ) -> URL {
        let route =
            ExchangeNotesRoute(
                rawValue:
                    deepLinkURL.host ?? ""
            )
            ?? .home

        guard
            var components = URLComponents(
                url: route.webURL,
                resolvingAgainstBaseURL: false
            )
        else {
            return route.webURL
        }

        var queryItems =
            URLComponents(
                url: deepLinkURL,
                resolvingAgainstBaseURL: false
            )?
            .queryItems
            ?? []

        queryItems.append(
            URLQueryItem(
                name: "widgetNonce",
                value: String(
                    Int(
                        Date()
                            .timeIntervalSince1970
                            * 1000
                    )
                )
            )
        )

        components.queryItems = queryItems

        return components.url
            ?? route.webURL
    }

    static func webURL(
        forNotificationPath path: String
    ) -> URL {
        let normalized =
            path.trimmingCharacters(
                in: .whitespacesAndNewlines
            )

        guard
            normalized.hasPrefix("/"),
            !normalized.hasPrefix("//"),
            let candidate =
                URL(
                    string: normalized,
                    relativeTo: rootURL
                )?.absoluteURL,
            candidate.scheme == rootURL.scheme,
            candidate.host == rootURL.host,
            var components =
                URLComponents(
                    url: candidate,
                    resolvingAgainstBaseURL:
                        false
                )
        else {
            return ExchangeNotesRoute.home
                .webURL
        }

        var queryItems =
            components.queryItems ?? []

        queryItems.append(
            URLQueryItem(
                name: "notificationNonce",
                value: String(
                    Int(
                        Date()
                            .timeIntervalSince1970
                            * 1000
                    )
                )
            )
        )

        components.queryItems = queryItems

        return components.url
            ?? candidate
    }

    init(deepLinkURL url: URL) {
        self =
            ExchangeNotesRoute(
                rawValue: url.host ?? ""
            )
            ?? .home
    }
}
