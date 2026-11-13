import Foundation
import Security

/// Yumi Pocket Lookup's share-extension key on this iPhone (Chi, 2026-11-12:
/// 專用小鑰匙; the server half is lib/pocket/keys.ts).
///
/// The app receives it once from the signed-in web app and keeps it in the
/// Keychain, in the App Group's access group, so the share extension can
/// read it and nothing outside Exchange Notes can. It never syncs to iCloud
/// and never leaves the device in a backup (ThisDeviceOnly). Signing out
/// clears it, and so does the server refusing it.
enum PocketKeyStore {
    struct Stored: Codable, Equatable {
        let key: String
        let id: String
    }

    static let accessGroup = YumiWidgetStore.suiteName
    private static let service = "art.hungchi.exchangenotes.pocket-key"
    private static let account = "share-extension"

    private static var query: [String: Any] {
        [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
            kSecAttrAccessGroup as String: accessGroup,
        ]
    }

    /// Only a key in the shape the server issues (`enpk_` and 43 characters).
    static func isWellFormed(_ key: String) -> Bool {
        key.range(of: "^enpk_[A-Za-z0-9_-]{43}$", options: .regularExpression) != nil
    }

    static func load() -> Stored? {
        var request = query
        request[kSecReturnData as String] = true
        request[kSecMatchLimit as String] = kSecMatchLimitOne
        var item: CFTypeRef?
        guard SecItemCopyMatching(request as CFDictionary, &item) == errSecSuccess,
              let data = item as? Data,
              let stored = try? JSONDecoder().decode(Stored.self, from: data),
              isWellFormed(stored.key),
              stored.id.range(of: "^[0-9a-fA-F-]{36}$", options: .regularExpression) != nil
        else { return nil }
        return stored
    }

    @discardableResult
    static func save(_ stored: Stored) -> Bool {
        guard isWellFormed(stored.key), let data = try? JSONEncoder().encode(stored) else { return false }
        SecItemDelete(query as CFDictionary)
        var item = query
        item[kSecValueData as String] = data
        item[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        return SecItemAdd(item as CFDictionary, nil) == errSecSuccess
    }

    static func clear() {
        SecItemDelete(query as CFDictionary)
    }
}
