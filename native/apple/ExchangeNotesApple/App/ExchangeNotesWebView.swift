import SwiftUI
import WebKit
import WidgetKit

struct ExchangeNotesWebView: UIViewRepresentable {
    let url: URL

    func makeCoordinator() -> Coordinator {
        Coordinator(trustedURL: url)
    }

    func makeUIView(
        context: Context
    ) -> WKWebView {
        let configuration =
            WKWebViewConfiguration()

        configuration.websiteDataStore =
            .default()

        configuration.allowsInlineMediaPlayback =
            true

        configuration.userContentController.add(
            context.coordinator,
            name: Coordinator.messageName
        )

#if !EXCHANGE_NOTES_PERSONAL_TEAM
        configuration.userContentController.add(
            context.coordinator,
            name:
                Coordinator.nativePushMessageName
        )
#endif

        let webView = WKWebView(
            frame: .zero,
            configuration: configuration
        )

        context.coordinator.webView = webView

        webView.navigationDelegate =
            context.coordinator

        webView.allowsBackForwardNavigationGestures =
            true

        return webView
    }

    func updateUIView(
        _ webView: WKWebView,
        context: Context
    ) {
        guard
            context.coordinator.lastURL
                != url
        else {
            return
        }

        context.coordinator.lastURL =
            url

        webView.load(
            URLRequest(
                url: url
            )
        )
    }

    static func dismantleUIView(
        _ webView: WKWebView,
        coordinator: Coordinator
    ) {
        webView.configuration
            .userContentController
            .removeScriptMessageHandler(
                forName:
                    Coordinator.messageName
            )

#if !EXCHANGE_NOTES_PERSONAL_TEAM
        webView.configuration
            .userContentController
            .removeScriptMessageHandler(
                forName:
                    Coordinator.nativePushMessageName
            )
#endif

        webView.navigationDelegate = nil
    }

    @MainActor
    final class Coordinator:
        NSObject,
        WKScriptMessageHandler,
        WKNavigationDelegate
    {
        static let messageName =
            "yumiWidgetUpdate"

        static let nativePushMessageName =
            "nativePushControl"

        static let nativeReadyScript = """
        window.__exchangeNotesNativeBridge = true;
        window.dispatchEvent(
          new Event('exchange-notes-native-ready')
        );
        window.__exchangeNotesFlushYumiWidget?.();
        """

        weak var webView: WKWebView?

        var lastURL: URL?

        private let trustedURL: URL

        init(trustedURL: URL) {
            self.trustedURL = trustedURL
            super.init()

            NotificationCenter.default
                .addObserver(
                    self,
                    selector:
                        #selector(
                            nativePushTokenDidChange(
                                _:
                            )
                        ),
                    name:
                        .exchangeNotesNativePushToken,
                    object: nil
                )
        }

        deinit {
            NotificationCenter.default
                .removeObserver(self)
        }

        func webView(
            _ webView: WKWebView,
            didFinish navigation: WKNavigation!
        ) {
            guard isTrusted(webView.url) else {
                return
            }

            webView.evaluateJavaScript(
                Self.nativeReadyScript
            )
        }

