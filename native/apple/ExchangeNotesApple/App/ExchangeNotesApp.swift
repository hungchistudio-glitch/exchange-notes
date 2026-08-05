import SwiftUI

@main
struct ExchangeNotesApp: App {
    @StateObject
    private var speechController =
        WidgetSpeechController()

    @State
    private var webURL =
        ExchangeNotesRoute.home.webURL

    var body: some Scene {
        WindowGroup {
            ExchangeNotesWebView(url: webURL)
                .ignoresSafeArea(
                    .container,
                    edges: .bottom
                )
                .onOpenURL { url in
                    if speechController.handle(url: url) {
                        return
                    }

                    webURL =
                        ExchangeNotesRoute.webURL(
                            for: url
                        )
                }
        }
    }
}
