import SwiftUI
import WidgetKit

struct PocketEntry: TimelineEntry { let date: Date; let preferences: PocketPreferences }
struct PocketProvider: TimelineProvider {
    func placeholder(in context: Context) -> PocketEntry { PocketEntry(date: Date(), preferences: PocketPreferences()) }
    func getSnapshot(in context: Context, completion: @escaping (PocketEntry) -> Void) { completion(PocketEntry(date: Date(), preferences: .load())) }
    func getTimeline(in context: Context, completion: @escaping (Timeline<PocketEntry>) -> Void) {
        completion(Timeline(entries: [PocketEntry(date: Date(), preferences: .load())], policy: .never))
    }
}
struct PocketLookupWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "YumiPocketLookup", provider: PocketProvider()) { entry in
            PocketWidgetView(preferences: entry.preferences)
        }
        .configurationDisplayName(PocketCopy.text("title", PocketPreferences.load().interfaceLanguage))
        .description(PocketCopy.text("description", PocketPreferences.load().interfaceLanguage))
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}
struct PocketWidgetView: View {
    @Environment(\.widgetFamily) private var family
    @Environment(\.widgetRenderingMode) private var renderingMode
    let preferences: PocketPreferences
    var previewFamily: WidgetFamily? = nil
    private var accent: Color { preferences.cosmic ? Color(red: 0.72, green: 0.9, blue: 0.86) : Color(red: 0.30, green: 0.38, blue: 0.29) }
    private var ink: Color { preferences.cosmic ? .white : Color(red: 0.15, green: 0.17, blue: 0.15) }
    private var surface: Color { preferences.cosmic ? Color(red: 0.07, green: 0.11, blue: 0.13) : Color(red: 1, green: 0.99, blue: 0.96) }
    private func copy(_ key: String) -> String { PocketCopy.text(key, preferences.interfaceLanguage) }
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("YUMI").font(.caption.weight(.semibold)).tracking(2)
                Spacer()
                Circle().fill(accent).frame(width: 5, height: 5).widgetAccentable()
            }
            HStack(spacing: 8) {
                Link(destination: URL(string: "exchangenotes://lookup?input=text")!) {
                    HStack(spacing: 9) {
                        Image(systemName: "magnifyingglass")
                        Text(copy("search")).font(.subheadline).lineLimit(2).minimumScaleFactor(0.85)
                        Spacer(minLength: 0)
                    }.frame(minHeight: 44).padding(.horizontal, 12)
                }.accessibilityLabel(copy("search"))
                if (previewFamily ?? family) != .systemSmall {
                    Link(destination: URL(string: "exchangenotes://lookup?input=voice")!) {
                        Image(systemName: "mic").frame(width: 44, height: 44)
                            .background(accent.opacity(0.12), in: Circle())
                    }.accessibilityLabel(copy("voice"))
                }
            }
            .padding(4).background(accent.opacity(0.06), in: Capsule())
            .overlay(Capsule().stroke(accent.opacity(0.2), lineWidth: 1))
            Text("\(YumiWidgetLanguage.name(for: preferences.learningLanguageCode, displayedIn: preferences.interfaceLanguage)) → \(YumiWidgetLanguage.name(for: preferences.translationLanguageCode, displayedIn: preferences.interfaceLanguage))")
                .font(.caption2).foregroundStyle(renderingMode == .fullColor ? ink.opacity(0.7) : .primary).lineLimit(2)
        }
        .foregroundStyle(renderingMode == .fullColor ? ink : .primary)
        .containerBackground(surface, for: .widget)
        .widgetURL(URL(string: "exchangenotes://lookup?input=text"))
    }
}
