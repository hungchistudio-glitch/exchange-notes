import SwiftUI
import WebKit
import WidgetKit

struct ExchangeNotesWebView: UIViewRepresentable {
    let url: URL

    func makeCoordinator() -> Coordinator {
        Coordinator()
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

        configuration.userContentController
            .addUserScript(
                WKUserScript(
                    source:
                        Coordinator.nativeReadyScript,
                    injectionTime: .atDocumentEnd,
                    forMainFrameOnly: true
                )
            )

        let webView = WKWebView(
            frame: .zero,
            configuration: configuration
        )

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

        webView.navigationDelegate = nil
    }

    final class Coordinator:
        NSObject,
        WKScriptMessageHandler,
        WKNavigationDelegate
    {
        static let messageName =
            "yumiWidgetUpdate"

        static let nativeReadyScript = """
        window.__exchangeNotesNativeBridge = true;
        window.dispatchEvent(
          new Event('exchange-notes-native-ready')
        );
        window.__exchangeNotesFlushYumiWidget?.();
        """

        var lastURL: URL?

        func webView(
            _ webView: WKWebView,
            didFinish navigation: WKNavigation!
        ) {
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
                message.name
                    == Self.messageName,
                message.frameInfo.isMainFrame
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

            message.webView?
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

                result.append(
                    YumiWidgetWord(
                        id: identifier,
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