        func userContentController(
            _ userContentController:
                WKUserContentController,
            didReceive message:
                WKScriptMessage
        ) {
            guard
                message.frameInfo.isMainFrame,
                isTrusted(
                    message.frameInfo
                        .securityOrigin
                ),
                let sourceWebView =
                    message.webView,
                let expectedWebView = webView,
                sourceWebView === expectedWebView,
                isTrusted(sourceWebView.url)
            else {
                return
            }

            if
                message.name
                    == Self.nativePushMessageName
            {
                handleNativePushMessage(
                    message.body
                )

                return
            }

            guard
                message.name
                    == Self.messageName
            else {
                return
            }

            guard
                let body =
                    message.body
                    as? [String: Any],
                let cookieCount =
                    intValue(
                        body["cookieCount"]
                    ),
                let cookieGoal =
                    intValue(
                        body["cookieGoal"]
                    ),
                let englishWord =
                    stringValue(
                        body["englishWord"]
                    ),
                let traditionalChineseWord =
                    stringValue(
                        body[
                            "traditionalChineseWord"
                        ]
                    ),
                let pinyin =
                    stringValue(
                        body["pinyin"]
                    ),
                let zhuyin =
                    stringValue(
                        body["zhuyin"]
                    ),
                let interfaceLanguage =
                    stringValue(
                        body[
                            "interfaceLanguage"
                        ]
                    ),
                let learningLanguage =
                    stringValue(
                        body[
                            "learningLanguage"
                        ]
                    ),
                let moodKey =
                    stringValue(
                        body["moodKey"]
                    ),
                let localizedBody =
                    body["localizedText"]
                    as? [String: Any],
                let headline =
                    stringValue(
                        localizedBody[
                            "headline"
                        ]
                    ),
                let hint =
                    stringValue(
                        localizedBody[
                            "hint"
                        ]
                    ),
                let emptyWord =
                    stringValue(
                        localizedBody[
                            "emptyWord"
                        ]
                    ),
                let cookieUnit =
                    stringValue(
                        localizedBody[
                            "cookieUnit"
                        ]
                    )
            else {
                print(
                    "YumiWidget bridge rejected "
                    + "an invalid payload."
                )
                return
            }

            let words =
                widgetWords(
                    from: body["words"]
                )

            let primaryText =
                stringValue(body["primaryText"])
            let secondaryText =
                stringValue(body["secondaryText"])
            let primaryLanguage =
                stringValue(body["primaryLanguage"])
            let secondaryLanguage =
                stringValue(body["secondaryLanguage"])
            let primaryPronunciation =
                stringValue(
                    body["primaryPronunciation"]
                )
            let secondaryPronunciation =
                stringValue(
                    body["secondaryPronunciation"]
                )

            let localizedText =
                YumiWidgetLocalizedText(
                    headline: headline,
                    hint: hint,
                    emptyWord: emptyWord,
                    cookieUnit: cookieUnit
                )

            let data = YumiWidgetData(
                cookieCount: cookieCount,
                cookieGoal: cookieGoal,
                primaryText: primaryText,
                secondaryText: secondaryText,
                primaryLanguage: primaryLanguage,
                secondaryLanguage: secondaryLanguage,
                primaryPronunciation:
                    primaryPronunciation,
                secondaryPronunciation:
                    secondaryPronunciation,
                englishWord: englishWord,
                traditionalChineseWord:
                    traditionalChineseWord,
                pinyin: pinyin,
                zhuyin: zhuyin,
                words: words,
                interfaceLanguage:
                    interfaceLanguage,
                learningLanguage:
                    learningLanguage,
                moodKey: moodKey,
                localizedText:
                    localizedText,
                updatedAt: Date()
            )

            guard YumiWidgetStore.save(data) else {
                print(
                    "YumiWidget bridge could not "
                    + "write the shared payload."
                )
                return
            }

            WidgetCenter.shared.reloadTimelines(
                ofKind: "YumiDailyWidget"
            )

            sourceWebView
                .evaluateJavaScript(
                    """
                    window.dispatchEvent(
                      new Event(
                        'exchange-notes-yumi-widget-saved'
                      )
                    );
                    """
                )
        }

        private func handleNativePushMessage(
            _ body: Any
        ) {
            guard
                let payload =
                    body as? [String: Any],
                let action =
                    payload["action"] as? String
            else {
                return
            }

            switch action {
            case "requestAuthorization":
                NativePushController.shared
                    .requestAuthorizationAndRegister()

            default:
                return
            }
        }

        @objc
        private func nativePushTokenDidChange(
            _ notification: Notification
        ) {
            guard
                let token =
                    notification.userInfo?["token"]
                    as? String,
                let environment =
                    notification.userInfo?[
                        "environment"
                    ] as? String,
                let bundleID =
                    notification.userInfo?[
                        "bundleId"
                    ] as? String
            else {
                return
            }

            emitNativePushToken(
                token: token,
                environment: environment,
                bundleID: bundleID
            )
        }

