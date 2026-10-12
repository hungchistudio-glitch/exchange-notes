import AppIntents
import WidgetKit

struct NavigateYumiWordIntent: AppIntent {
    static let title = LocalizedStringResource(
        "intent.browseWords.title",
        defaultValue: "Browse saved words"
    )

    static let description = IntentDescription(
        LocalizedStringResource(
            "intent.browseWords.description",
            defaultValue: "Shows the previous or next saved vocabulary card."
        )
    )

    static let openAppWhenRun: Bool = false

    @Parameter(
        title: LocalizedStringResource(
            "intent.parameter.direction",
            defaultValue: "Direction"
        )
    )
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
