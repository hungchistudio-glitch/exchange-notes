import SwiftUI
import WebKit

struct ExchangeNotesWebView: UIViewRepresentable {
    let url: URL

    func makeCoordinator() -> Coordinator {
        Coordinator()
    }

    func makeUIView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        configuration.websiteDataStore = .default()
        configuration.allowsInlineMediaPlayback = true

        let webView = WKWebView(
            frame: .zero,
            configuration: configuration
        )
        webView.allowsBackForwardNavigationGestures = true
        return webView
    }

    func updateUIView(
        _ webView: WKWebView,
        context: Context
    ) {
        guard context.coordinator.lastURL != url else {
            return
        }

        context.coordinator.lastURL = url
        webView.load(URLRequest(url: url))
    }

    final class Coordinator {
        var lastURL: URL?
    }
}