        private func emitNativePushToken(
            token: String,
            environment: String,
            bundleID: String
        ) {
            guard
                let webView,
                isTrusted(webView.url)
            else {
                return
            }

            let payload: [String: String] = [
                "token": token,
                "environment": environment,
                "bundleId": bundleID,
            ]

            guard
                let data = try? JSONSerialization
                    .data(
                        withJSONObject: payload
                    ),
                let json = String(
                    data: data,
                    encoding: .utf8
                )
            else {
                return
            }

            webView.evaluateJavaScript(
                """
                window.dispatchEvent(
                  new CustomEvent(
                    'exchange-notes-native-push-token',
                    { detail: \(json) }
                  )
                );
                """
            )
        }

        private func isTrusted(
            _ url: URL?
        ) -> Bool {
            guard let url else {
                return false
            }

            return isTrusted(
                scheme: url.scheme,
                host: url.host,
                port: url.port
            )
        }

        private func isTrusted(
            _ origin: WKSecurityOrigin
        ) -> Bool {
            isTrusted(
                scheme: origin.protocol,
                host: origin.host,
                port:
                    origin.port > 0
                    ? origin.port
                    : nil
            )
        }

        private func isTrusted(
            scheme: String?,
            host: String?,
            port: Int?
        ) -> Bool {
            guard
                let scheme =
                    scheme?.lowercased(),
                let host = host?.lowercased(),
                let trustedScheme =
                    trustedURL.scheme?
                        .lowercased(),
                let trustedHost =
                    trustedURL.host?
                        .lowercased(),
                !host.isEmpty,
                !trustedHost.isEmpty,
                let candidatePort =
                    Self.effectivePort(
                        scheme: scheme,
                        port: port
                    ),
                let expectedPort =
                    Self.effectivePort(
                        scheme: trustedScheme,
                        port: trustedURL.port
                    )
            else {
                return false
            }

            return
                scheme == trustedScheme
                && host == trustedHost
                && candidatePort
                    == expectedPort
        }

        private static func effectivePort(
            scheme: String,
            port: Int?
        ) -> Int? {
            switch scheme {
            case "http":
                return port ?? 80
            case "https":
                return port ?? 443
            default:
                return nil
            }
        }

        private func widgetWords(
            from value: Any?
        ) -> [YumiWidgetWord] {
            guard
                let rawWords =
                    value as? [[String: Any]]
            else {
                return []
            }

            var result: [YumiWidgetWord] = []
            result.reserveCapacity(rawWords.count)

            for (index, rawWord) in
                rawWords.enumerated()
            {
                guard
                    let english =
                        rawWord["englishWord"]
                        as? String,
                    let chinese =
                        rawWord[
                            "traditionalChineseWord"
                        ]
                        as? String,
                    let pinyin =
                        rawWord["pinyin"]
                        as? String,
                    let zhuyin =
                        rawWord["zhuyin"]
                        as? String
                else {
                    continue
                }

                let identifier =
                    rawWord["id"] as? String
                    ?? "widget-word-\(index)"

                let primaryText =
                    rawWord["primaryText"]
                    as? String
                let secondaryText =
                    rawWord["secondaryText"]
                    as? String
                let primaryLanguage =
                    rawWord["primaryLanguage"]
                    as? String
                let secondaryLanguage =
                    rawWord["secondaryLanguage"]
                    as? String
                let primaryPronunciation =
                    rawWord[
                        "primaryPronunciation"
                    ] as? String
                let secondaryPronunciation =
                    rawWord[
                        "secondaryPronunciation"
                    ] as? String

                result.append(
                    YumiWidgetWord(
                        id: identifier,
                        primaryText: primaryText,
                        secondaryText:
                            secondaryText,
                        primaryLanguage:
                            primaryLanguage,
                        secondaryLanguage:
                            secondaryLanguage,
                        primaryPronunciation:
                            primaryPronunciation,
                        secondaryPronunciation:
                            secondaryPronunciation,
                        englishWord: english,
                        traditionalChineseWord:
                            chinese,
                        pinyin: pinyin,
                        zhuyin: zhuyin
                    )
                )
            }

            return result
        }

        private func intValue(
            _ value: Any?
        ) -> Int? {
            if let value = value as? Int {
                return value
            }

            if let value = value as? NSNumber {
                return value.intValue
            }

            if let value = value as? String {
                return Int(value)
            }

            return nil
        }

        private func stringValue(
            _ value: Any?
        ) -> String? {
            value as? String
        }
    }
}
