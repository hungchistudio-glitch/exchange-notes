import Foundation
import UIKit
import UserNotifications

extension Notification.Name {
    static let exchangeNotesNativePushToken =
        Notification.Name(
            "exchange-notes-native-push-token"
        )

    static let exchangeNotesNativePushOpenPath =
        Notification.Name(
            "exchange-notes-native-push-open-path"
        )

    static let exchangeNotesNativePushStatus =
        Notification.Name(
            "exchange-notes-native-push-status"
        )
}

@MainActor
final class NativePushController {
    static let shared = NativePushController()

    private init() {}

    static var environment: String {
#if DEBUG
        return "development"
#else
        return "production"
#endif
    }

    static var bundleID: String {
        Bundle.main.bundleIdentifier
            ?? "art.hungchi.exchangenotes"
    }

    func requestAuthorizationAndRegister() {
        UNUserNotificationCenter.current()
            .getNotificationSettings { settings in
                let status =
                    settings.authorizationStatus

                Task { @MainActor in
                    self.handleAuthorizationStatus(
                        status
                    )
                }
            }
    }

    private func handleAuthorizationStatus(
        _ status: UNAuthorizationStatus
    ) {
        switch status {
        case .notDetermined:
            requestAuthorization()

        case .authorized,
             .provisional,
             .ephemeral:
            UIApplication.shared
                .registerForRemoteNotifications()

        case .denied:
            publishStatus(
                "denied",
                detail:
                    "Notification permission is denied."
            )

        @unknown default:
            publishStatus(
                "unknown",
                detail:
                    "Notification permission status is unknown."
            )
        }
    }

    private func requestAuthorization() {
        UNUserNotificationCenter.current()
            .requestAuthorization(
                options: [
                    .alert,
                    .sound,
                    .badge,
                ]
            ) { granted, error in
                let errorMessage =
                    error?.localizedDescription

                Task { @MainActor in
                    if let errorMessage {
                        self.publishStatus(
                            "error",
                            detail: errorMessage
                        )
                        return
                    }

                    guard granted else {
                        self.publishStatus(
                            "denied",
                            detail:
                                "Notification permission was not granted."
                        )
                        return
                    }

                    UIApplication.shared
                        .registerForRemoteNotifications()
                }
            }
    }

    func publish(deviceToken: Data) {
        let token = deviceToken
            .map {
                String(
                    format: "%02x",
                    $0
                )
            }
            .joined()

        NotificationCenter.default.post(
            name: .exchangeNotesNativePushToken,
            object: nil,
            userInfo: [
                "token": token,
                "environment": Self.environment,
                "bundleId": Self.bundleID,
            ]
        )

        publishStatus(
            "registered",
            detail: nil
        )
    }

    func publishRegistrationError(
        _ error: Error
    ) {
        publishStatus(
            "error",
            detail: error.localizedDescription
        )
    }

    private func publishStatus(
        _ status: String,
        detail: String?
    ) {
        var userInfo: [String: String] = [
            "status": status,
        ]

        if let detail {
            userInfo["detail"] = detail
        }

        NotificationCenter.default.post(
            name: .exchangeNotesNativePushStatus,
            object: nil,
            userInfo: userInfo
        )
    }
}

@MainActor
final class NativePushAppDelegate:
    NSObject,
    UIApplicationDelegate,
    UNUserNotificationCenterDelegate
{
    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions
        launchOptions:
            [UIApplication.LaunchOptionsKey: Any]?
    ) -> Bool {
        UNUserNotificationCenter.current()
            .delegate = self

        return true
    }

    func application(
        _ application: UIApplication,
        didRegisterForRemoteNotificationsWithDeviceToken
        deviceToken: Data
    ) {
        NativePushController.shared
            .publish(
                deviceToken: deviceToken
            )
    }

    func application(
        _ application: UIApplication,
        didFailToRegisterForRemoteNotificationsWithError
        error: Error
    ) {
        NativePushController.shared
            .publishRegistrationError(error)
    }

    nonisolated func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification
    ) async
        -> UNNotificationPresentationOptions
    {
        [
            .banner,
            .sound,
            .badge,
        ]
    }

    nonisolated func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response:
            UNNotificationResponse
    ) async {
        let userInfo =
            response.notification.request
                .content.userInfo

        guard
            let path = userInfo["url"] as? String,
            path.hasPrefix("/"),
            !path.hasPrefix("//")
        else {
            return
        }

        await MainActor.run {
            NotificationCenter.default.post(
                name:
                    .exchangeNotesNativePushOpenPath,
                object: nil,
                userInfo: [
                    "path": path,
                ]
            )
        }
    }
}
