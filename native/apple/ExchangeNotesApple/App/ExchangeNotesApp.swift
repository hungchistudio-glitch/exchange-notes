import SwiftUI

@main
struct ExchangeNotesApp: App {
    @UIApplicationDelegateAdaptor(
        NativePushAppDelegate.self
    )
    private var appDelegate

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
                .onReceive(
                    NotificationCenter.default
                        .publisher(
                            for:
                                .exchangeNotesNativePushOpenPath
                        )
                ) { notification in
                    guard
                        let path =
                            notification.userInfo?["path"]
                            as? String
                    else {
                        return
                    }

                    webURL =
                        ExchangeNotesRoute
                            .webURL(
                                forNotificationPath:
                                    path
                            )
                }
        }
    }
}
