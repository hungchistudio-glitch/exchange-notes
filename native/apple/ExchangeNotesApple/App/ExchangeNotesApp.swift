import SwiftUI

@main
struct ExchangeNotesApp: App {
#if !EXCHANGE_NOTES_PERSONAL_TEAM
    @UIApplicationDelegateAdaptor(
        NativePushAppDelegate.self
    )
    private var appDelegate
#endif

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
#if DEBUG
                    let queryItemNames =
                        URLComponents(
                            url: url,
                            resolvingAgainstBaseURL: false
                        )?
                        .queryItems?
                        .map(\.name)
                        .joined(separator: ",")
                        ?? "none"

                    print(
                        "ExchangeNotes deep link "
                        + "host=\(url.host ?? "none") "
                        + "queryItems=\(queryItemNames)"
                    )
#endif

                    if speechController.handle(url: url) {
#if DEBUG
                        print(
                            "ExchangeNotes route "
                            + "handled=speech"
                        )
#endif
                        return
                    }

                    let destination =
                        ExchangeNotesRoute.webURL(
                            for: url
                        )

#if DEBUG
                    print(
                        "ExchangeNotes route "
                        + "path=\(destination.path)"
                    )
#endif

                    webURL = destination
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
