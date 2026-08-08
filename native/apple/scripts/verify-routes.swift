import Foundation

@main
enum VerifyExchangeNotesRoutes {
    static func main() {
        verify(
            deepLink: "exchangenotes://home",
            expectedPath: ""
        )
        verify(
            deepLink: "exchangenotes://vocabulary?widgetAction=add-word",
            expectedPath: "/vocabulary",
            expectedQueryItems: [
                URLQueryItem(
                    name: "widgetAction",
                    value: "add-word"
                ),
            ]
        )
        verify(
            deepLink:
                "exchangenotes://vocabulary"
                + "?widgetAction=open-word"
                + "&widgetWordId=word-123",
            expectedPath: "/vocabulary",
            expectedQueryItems: [
                URLQueryItem(
                    name: "widgetAction",
                    value: "open-word"
                ),
                URLQueryItem(
                    name: "widgetWordId",
                    value: "word-123"
                ),
            ]
        )
        verify(
            deepLink: "exchangenotes://capture?widgetAction=camera",
            expectedPath: "/capture",
            expectedQueryItems: [
                URLQueryItem(
                    name: "widgetAction",
                    value: "camera"
                ),
            ]
        )
        verify(
            deepLink: "exchangenotes://review",
            expectedPath: "/review"
        )
        verify(
            deepLink: "exchangenotes://profile",
            expectedPath: "/profile"
        )
        verify(
            deepLink: "exchangenotes://pronunciation",
            expectedPath: "/pronunciation"
        )

        print("Native deep-link route verification passed.")
    }

    private static func verify(
        deepLink: String,
        expectedPath: String,
        expectedQueryItems: [URLQueryItem] = []
    ) {
        guard let sourceURL = URL(string: deepLink) else {
            fail("Invalid test deep link: \(deepLink)")
        }

        let destination = ExchangeNotesRoute.webURL(
            for: sourceURL
        )

        guard destination.scheme == "https" else {
            fail("Expected HTTPS destination for \(deepLink)")
        }

        guard destination.host == "exchange-notes-app.vercel.app" else {
            fail("Unexpected destination host for \(deepLink)")
        }

        guard destination.path == expectedPath else {
            fail(
                "Expected path \(expectedPath), got \(destination.path)"
            )
        }

        let queryItems = URLComponents(
            url: destination,
            resolvingAgainstBaseURL: false
        )?.queryItems ?? []

        for expectedQueryItem in expectedQueryItems {
            if !queryItems.contains(expectedQueryItem) {
                fail(
                    "Missing query item \(expectedQueryItem.name) for \(deepLink)"
                )
            }
        }

        guard queryItems.contains(where: {
            $0.name == "widgetNonce"
        }) else {
            fail("Missing widgetNonce for \(deepLink)")
        }
    }

    private static func fail(_ message: String) -> Never {
        FileHandle.standardError.write(
            Data((message + "\n").utf8)
        )
        exit(EXIT_FAILURE)
    }
}
