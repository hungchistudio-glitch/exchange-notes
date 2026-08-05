import SwiftUI

@main
struct ExchangeNotesApp: App {
    @State private var webURL = ExchangeNotesRoute.home.webURL

    var body: some Scene {
        WindowGroup {
            ExchangeNotesWebView(url: webURL)
                .ignoresSafeArea(.container, edges: .bottom)
                .onOpenURL { url in
                    webURL = ExchangeNotesRoute(deepLinkURL: url).webURL
                }
        }
    }
}
