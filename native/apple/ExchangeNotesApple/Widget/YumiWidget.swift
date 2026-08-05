import SwiftUI
import WidgetKit

struct YumiEntry: TimelineEntry {
    let date: Date
    let data: YumiWidgetData
}

struct YumiProvider: TimelineProvider {
    func placeholder(in context: Context) -> YumiEntry {
        YumiEntry(date: Date(), data: .preview)
    }

    func getSnapshot(
        in context: Context,
        completion: @escaping (YumiEntry) -> Void
    ) {
        completion(YumiEntry(date: Date(), data: .preview))
    }

    func getTimeline(
        in context: Context,
        completion: @escaping (Timeline<YumiEntry>) -> Void
    ) {
        let entry = YumiEntry(date: Date(), data: .preview)
        completion(
            Timeline(
                entries: [entry],
                policy: .after(Date().addingTimeInterval(1800))
            )
        )
    }
}

struct YumiDailyWidget: Widget {
    private let kind = "YumiDailyWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(
            kind: kind,
            provider: YumiProvider()
        ) { entry in
            YumiWidgetView(entry: entry)
        }
        .configurationDisplayName("Yumi Daily")
        .description("查看今日單字與餅乾進度。")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

struct YumiWidgetView: View {
    @Environment(\.widgetFamily) private var family
    let entry: YumiEntry

    var body: some View {
        HStack(spacing: 14) {
            YumiFace()

            VStack(alignment: .leading, spacing: 7) {
                Text(family == .systemSmall ? "Yumi 等你" : "今日單字")
                    .font(.headline)

                Text(entry.data.englishWord)
                    .font(.title3.bold())

                Text(entry.data.traditionalChineseWord)
                    .font(.subheadline)

                ProgressView(value: entry.data.progress)

                Text(
                    "\(entry.data.cookieCount)/\(entry.data.cookieGoal) 餅乾"
                )
                .font(.caption)
                .foregroundStyle(.secondary)
            }
        }
        .containerBackground(for: .widget) {
            LinearGradient(
                colors: [
                    Color(red: 0.98, green: 0.95, blue: 0.84),
                    Color(red: 0.91, green: 0.87, blue: 0.73)
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        }
        .widgetURL(URL(string: "exchangenotes://vocabulary"))
    }
}

struct YumiFace: View {
    var body: some View {
        ZStack {
            Circle()
                .fill(
                    LinearGradient(
                        colors: [.black, .gray],
                        startPoint: .top,
                        endPoint: .bottom
                    )
                )

            HStack(spacing: 12) {
                Circle().fill(.white).frame(width: 8, height: 8)
                Circle().fill(.white).frame(width: 8, height: 8)
            }
            .offset(y: -6)

            Capsule()
                .fill(.white.opacity(0.9))
                .frame(width: 16, height: 4)
                .offset(y: 11)
        }
        .frame(width: 58, height: 58)
        .accessibilityLabel("Yumi")
    }
}

@main
struct YumiWidgetBundle: WidgetBundle {
    var body: some Widget {
        YumiDailyWidget()
    }
}
