import AppIntents
import WidgetKit

struct NavigateYumiWordIntent: AppIntent {
    static let title: LocalizedStringResource =
        "Browse saved words"

    static let description = IntentDescription(
        "Shows the previous or next saved vocabulary card."
    )

    static let openAppWhenRun: Bool = false

    @Parameter(title: "Direction")
    var offset: Int

    init() {
        offset = 1
    }

    init(offset: Int) {
        self.offset = offset
    }

    func perform() async throws -> some IntentResult {
        YumiWidgetStore.moveSelection(by: offset)

        WidgetCenter.shared.reloadTimelines(
            ofKind: "YumiDailyWidget"
        )

        return .result()
    }
}
