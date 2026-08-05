import Foundation

struct YumiWidgetData {
    let cookieCount: Int
    let cookieGoal: Int
    let englishWord: String
    let traditionalChineseWord: String

    var progress: Double {
        guard cookieGoal > 0 else {
            return 0
        }

        return min(
            Double(cookieCount) / Double(cookieGoal),
            1
        )
    }

    static let preview = YumiWidgetData(
        cookieCount: 2,
        cookieGoal: 5,
        englishWord: "curious",
        traditionalChineseWord: "好奇的"
    )
}
