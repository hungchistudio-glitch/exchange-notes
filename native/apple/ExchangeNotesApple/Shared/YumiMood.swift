import SwiftUI

/// Exact projection of the Home mood identifiers computed by
/// lib/pet/homeMoodEngine.ts. The Widget never re-derives mood logic.
enum YumiMood: String, Codable {
    case waiting
    case curious
    case happy
    case dancing
    case excited
    case hungry
    case sad
    case grumpy
    case lonely
    case sleeping
    case welcomeBack

    static func from(rawValue: String?) -> YumiMood {
        let value = rawValue?
            .trimmingCharacters(in: .whitespacesAndNewlines)
            ?? ""

        if let exact = YumiMood(rawValue: value) {
            return exact
        }

        switch value.lowercased() {
        case "idle":
            return .waiting
        case "celebrating", "proud":
            return .excited
        case "missingyou", "missing-you":
            return .lonely
        case "sleepy":
            return .sleeping
        default:
            return .waiting
        }
    }

    var gradient: [Color] {
        switch self {
        case .happy, .dancing, .excited, .welcomeBack:
            return [
                Color(red: 1.00, green: 0.93, blue: 0.72),
                Color(red: 0.98, green: 0.80, blue: 0.55),
            ]

        case .curious:
            return [
                Color(red: 0.98, green: 0.95, blue: 0.86),
                Color(red: 0.90, green: 0.88, blue: 0.98),
            ]

        case .hungry, .waiting:
            return [
                Color(red: 0.98, green: 0.95, blue: 0.84),
                Color(red: 0.91, green: 0.87, blue: 0.73),
            ]

        case .sad, .lonely:
            return [
                Color(red: 0.90, green: 0.92, blue: 0.96),
                Color(red: 0.80, green: 0.83, blue: 0.90),
            ]

        case .grumpy:
            return [
                Color(red: 0.96, green: 0.88, blue: 0.84),
                Color(red: 0.90, green: 0.76, blue: 0.70),
            ]

        case .sleeping:
            return [
                Color(red: 0.86, green: 0.86, blue: 0.94),
                Color(red: 0.70, green: 0.70, blue: 0.84),
            ]
        }
    }

    var accentColor: Color {
        switch self {
        case .happy, .dancing, .excited, .welcomeBack:
            return .orange
        case .curious:
            return .purple
        case .sad, .grumpy, .lonely:
            return .gray
        case .sleeping:
            return .indigo
        case .hungry, .waiting:
            return .brown
        }
    }
}
