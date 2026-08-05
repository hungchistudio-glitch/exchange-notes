import AppIntents
import SwiftUI
import WidgetKit

struct YumiEntry: TimelineEntry {
    let date: Date
    let data: YumiWidgetData
    let poseIndex: Int
}

struct YumiProvider: TimelineProvider {
    func placeholder(in context: Context) -> YumiEntry {
        YumiEntry(
            date: Date(),
            data: .preview,
            poseIndex: 0
        )
    }

    func getSnapshot(
        in context: Context,
        completion: @escaping (YumiEntry) -> Void
    ) {
        completion(
            YumiEntry(
                date: Date(),
                data: context.isPreview
                    ? .preview
                    : YumiWidgetStore.load(),
                poseIndex: 1
            )
        )
    }

    func getTimeline(
        in context: Context,
        completion: @escaping (Timeline<YumiEntry>) -> Void
    ) {
        let start = Date()
        let data = YumiWidgetStore.load()
        let interval: TimeInterval = 15 * 60

        let calendar = Calendar.current
        let hourlyRefresh = start.addingTimeInterval(60 * 60)
        let nextMidnight = calendar.nextDate(
            after: start,
            matching: DateComponents(hour: 0, minute: 0),
            matchingPolicy: .nextTime
        ) ?? hourlyRefresh
        let refreshDate = min(hourlyRefresh, nextMidnight)

        var entries: [YumiEntry] = []

        for index in 0..<4 {
            let entryDate = start.addingTimeInterval(
                Double(index) * interval
            )

            if entryDate >= refreshDate && !entries.isEmpty {
                break
            }

            entries.append(
                YumiEntry(
                    date: entryDate,
                    data: data,
                    poseIndex: index
                )
            )
        }

        completion(
            Timeline(
                entries: entries,
                policy: .after(refreshDate)
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
        .configurationDisplayName(
            LocalizedStringKey("widget.gallery.name")
        )
        .description(
            LocalizedStringKey("widget.gallery.description")
        )
        .supportedFamilies([
            .systemSmall,
            .systemMedium,
            .systemLarge,
            .systemExtraLarge,
        ])
    }
}

struct YumiWidgetView: View {
    @Environment(\.widgetFamily)
    private var family

    let entry: YumiEntry

    private var mood: YumiMood {
        entry.data.mood
    }

    var body: some View {
        Group {
            switch family {
            case .systemSmall:
                SmallLayout(
                    data: entry.data,
                    mood: mood,
                    poseIndex: entry.poseIndex
                )

            case .systemMedium:
                MediumLayout(
                    data: entry.data,
                    mood: mood,
                    poseIndex: entry.poseIndex
                )

            case .systemLarge:
                LargeLayout(
                    data: entry.data,
                    mood: mood,
                    poseIndex: entry.poseIndex
                )

            case .systemExtraLarge:
                ExtraLargeLayout(
                    data: entry.data,
                    mood: mood,
                    poseIndex: entry.poseIndex
                )

            @unknown default:
                MediumLayout(
                    data: entry.data,
                    mood: mood,
                    poseIndex: entry.poseIndex
                )
            }
        }
        .containerBackground(for: .widget) {
            YumiPremiumBackground(
                mood: mood,
                poseIndex: entry.poseIndex
            )
        }
        .widgetURL(defaultDeepLink)
    }

    private var defaultDeepLink: URL {
        switch mood {
        case .curious, .happy, .dancing, .excited, .welcomeBack:
            return WidgetLinks.review

        default:
            return WidgetLinks.addWord
        }
    }
}

private struct YumiPremiumBackground: View {
    let mood: YumiMood
    let poseIndex: Int

    private var palette: YumiWidgetPalette {
        mood.widgetPalette(
            poseIndex: poseIndex
        )
    }

    private var weeklyTheme: YumiWeekdayTheme {
        .current
    }

    var body: some View {
        GeometryReader { proxy in
            let width = proxy.size.width
            let height = proxy.size.height
            let shortSide = min(width, height)

            ZStack {
                LinearGradient(
                    colors: [
                        weeklyTheme.backgroundStart,
                        weeklyTheme.backgroundMiddle,
                        palette.glow.opacity(0.24),
                        weeklyTheme.backgroundEnd,
                    ],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )

                RadialGradient(
                    colors: [
                        palette.particle.opacity(0.38),
                        palette.glow.opacity(0.10),
                        Color.clear,
                    ],
                    center: .topLeading,
                    startRadius: 1,
                    endRadius: max(230, shortSide * 1.28)
                )
                .blendMode(.plusLighter)

                RadialGradient(
                    colors: [
                        weeklyTheme.deepSpace.opacity(0.28),
                        weeklyTheme.secondary.opacity(0.12),
                        Color.clear,
                    ],
                    center: .bottomTrailing,
                    startRadius: 8,
                    endRadius: max(260, shortSide * 1.42)
                )

                YumiCosmicField(
                    accent: palette.particle,
                    ink: palette.eyeInk,
                    poseIndex: poseIndex
                )
                .opacity(0.72)

                YumiAlienPlanet(
                    accent: palette.glow,
                    ink: palette.eyeInk,
                    poseIndex: poseIndex,
                    isInverted: false
                )
                .frame(
                    width: max(170, shortSide * 0.96),
                    height: max(170, shortSide * 0.96)
                )
                .offset(
                    x: -width * 0.34,
                    y: -height * 0.33
                )

                YumiAlienPlanet(
                    accent: palette.particle,
                    ink: palette.eyeInk,
                    poseIndex: poseIndex + 2,
                    isInverted: true
                )
                .frame(
                    width: max(110, shortSide * 0.62),
                    height: max(110, shortSide * 0.62)
                )
                .offset(
                    x: width * 0.42,
                    y: height * 0.36
                )
                .opacity(0.62)

                YumiTechGrid(
                    lineColor:
                        palette.eyeInk.opacity(0.072)
                )

                YumiSignalArc(
                    color: palette.particle,
                    poseIndex: poseIndex
                )
                .frame(
                    width: max(210, width * 0.82),
                    height: max(210, height * 0.82)
                )
                .offset(
                    x: width * 0.18,
                    y: -height * 0.10
                )

                Capsule()
                    .fill(
                        LinearGradient(
                            colors: [
                                Color.clear,
                                Color.white.opacity(0.34),
                                palette.particle.opacity(0.16),
                                Color.clear,
                            ],
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                    )
                    .frame(
                        width: max(180, width * 0.54),
                        height: 1.2
                    )
                    .rotationEffect(.degrees(-17))
                    .offset(
                        x: width * 0.20,
                        y: -height * 0.30
                    )
                    .blendMode(.plusLighter)

                YumiBackgroundParticles(
                    color: palette.particle,
                    poseIndex: poseIndex
                )
            }
            .frame(
                width: width,
                height: height
            )
            .clipped()
        }
    }
}

// MARK: - Alien Planet Premium Visual System

private struct YumiCosmicField: View {
    let accent: Color
    let ink: Color
    let poseIndex: Int

    var body: some View {
        Canvas { context, size in
            let points: [CGPoint] = [
                CGPoint(
                    x: size.width * 0.08,
                    y: size.height * 0.16
                ),
                CGPoint(
                    x: size.width * 0.20,
                    y: size.height * 0.72
                ),
                CGPoint(
                    x: size.width * 0.34,
                    y: size.height * 0.28
                ),
                CGPoint(
                    x: size.width * 0.50,
                    y: size.height * 0.84
                ),
                CGPoint(
                    x: size.width * 0.63,
                    y: size.height * 0.18
                ),
                CGPoint(
                    x: size.width * 0.78,
                    y: size.height * 0.62
                ),
                CGPoint(
                    x: size.width * 0.91,
                    y: size.height * 0.30
                ),
            ]

            var constellation = Path()

            for index in 0..<(points.count - 1) {
                constellation.move(to: points[index])
                constellation.addLine(
                    to: points[index + 1]
                )
            }

            context.stroke(
                constellation,
                with: .color(ink.opacity(0.055)),
                style: StrokeStyle(
                    lineWidth: 0.7,
                    lineCap: .round,
                    dash: [2, 7]
                )
            )

            for (index, point) in points.enumerated() {
                let diameter: CGFloat =
                    index.isMultiple(of: 3)
                    ? 4.2
                    : 2.3

                let shiftedPoint = CGPoint(
                    x: point.x
                        + CGFloat((poseIndex + index) % 3 - 1)
                            * 2,
                    y: point.y
                        + CGFloat((poseIndex + index) % 2)
                            * 2
                )

                context.fill(
                    Path(
                        ellipseIn: CGRect(
                            x: shiftedPoint.x
                                - diameter / 2,
                            y: shiftedPoint.y
                                - diameter / 2,
                            width: diameter,
                            height: diameter
                        )
                    ),
                    with: .color(
                        index.isMultiple(of: 2)
                        ? accent.opacity(0.34)
                        : Color.white.opacity(0.58)
                    )
                )
            }
        }
        .allowsHitTesting(false)
    }
}

private struct YumiAlienPlanet: View {
    let accent: Color
    let ink: Color
    let poseIndex: Int
    let isInverted: Bool

    var body: some View {
        GeometryReader { proxy in
            let side = min(
                proxy.size.width,
                proxy.size.height
            )

            ZStack {
                Circle()
                    .fill(
                        RadialGradient(
                            colors: [
                                Color.white.opacity(0.30),
                                accent.opacity(0.20),
                                accent.opacity(0.05),
                                Color.clear,
                            ],
                            center:
                                isInverted
                                ? .bottomTrailing
                                : .topLeading,
                            startRadius: 2,
                            endRadius: side * 0.52
                        )
                    )
                    .blur(radius: side * 0.025)

                Circle()
                    .stroke(
                        AngularGradient(
                            colors: [
                                Color.clear,
                                accent.opacity(0.20),
                                Color.white.opacity(0.42),
                                accent.opacity(0.30),
                                Color.clear,
                            ],
                            center: .center
                        ),
                        lineWidth: max(0.8, side * 0.008)
                    )
                    .padding(side * 0.13)

                Ellipse()
                    .trim(from: 0.05, to: 0.82)
                    .stroke(
                        accent.opacity(0.38),
                        style: StrokeStyle(
                            lineWidth: max(0.8, side * 0.009),
                            lineCap: .round,
                            dash: [
                                max(3, side * 0.035),
                                max(5, side * 0.055),
                            ]
                        )
                    )
                    .frame(
                        width: side * 0.92,
                        height: side * 0.38
                    )
                    .rotationEffect(
                        .degrees(
                            Double(
                                (isInverted ? -1 : 1)
                                * (18 + poseIndex * 5)
                            )
                        )
                    )

                Circle()
                    .fill(accent.opacity(0.72))
                    .frame(
                        width: max(3, side * 0.038),
                        height: max(3, side * 0.038)
                    )
                    .shadow(
                        color: accent.opacity(0.52),
                        radius: max(2, side * 0.025)
                    )
                    .offset(
                        x: side * 0.34,
                        y: isInverted
                            ? side * 0.10
                            : -side * 0.12
                    )

                Circle()
                    .stroke(
                        ink.opacity(0.12),
                        lineWidth: max(0.6, side * 0.006)
                    )
                    .frame(
                        width: side * 0.46,
                        height: side * 0.46
                    )
            }
            .frame(
                maxWidth: .infinity,
                maxHeight: .infinity
            )
        }
        .allowsHitTesting(false)
    }
}

private struct YumiSignalArc: View {
    let color: Color
    let poseIndex: Int

    var body: some View {
        ZStack {
            Circle()
                .trim(from: 0.06, to: 0.33)
                .stroke(
                    color.opacity(0.22),
                    style: StrokeStyle(
                        lineWidth: 1.1,
                        lineCap: .round,
                        dash: [3, 9]
                    )
                )
                .rotationEffect(
                    .degrees(Double(poseIndex * 12))
                )

            Circle()
                .trim(from: 0.52, to: 0.76)
                .stroke(
                    Color.white.opacity(0.30),
                    style: StrokeStyle(
                        lineWidth: 0.9,
                        lineCap: .round
                    )
                )
                .rotationEffect(
                    .degrees(Double(-poseIndex * 9))
                )
                .padding(18)
        }
        .allowsHitTesting(false)
    }
}

private struct YumiTechGrid: View {
    let lineColor: Color

    var body: some View {
        Canvas { context, size in
            let step: CGFloat = 34
            var path = Path()

            var x: CGFloat = -step
            while x <= size.width + step {
                path.move(to: CGPoint(x: x, y: 0))
                path.addLine(
                    to: CGPoint(x: x, y: size.height)
                )
                x += step
            }

            var y: CGFloat = -step
            while y <= size.height + step {
                path.move(to: CGPoint(x: 0, y: y))
                path.addLine(
                    to: CGPoint(x: size.width, y: y)
                )
                y += step
            }

            context.stroke(
                path,
                with: .color(lineColor),
                style: StrokeStyle(lineWidth: 0.45)
            )
        }
        .mask(
            LinearGradient(
                colors: [
                    Color.black.opacity(0.54),
                    Color.clear,
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        )
    }
}

private struct YumiBackgroundParticles: View {
    let color: Color
    let poseIndex: Int

    var body: some View {
        ZStack {
            Circle()
                .fill(color.opacity(0.24))
                .frame(width: 7, height: 7)
                .offset(
                    x: poseIndex.isMultiple(of: 2) ? 118 : 96,
                    y: -112
                )

            Circle()
                .stroke(
                    color.opacity(0.30),
                    lineWidth: 1
                )
                .frame(width: 11, height: 11)
                .offset(
                    x: poseIndex < 2 ? -132 : -102,
                    y: 108
                )

            Image(systemName: "sparkle")
                .font(.system(size: 9, weight: .medium))
                .foregroundStyle(color.opacity(0.48))
                .offset(x: 126, y: 92)
        }
    }
}

// MARK: - Small Widget

private struct SmallLayout: View {
    let data: YumiWidgetData
    let mood: YumiMood
    let poseIndex: Int

    var body: some View {
        VStack(
            alignment: .leading,
            spacing: 6
        ) {
            HStack(alignment: .top) {
                YumiFace(
                    mood: mood,
                    poseIndex: poseIndex,
                    accessibilityText:
                        data.localizedText.headline
                )
                .frame(width: 94, height: 94)

                Spacer(minLength: 4)

                ProgressBadge(
                    data: data,
                    mood: mood,
                    diameter: 34
                )
            }

            Spacer(minLength: 0)

            QuickActions(style: .small)
        }
        .padding(1)
    }
}

// MARK: - Medium Widget

private struct MediumLayout: View {
    let data: YumiWidgetData
    let mood: YumiMood
    let poseIndex: Int

    var body: some View {
        HStack(spacing: 12) {
            VStack(spacing: 7) {
                YumiFace(
                    mood: mood,
                    poseIndex: poseIndex,
                    accessibilityText:
                        data.localizedText.headline
                )
                .frame(width: 104, height: 104)

                ProgressBadge(
                    data: data,
                    mood: mood,
                    diameter: 38
                )
            }
            .frame(width: 110)

            VStack(
                alignment: .leading,
                spacing: 4
            ) {
                CompanionHeader(
                    data: data,
                    headlineSize: 14,
                    hintSize: 10
                )

                Divider()
                    .padding(.vertical, 1)

                HStack(
                    alignment: .center,
                    spacing: 9
                ) {
                    VStack(
                        alignment: .leading,
                        spacing: 7
                    ) {
                        Group {
                            if data.hasWord {
                                WordContent(
                                    data: data,
                                    scale: .medium
                                )
                            } else {
                                EmptyWordText(
                                    text:
                                        data.localizedText.emptyWord,
                                    size: 13
                                )
                            }
                        }
                        .frame(
                            maxWidth: .infinity,
                            alignment: .leading
                        )

                        WordNavigationControls(
                            data: data,
                            size: .compact
                        )
                    }

                    AudioActions(
                        data: data,
                        size: .compact
                    )
                }
            }
        }
        .padding(1)
    }
}

// MARK: - Large Widget

private struct LargeLayout: View {
    let data: YumiWidgetData
    let mood: YumiMood
    let poseIndex: Int

    var body: some View {
        VStack(
            alignment: .leading,
            spacing: 12
        ) {
            HStack(spacing: 14) {
                YumiCharacterStage(
                    data: data,
                    mood: mood,
                    poseIndex: poseIndex,
                    size: 132
                )

                VStack(
                    alignment: .leading,
                    spacing: 10
                ) {
                    CompanionHeader(
                        data: data,
                        headlineSize: 19,
                        hintSize: 13
                    )

                    HStack(spacing: 10) {
                        ProgressBadge(
                            data: data,
                            mood: mood,
                            diameter: 48
                        )

                        Spacer(minLength: 0)

                        QuickActions(style: .compact)
                    }
                }
            }

            HStack(
                alignment: .center,
                spacing: 14
            ) {
                VStack(
                    alignment: .leading,
                    spacing: 12
                ) {
                    Group {
                        if data.hasWord {
                            WordContent(
                                data: data,
                                scale: .large
                            )
                        } else {
                            EmptyWordText(
                                text:
                                    data.localizedText.emptyWord,
                                size: 17
                            )
                        }
                    }
                    .frame(
                        maxWidth: .infinity,
                        alignment: .leading
                    )

                    WordNavigationControls(
                        data: data,
                        size: .large
                    )
                }

                AudioActions(
                    data: data,
                    size: .large
                )
            }
            .padding(18)
            .background(
                Color.black.opacity(0.80),
                in: RoundedRectangle(
                    cornerRadius: 24,
                    style: .continuous
                )
            )
            .environment(\.colorScheme, .dark)
        }
        .padding(3)
    }
}

// MARK: - Extra Large Widget

private struct ExtraLargeLayout: View {
    let data: YumiWidgetData
    let mood: YumiMood
    let poseIndex: Int

    var body: some View {
        HStack(
            alignment: .center,
            spacing: 28
        ) {
            VStack(spacing: 16) {
                YumiCharacterStage(
                    data: data,
                    mood: mood,
                    poseIndex: poseIndex,
                    size: 300
                )

                ProgressSummary(
                    data: data,
                    mood: mood
                )

                QuickActions(style: .compact)
            }
            .frame(maxWidth: 282)

            Divider()

            VStack(
                alignment: .leading,
                spacing: 18
            ) {
                CompanionHeader(
                    data: data,
                    headlineSize: 27,
                    hintSize: 16
                )

                HStack(
                    alignment: .center,
                    spacing: 18
                ) {
                    VStack(
                        alignment: .leading,
                        spacing: 16
                    ) {
                        Group {
                            if data.hasWord {
                                WordContent(
                                    data: data,
                                    scale: .extraLarge
                                )
                            } else {
                                EmptyWordText(
                                    text:
                                        data.localizedText.emptyWord,
                                    size: 22
                                )
                            }
                        }
                        .frame(
                            maxWidth: .infinity,
                            alignment: .leading
                        )

                        WordNavigationControls(
                            data: data,
                            size: .extraLarge
                        )
                    }

                    AudioActions(
                        data: data,
                        size: .extraLarge
                    )
                }
                .padding(24)
                .background(
                    Color.black.opacity(0.82),
                    in: RoundedRectangle(
                        cornerRadius: 30,
                        style: .continuous
                    )
                )
                .environment(\.colorScheme, .dark)

                Spacer(minLength: 0)
            }
            .frame(
                maxWidth: .infinity,
                alignment: .leading
            )
        }
        .padding(8)
    }
}

// MARK: - Word Hierarchy

private enum WordContentScale {
    case medium
    case large
    case extraLarge

    var primarySize: CGFloat {
        switch self {
        case .medium:
            return 20
        case .large:
            return 31
        case .extraLarge:
            return 42
        }
    }

    var secondarySize: CGFloat {
        switch self {
        case .medium:
            return 13
        case .large:
            return 18
        case .extraLarge:
            return 23
        }
    }

    var pronunciationSize: CGFloat {
        switch self {
        case .medium:
            return 10
        case .large:
            return 14
        case .extraLarge:
            return 17
        }
    }

    var spacing: CGFloat {
        switch self {
        case .medium:
            return 2
        case .large:
            return 5
        case .extraLarge:
            return 7
        }
    }
}

private struct WordContent: View {
    let data: YumiWidgetData
    let scale: WordContentScale

    private var word: YumiWidgetWord {
        data.displayedWord
    }

    var body: some View {
        VStack(
            alignment: .leading,
            spacing: scale.spacing
        ) {
            if data.isLearningTraditionalChinese {
                chinesePrimary
                pronunciationLines
                englishSecondary
            } else {
                englishPrimary
                chineseSecondary
                pronunciationLines
            }
        }
    }

    @ViewBuilder
    private var pronunciationLines: some View {
        if !word.pinyin.isEmpty {
            Text(word.pinyin)
                .font(.system(
                    size: scale.pronunciationSize,
                    weight: .medium,
                    design: .rounded
                ))
                .foregroundStyle(.secondary)
                .lineLimit(1)
                .minimumScaleFactor(0.64)
        }

        if !word.zhuyin.isEmpty {
            Text(word.zhuyin)
                .font(.system(
                    size: scale.pronunciationSize,
                    weight: .medium,
                    design: .rounded
                ))
                .foregroundStyle(.secondary)
                .lineLimit(1)
                .minimumScaleFactor(0.62)
        }
    }

    private var englishPrimary: some View {
        Text(word.englishWord)
            .font(.system(
                size: scale.primarySize,
                weight: .bold,
                design: .rounded
            ))
            .lineLimit(1)
            .minimumScaleFactor(0.54)
    }

    private var englishSecondary: some View {
        Text(word.englishWord)
            .font(.system(
                size: scale.secondarySize,
                weight: .semibold,
                design: .rounded
            ))
            .foregroundStyle(.secondary)
            .lineLimit(1)
            .minimumScaleFactor(0.60)
    }

    private var chinesePrimary: some View {
        Text(word.traditionalChineseWord)
            .font(.system(
                size: scale.primarySize,
                weight: .bold,
                design: .rounded
            ))
            .lineLimit(1)
            .minimumScaleFactor(0.58)
    }

    private var chineseSecondary: some View {
        Text(word.traditionalChineseWord)
            .font(.system(
                size: scale.secondarySize,
                weight: .semibold,
                design: .rounded
            ))
            .foregroundStyle(.secondary)
            .lineLimit(1)
            .minimumScaleFactor(0.62)
    }
}

// MARK: - Companion Content

private struct CompanionHeader: View {
    let data: YumiWidgetData
    let headlineSize: CGFloat
    let hintSize: CGFloat

    var body: some View {
        VStack(
            alignment: .leading,
            spacing: 3
        ) {
            Text(data.localizedText.headline)
                .font(.system(
                    size: headlineSize,
                    weight: .semibold,
                    design: .rounded
                ))
                .lineLimit(2)
                .minimumScaleFactor(0.66)

            if !data.localizedText.hint.isEmpty {
                Text(data.localizedText.hint)
                    .font(.system(
                        size: hintSize,
                        weight: .medium,
                        design: .rounded
                    ))
                    .foregroundStyle(.secondary)
                    .lineLimit(2)
                    .minimumScaleFactor(0.68)
            }
        }
    }
}

private struct EmptyWordText: View {
    let text: String
    let size: CGFloat

    var body: some View {
        Text(text)
            .font(.system(
                size: size,
                weight: .medium,
                design: .rounded
            ))
            .foregroundStyle(.secondary)
            .lineLimit(3)
    }
}

private struct YumiCharacterStage: View {
    let data: YumiWidgetData
    let mood: YumiMood
    let poseIndex: Int
    let size: CGFloat

    private var palette: YumiWidgetPalette {
        mood.widgetPalette(
            poseIndex: poseIndex
        )
    }

    var body: some View {
        ZStack {
            YumiPlanetPortal(
                palette: palette,
                poseIndex: poseIndex
            )
            .frame(
                width: size * 1.08,
                height: size * 1.08
            )

            YumiFace(
                mood: mood,
                poseIndex: poseIndex,
                accessibilityText:
                    data.localizedText.headline
            )
            .frame(width: size, height: size)
        }
    }
}

private struct YumiPlanetPortal: View {
    let palette: YumiWidgetPalette
    let poseIndex: Int

    var body: some View {
        GeometryReader { proxy in
            let side = min(
                proxy.size.width,
                proxy.size.height
            )

            ZStack {
                Circle()
                    .fill(
                        RadialGradient(
                            colors: [
                                Color.white.opacity(0.30),
                                palette.glow.opacity(0.22),
                                palette.eyeInk.opacity(0.08),
                                Color.clear,
                            ],
                            center: .center,
                            startRadius: 2,
                            endRadius: side * 0.50
                        )
                    )
                    .blur(radius: side * 0.025)

                Circle()
                    .stroke(
                        AngularGradient(
                            colors: [
                                Color.clear,
                                palette.particle.opacity(0.34),
                                Color.white.opacity(0.64),
                                palette.glow.opacity(0.42),
                                Color.clear,
                            ],
                            center: .center
                        ),
                        lineWidth: max(1, side * 0.012)
                    )
                    .padding(side * 0.06)
                    .rotationEffect(
                        .degrees(Double(poseIndex * 16))
                    )

                Ellipse()
                    .trim(from: 0.05, to: 0.86)
                    .stroke(
                        palette.particle.opacity(0.56),
                        style: StrokeStyle(
                            lineWidth: max(1, side * 0.012),
                            lineCap: .round,
                            dash: [
                                max(4, side * 0.045),
                                max(6, side * 0.070),
                            ]
                        )
                    )
                    .frame(
                        width: side * 0.98,
                        height: side * 0.40
                    )
                    .rotationEffect(
                        .degrees(
                            Double(-18 + poseIndex * 7)
                        )
                    )

                Ellipse()
                    .trim(from: 0.42, to: 0.92)
                    .stroke(
                        Color.white.opacity(0.34),
                        style: StrokeStyle(
                            lineWidth: max(0.7, side * 0.007),
                            lineCap: .round
                        )
                    )
                    .frame(
                        width: side * 0.74,
                        height: side * 0.28
                    )
                    .rotationEffect(
                        .degrees(
                            Double(24 - poseIndex * 5)
                        )
                    )

                Circle()
                    .fill(palette.particle)
                    .frame(
                        width: max(4, side * 0.050),
                        height: max(4, side * 0.050)
                    )
                    .shadow(
                        color: palette.glow.opacity(0.68),
                        radius: max(3, side * 0.035)
                    )
                    .offset(
                        x: side * 0.39,
                        y: poseIndex.isMultiple(of: 2)
                            ? -side * 0.08
                            : side * 0.10
                    )

                Circle()
                    .fill(Color.white.opacity(0.86))
                    .frame(
                        width: max(2, side * 0.022),
                        height: max(2, side * 0.022)
                    )
                    .offset(
                        x: -side * 0.34,
                        y: poseIndex < 2
                            ? side * 0.20
                            : -side * 0.18
                    )
            }
            .frame(
                maxWidth: .infinity,
                maxHeight: .infinity
            )
        }
        .allowsHitTesting(false)
    }
}

private struct ProgressBadge: View {
    let data: YumiWidgetData
    let mood: YumiMood
    let diameter: CGFloat

    var body: some View {
        YumiProgressRing(
            progress: data.progress,
            tint: mood.accentColor
        )
        .frame(
            width: diameter,
            height: diameter
        )
        .overlay {
            Text(
                "\(data.cookieCount)/\(data.cookieGoal)"
            )
            .font(.system(
                size: diameter * 0.22,
                weight: .bold,
                design: .rounded
            ))
        }
    }
}

private struct ProgressSummary: View {
    let data: YumiWidgetData
    let mood: YumiMood

    var body: some View {
        HStack(spacing: 12) {
            ProgressBadge(
                data: data,
                mood: mood,
                diameter: 48
            )

            VStack(
                alignment: .leading,
                spacing: 2
            ) {
                Text(
                    "\(data.cookieCount)/\(data.cookieGoal)"
                )
                .font(.system(
                    size: 18,
                    weight: .bold,
                    design: .rounded
                ))

                Text(
                    LocalizedStringKey(
                        "widget.progress.today"
                    )
                )
                .font(.system(
                    size: 11,
                    weight: .medium,
                    design: .rounded
                ))
                .foregroundStyle(.secondary)
            }
        }
    }
}

// MARK: - Quick and Audio Actions

private enum WidgetLinks {
    static let addWord = URL(
        string:
            "exchangenotes://vocabulary"
            + "?widgetAction=add-word"
    )!

    static let capture = URL(
        string:
            "exchangenotes://capture"
            + "?widgetAction=camera"
    )!

    static let review = URL(
        string: "exchangenotes://review"
    )!

    static func speech(
        text: String,
        language: String
    ) -> URL {
        var components = URLComponents()
        components.scheme = "exchangenotes"
        components.host = "speak"
        components.queryItems = [
            URLQueryItem(
                name: "language",
                value: language
            ),
            URLQueryItem(
                name: "text",
                value: text
            ),
        ]

        return components.url
            ?? URL(string: "exchangenotes://home")!
    }
}

private enum QuickActionStyle {
    case small
    case compact
}

private struct QuickActions: View {
    let style: QuickActionStyle

    var body: some View {
        HStack(spacing: 10) {
            QuickActionButton(
                title: LocalizedStringKey(
                    "widget.action.addWord"
                ),
                symbol: "plus",
                destination: WidgetLinks.addWord,
                isPrimary: true,
                style: style
            )

            QuickActionButton(
                title: LocalizedStringKey(
                    "widget.action.camera"
                ),
                symbol: "camera.viewfinder",
                destination: WidgetLinks.capture,
                isPrimary: false,
                style: style
            )
        }
    }
}

private struct QuickActionButton: View {
    let title: LocalizedStringKey
    let symbol: String
    let destination: URL
    let isPrimary: Bool
    let style: QuickActionStyle

    var body: some View {
        Link(destination: destination) {
            Group {
                switch style {
                case .small:
                    Image(systemName: symbol)
                        .font(.system(
                            size: 18,
                            weight: .bold
                        ))
                        .frame(
                            maxWidth: .infinity,
                            minHeight: 42
                        )

                case .compact:
                    Image(systemName: symbol)
                        .font(.system(
                            size: 15,
                            weight: .semibold
                        ))
                        .frame(
                            width: 44,
                            height: 44
                        )
                }
            }
            .foregroundStyle(
                isPrimary
                    ? Color.white
                    : Color.primary
            )
            .background(
                isPrimary
                    ? Color.black.opacity(0.84)
                    : Color.white.opacity(0.30),
                in: RoundedRectangle(
                    cornerRadius: 16,
                    style: .continuous
                )
            )
            .overlay {
                RoundedRectangle(
                    cornerRadius: 16,
                    style: .continuous
                )
                .stroke(
                    isPrimary
                        ? Color.clear
                        : Color.primary.opacity(0.34),
                    lineWidth: 1
                )
            }
        }
        .accessibilityLabel(Text(title))
    }
}

private enum AudioActionSize {
    case compact
    case large
    case extraLarge

    var diameter: CGFloat {
        switch self {
        case .compact:
            return 38
        case .large:
            return 54
        case .extraLarge:
            return 64
        }
    }

    var glyphSize: CGFloat {
        switch self {
        case .compact:
            return 17
        case .large:
            return 25
        case .extraLarge:
            return 31
        }
    }

    var orbitDiameter: CGFloat {
        diameter * 0.66
    }

    var cornerRadius: CGFloat {
        diameter * 0.29
    }

    var ringWidth: CGFloat {
        switch self {
        case .compact:
            return 0.9
        case .large:
            return 1.1
        case .extraLarge:
            return 1.2
        }
    }
}

private enum AudioLanguageStyle {
    case english
    case traditionalChinese

    var fill: LinearGradient {
        switch self {
        case .english:
            return LinearGradient(
                colors: [
                    Color(
                        red: 1.00,
                        green: 0.82,
                        blue: 0.28
                    ),
                    Color(
                        red: 1.00,
                        green: 0.45,
                        blue: 0.04
                    ),
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )

        case .traditionalChinese:
            return LinearGradient(
                colors: [
                    Color(
                        red: 0.10,
                        green: 0.12,
                        blue: 0.20
                    ),
                    Color(
                        red: 0.01,
                        green: 0.02,
                        blue: 0.05
                    ),
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        }
    }

    var foreground: Color {
        switch self {
        case .english:
            return Color(
                red: 0.18,
                green: 0.09,
                blue: 0.01
            )

        case .traditionalChinese:
            return Color(
                red: 1.00,
                green: 0.96,
                blue: 0.84
            )
        }
    }

    var ring: Color {
        switch self {
        case .english:
            return Color.white.opacity(0.58)

        case .traditionalChinese:
            return Color(
                red: 1.00,
                green: 0.60,
                blue: 0.14
            )
            .opacity(0.82)
        }
    }

    var orbit: Color {
        switch self {
        case .english:
            return Color(
                red: 0.32,
                green: 0.15,
                blue: 0.02
            )
            .opacity(0.34)

        case .traditionalChinese:
            return Color(
                red: 1.00,
                green: 0.66,
                blue: 0.20
            )
            .opacity(0.60)
        }
    }

    var glow: Color {
        switch self {
        case .english:
            return Color(
                red: 1.00,
                green: 0.55,
                blue: 0.05
            )

        case .traditionalChinese:
            return Color(
                red: 0.52,
                green: 0.44,
                blue: 1.00
            )
        }
    }
}

private struct AudioActions: View {
    let data: YumiWidgetData
    let size: AudioActionSize

    var body: some View {
        VStack(spacing: 10) {
            AudioActionButton(
                badge: "A",
                destination: WidgetLinks.speech(
                    text: data.displayedWord.englishWord,
                    language: "en-US"
                ),
                style: .english,
                accessibilityText:
                    englishAccessibilityText,
                size: size
            )
            .opacity(
                data.displayedWord.englishWord.isEmpty
                    ? 0.34
                    : 1
            )

            AudioActionButton(
                badge: "ㄅ",
                destination: WidgetLinks.speech(
                    text:
                        data.displayedWord
                            .traditionalChineseWord,
                    language: "zh-TW"
                ),
                style: .traditionalChinese,
                accessibilityText:
                    chineseAccessibilityText,
                size: size
            )
            .opacity(
                data.displayedWord
                    .traditionalChineseWord
                    .isEmpty
                    ? 0.34
                    : 1
            )
        }
    }

    private var englishAccessibilityText: String {
        data.interfaceLanguage
            == "traditional-chinese"
            ? "播放英文發音"
            : "Play English pronunciation"
    }

    private var chineseAccessibilityText: String {
        data.interfaceLanguage
            == "traditional-chinese"
            ? "播放繁體中文發音"
            : "Play Traditional Chinese pronunciation"
    }
}

private struct AudioActionButton: View {
    let badge: String
    let destination: URL
    let style: AudioLanguageStyle
    let accessibilityText: String
    let size: AudioActionSize

    var body: some View {
        Link(destination: destination) {
            ZStack {
                RoundedRectangle(
                    cornerRadius: size.cornerRadius,
                    style: .continuous
                )
                .fill(style.fill)

                Circle()
                    .stroke(
                        style.orbit,
                        style: StrokeStyle(
                            lineWidth: size.ringWidth,
                            lineCap: .round,
                            dash: [3, 5]
                        )
                    )
                    .frame(
                        width: size.orbitDiameter,
                        height: size.orbitDiameter
                    )
                    .rotationEffect(
                        .degrees(
                            badge == "A"
                            ? -18
                            : 18
                        )
                    )

                Circle()
                    .fill(style.ring)
                    .frame(
                        width: max(2.5, size.diameter * 0.070),
                        height: max(2.5, size.diameter * 0.070)
                    )
                    .offset(
                        x: size.diameter * 0.27,
                        y: -size.diameter * 0.12
                    )
                    .shadow(
                        color: style.glow.opacity(0.68),
                        radius: 3
                    )

                Text(badge)
                    .font(.system(
                        size: size.glyphSize,
                        weight: .black,
                        design: .rounded
                    ))
                    .foregroundStyle(style.foreground)
                    .tracking(-0.5)
            }
            .frame(
                width: size.diameter,
                height: size.diameter
            )
            .overlay {
                RoundedRectangle(
                    cornerRadius: size.cornerRadius,
                    style: .continuous
                )
                .stroke(
                    style.ring,
                    lineWidth: size.ringWidth
                )
            }
            .shadow(
                color: style.glow.opacity(0.24),
                radius: 7,
                x: 0,
                y: 3
            )
        }
        .accessibilityLabel(Text(accessibilityText))
    }
}

private extension YumiWidgetData {
    var displayedWord: YumiWidgetWord {
        YumiWidgetStore.selectedWord(in: self)
    }

    var hasWord: Bool {
        !displayedWord.englishWord.isEmpty
        || !displayedWord.traditionalChineseWord.isEmpty
    }

    var browsableWordCount: Int {
        availableWords.count
    }
}

// MARK: - Saved Word Navigation

private enum WordNavigationSize {
    case compact
    case large
    case extraLarge

    var diameter: CGFloat {
        switch self {
        case .compact:
            return 28
        case .large:
            return 34
        case .extraLarge:
            return 40
        }
    }

    var symbolSize: CGFloat {
        switch self {
        case .compact:
            return 10
        case .large:
            return 12
        case .extraLarge:
            return 14
        }
    }
}

private struct WordNavigationControls: View {
    let data: YumiWidgetData
    let size: WordNavigationSize

    var body: some View {
        if data.browsableWordCount > 1 {
            HStack(spacing: 8) {
                WordNavigationButton(
                    symbol: "chevron.left",
                    offset: -1,
                    accessibilityText:
                        previousAccessibilityText,
                    size: size
                )

                WordNavigationButton(
                    symbol: "chevron.right",
                    offset: 1,
                    accessibilityText:
                        nextAccessibilityText,
                    size: size
                )
            }
        }
    }

    private var previousAccessibilityText: String {
        data.interfaceLanguage == "traditional-chinese"
            ? "上一個單字"
            : "Previous word"
    }

    private var nextAccessibilityText: String {
        data.interfaceLanguage == "traditional-chinese"
            ? "下一個單字"
            : "Next word"
    }
}

private struct WordNavigationButton: View {
    let symbol: String
    let offset: Int
    let accessibilityText: String
    let size: WordNavigationSize

    var body: some View {
        Button(
            intent: NavigateYumiWordIntent(
                offset: offset
            )
        ) {
            Image(systemName: symbol)
                .font(.system(
                    size: size.symbolSize,
                    weight: .semibold
                ))
                .foregroundStyle(.primary)
                .frame(
                    width: size.diameter,
                    height: size.diameter
                )
                .background(
                    .thinMaterial,
                    in: Circle()
                )
                .overlay {
                    Circle()
                        .stroke(
                            Color.primary.opacity(0.24),
                            lineWidth: 0.8
                        )
                }
        }
        .buttonStyle(.plain)
        .accessibilityLabel(Text(accessibilityText))
    }
}

// MARK: - Shared Building Blocks

private struct YumiProgressRing: View {
    let progress: Double
    let tint: Color

    var body: some View {
        ZStack {
            Circle()
                .stroke(
                    tint.opacity(0.18),
                    lineWidth: 4
                )

            Circle()
                .trim(
                    from: 0,
                    to: progress
                )
                .stroke(
                    tint,
                    style: StrokeStyle(
                        lineWidth: 4,
                        lineCap: .round
                    )
                )
                .rotationEffect(
                    .degrees(-90)
                )
        }
    }
}

private struct YumiWidgetPalette {
    let body: Color
    let eyeSurface: Color
    let eyeInk: Color
    let glow: Color
    let particle: Color
}

// MARK: - Seven-Day Planet Color Cycle

private struct YumiWeekdayTheme {
    let name: String
    let backgroundStart: Color
    let backgroundMiddle: Color
    let backgroundEnd: Color
    let primary: Color
    let secondary: Color
    let accent: Color
    let highlight: Color
    let deepSpace: Color
    let eyeSurface: Color
    let eyeInk: Color

    static var current: YumiWeekdayTheme {
        theme(for: Date())
    }

    static func theme(
        for date: Date,
        calendar: Calendar = .current
    ) -> YumiWeekdayTheme {
        switch calendar.component(
            .weekday,
            from: date
        ) {
        case 2:
            // Monday — Lunar Ice
            return YumiWeekdayTheme(
                name: "Lunar Ice",
                backgroundStart: Color(red: 0.92, green: 0.98, blue: 1.00),
                backgroundMiddle: Color(red: 0.72, green: 0.88, blue: 0.98),
                backgroundEnd: Color(red: 0.96, green: 0.97, blue: 1.00),
                primary: Color(red: 0.30, green: 0.70, blue: 0.96),
                secondary: Color(red: 0.58, green: 0.86, blue: 1.00),
                accent: Color(red: 0.15, green: 0.47, blue: 0.96),
                highlight: Color(red: 0.88, green: 0.98, blue: 1.00),
                deepSpace: Color(red: 0.04, green: 0.12, blue: 0.30),
                eyeSurface: Color(red: 0.95, green: 0.99, blue: 1.00),
                eyeInk: Color(red: 0.04, green: 0.13, blue: 0.28)
            )

        case 3:
            // Tuesday — Mars Signal
            return YumiWeekdayTheme(
                name: "Mars Signal",
                backgroundStart: Color(red: 1.00, green: 0.91, blue: 0.84),
                backgroundMiddle: Color(red: 0.98, green: 0.70, blue: 0.62),
                backgroundEnd: Color(red: 1.00, green: 0.96, blue: 0.91),
                primary: Color(red: 1.00, green: 0.34, blue: 0.20),
                secondary: Color(red: 0.91, green: 0.16, blue: 0.20),
                accent: Color(red: 1.00, green: 0.55, blue: 0.18),
                highlight: Color(red: 1.00, green: 0.84, blue: 0.54),
                deepSpace: Color(red: 0.29, green: 0.03, blue: 0.08),
                eyeSurface: Color(red: 1.00, green: 0.95, blue: 0.90),
                eyeInk: Color(red: 0.30, green: 0.05, blue: 0.04)
            )

        case 4:
            // Wednesday — Alien Mint
            return YumiWeekdayTheme(
                name: "Alien Mint",
                backgroundStart: Color(red: 0.86, green: 1.00, blue: 0.95),
                backgroundMiddle: Color(red: 0.55, green: 0.93, blue: 0.84),
                backgroundEnd: Color(red: 0.93, green: 1.00, blue: 0.98),
                primary: Color(red: 0.11, green: 0.77, blue: 0.58),
                secondary: Color(red: 0.18, green: 0.82, blue: 0.78),
                accent: Color(red: 0.04, green: 0.59, blue: 0.50),
                highlight: Color(red: 0.70, green: 1.00, blue: 0.89),
                deepSpace: Color(red: 0.02, green: 0.24, blue: 0.24),
                eyeSurface: Color(red: 0.92, green: 1.00, blue: 0.97),
                eyeInk: Color(red: 0.02, green: 0.24, blue: 0.20)
            )

        case 5:
            // Thursday — Solar Gold
            return YumiWeekdayTheme(
                name: "Solar Gold",
                backgroundStart: Color(red: 1.00, green: 0.96, blue: 0.78),
                backgroundMiddle: Color(red: 1.00, green: 0.82, blue: 0.42),
                backgroundEnd: Color(red: 1.00, green: 0.98, blue: 0.90),
                primary: Color(red: 1.00, green: 0.59, blue: 0.04),
                secondary: Color(red: 1.00, green: 0.77, blue: 0.12),
                accent: Color(red: 1.00, green: 0.40, blue: 0.02),
                highlight: Color(red: 1.00, green: 0.93, blue: 0.54),
                deepSpace: Color(red: 0.27, green: 0.12, blue: 0.01),
                eyeSurface: Color(red: 1.00, green: 0.98, blue: 0.84),
                eyeInk: Color(red: 0.29, green: 0.15, blue: 0.02)
            )

        case 6:
            // Friday — Nebula Pink
            return YumiWeekdayTheme(
                name: "Nebula Pink",
                backgroundStart: Color(red: 1.00, green: 0.91, blue: 0.97),
                backgroundMiddle: Color(red: 0.96, green: 0.66, blue: 0.88),
                backgroundEnd: Color(red: 0.98, green: 0.94, blue: 1.00),
                primary: Color(red: 0.98, green: 0.28, blue: 0.63),
                secondary: Color(red: 0.80, green: 0.27, blue: 0.83),
                accent: Color(red: 1.00, green: 0.45, blue: 0.69),
                highlight: Color(red: 1.00, green: 0.82, blue: 0.94),
                deepSpace: Color(red: 0.24, green: 0.03, blue: 0.28),
                eyeSurface: Color(red: 1.00, green: 0.94, blue: 0.99),
                eyeInk: Color(red: 0.28, green: 0.04, blue: 0.20)
            )

        case 7:
            // Saturday — Cosmic Violet
            return YumiWeekdayTheme(
                name: "Cosmic Violet",
                backgroundStart: Color(red: 0.92, green: 0.90, blue: 1.00),
                backgroundMiddle: Color(red: 0.60, green: 0.57, blue: 0.96),
                backgroundEnd: Color(red: 0.90, green: 0.95, blue: 1.00),
                primary: Color(red: 0.48, green: 0.32, blue: 0.94),
                secondary: Color(red: 0.19, green: 0.56, blue: 0.96),
                accent: Color(red: 0.72, green: 0.35, blue: 1.00),
                highlight: Color(red: 0.77, green: 0.88, blue: 1.00),
                deepSpace: Color(red: 0.07, green: 0.04, blue: 0.28),
                eyeSurface: Color(red: 0.96, green: 0.95, blue: 1.00),
                eyeInk: Color(red: 0.11, green: 0.06, blue: 0.30)
            )

        default:
            // Sunday — Aurora Pearl
            return YumiWeekdayTheme(
                name: "Aurora Pearl",
                backgroundStart: Color(red: 0.99, green: 0.99, blue: 0.96),
                backgroundMiddle: Color(red: 0.72, green: 0.94, blue: 0.92),
                backgroundEnd: Color(red: 0.90, green: 0.91, blue: 1.00),
                primary: Color(red: 0.98, green: 0.72, blue: 0.36),
                secondary: Color(red: 0.38, green: 0.82, blue: 0.84),
                accent: Color(red: 0.64, green: 0.47, blue: 0.93),
                highlight: Color(red: 1.00, green: 0.95, blue: 0.75),
                deepSpace: Color(red: 0.08, green: 0.13, blue: 0.27),
                eyeSurface: Color(red: 1.00, green: 1.00, blue: 0.96),
                eyeInk: Color(red: 0.10, green: 0.13, blue: 0.24)
            )
        }
    }

    func palette(
        for mood: YumiMood,
        poseIndex: Int
    ) -> YumiWidgetPalette {
        let variation = poseIndex % 4
        let alternatingBody = variation.isMultiple(of: 2)
            ? primary
            : secondary

        switch mood {
        case .waiting:
            return makePalette(
                body: alternatingBody,
                glow: secondary,
                particle: accent
            )

        case .curious:
            return makePalette(
                body: variation < 2 ? secondary : primary,
                glow: accent,
                particle: highlight
            )

        case .happy:
            return makePalette(
                body: alternatingBody,
                glow: highlight,
                particle: accent
            )

        case .dancing:
            return makePalette(
                body: variation < 2 ? primary : accent,
                glow: secondary,
                particle: highlight
            )

        case .excited, .welcomeBack:
            return makePalette(
                body: variation.isMultiple(of: 2)
                    ? accent
                    : primary,
                glow: highlight,
                particle: secondary
            )

        case .hungry:
            return makePalette(
                body: secondary,
                glow: primary,
                particle: highlight
            )

        case .sad, .lonely:
            return makePalette(
                body: secondary.opacity(0.82),
                glow: secondary.opacity(0.72),
                particle: highlight.opacity(0.76)
            )

        case .grumpy:
            return makePalette(
                body: deepSpace,
                glow: accent,
                particle: primary
            )

        case .sleeping:
            return makePalette(
                body: deepSpace.opacity(0.92),
                glow: secondary.opacity(0.74),
                particle: highlight.opacity(0.68)
            )
        }
    }

    private func makePalette(
        body: Color,
        glow: Color,
        particle: Color
    ) -> YumiWidgetPalette {
        YumiWidgetPalette(
            body: body,
            eyeSurface: eyeSurface,
            eyeInk: eyeInk,
            glow: glow,
            particle: particle
        )
    }
}

private extension YumiMood {
    func widgetPalette(
        poseIndex: Int
    ) -> YumiWidgetPalette {
        YumiWeekdayTheme.current.palette(
            for: self,
            poseIndex: poseIndex
        )
    }
}

private struct YumiFace: View {
    let mood: YumiMood
    let poseIndex: Int
    let accessibilityText: String

    private var palette: YumiWidgetPalette {
        mood.widgetPalette(
            poseIndex: poseIndex
        )
    }

    var body: some View {
        ZStack {
            YumiTechHalo(
                palette: palette,
                poseIndex: poseIndex
            )

            YumiEnergyTrail(
                color: palette.glow,
                poseIndex: poseIndex
            )

            YumiEnergyParticles(
                mood: mood,
                poseIndex: poseIndex,
                color: palette.particle
            )

            Ellipse()
                .fill(
                    palette.glow.opacity(0.18)
                )
                .frame(width: 70, height: 18)
                .blur(radius: 5)
                .offset(
                    x: -2 + CGFloat(poseIndex % 3),
                    y: 30
                )

            ExactYumiMark(
                mood: mood,
                poseIndex: poseIndex,
                palette: palette
            )
            .rotationEffect(
                .degrees(markRotation)
            )
            .scaleEffect(markScale)
            .offset(markOffset)

            moodDecoration
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(Text(accessibilityText))
    }

    private var posePhase: Int {
        poseIndex % 4
    }

    private var markRotation: Double {
        let poseRotation = [-4.0, 2.0, 5.0, -1.0][posePhase]

        switch mood {
        case .curious:
            return poseRotation - 4
        case .dancing:
            return poseRotation * 1.8
        case .excited, .welcomeBack:
            return poseRotation + 3
        case .sad, .lonely:
            return poseRotation - 3
        case .grumpy:
            return poseRotation + 5
        case .sleeping:
            return poseRotation - 7
        default:
            return poseRotation
        }
    }

    private var markScale: CGFloat {
        let poseScale: [CGFloat] = [0.98, 1.04, 1.00, 1.06]
        let base = poseScale[posePhase]

        switch mood {
        case .happy, .dancing, .excited, .welcomeBack:
            return base * 1.05
        case .sad, .lonely, .sleeping:
            return base * 0.94
        default:
            return base
        }
    }

    private var markOffset: CGSize {
        let offsets = [
            CGSize(width: -3, height: 1),
            CGSize(width: 2, height: -5),
            CGSize(width: 4, height: 0),
            CGSize(width: -1, height: -3),
        ]
        var offset = offsets[posePhase]

        switch mood {
        case .happy, .dancing, .excited, .welcomeBack:
            offset.height -= 4
        case .sad, .lonely, .sleeping:
            offset.height += 5
        case .hungry:
            offset.width += 3
        default:
            break
        }

        return offset
    }

    @ViewBuilder
    private var moodDecoration: some View {
        switch mood {
        case .sleeping:
            Text(posePhase.isMultiple(of: 2) ? "z" : "Z")
                .font(.system(
                    size: 13,
                    weight: .bold,
                    design: .rounded
                ))
                .foregroundStyle(palette.particle)
                .offset(x: 28, y: -27)

        case .happy, .dancing, .excited, .welcomeBack:
            Image(
                systemName:
                    posePhase.isMultiple(of: 2)
                    ? "sparkles"
                    : "star.fill"
            )
            .font(.system(size: 13))
            .foregroundStyle(palette.particle)
            .offset(
                x: posePhase < 2 ? -29 : 29,
                y: -27
            )

        case .hungry:
            Image(systemName: "fork.knife")
                .font(.system(
                    size: 10,
                    weight: .bold
                ))
                .foregroundStyle(palette.particle)
                .offset(x: 28, y: 25)

        case .curious:
            Image(systemName: "questionmark")
                .font(.system(
                    size: 12,
                    weight: .bold
                ))
                .foregroundStyle(palette.particle)
                .offset(x: 29, y: -25)

        case .sad, .lonely:
            Image(systemName: "drop.fill")
                .font(.system(size: 10))
                .foregroundStyle(palette.particle)
                .offset(x: 24, y: 10)

        case .grumpy:
            Image(systemName: "bolt.fill")
                .font(.system(size: 11))
                .foregroundStyle(palette.particle)
                .offset(x: -28, y: -25)

        default:
            EmptyView()
        }
    }
}

private struct YumiTechHalo: View {
    let palette: YumiWidgetPalette
    let poseIndex: Int

    var body: some View {
        GeometryReader { proxy in
            let side = min(
                proxy.size.width,
                proxy.size.height
            )

            ZStack {
                Circle()
                    .fill(
                        RadialGradient(
                            colors: [
                                Color.white.opacity(0.24),
                                palette.glow.opacity(0.30),
                                palette.glow.opacity(0.08),
                                Color.clear,
                            ],
                            center: .center,
                            startRadius: 1,
                            endRadius: side * 0.50
                        )
                    )
                    .frame(
                        width: side * 0.98,
                        height: side * 0.98
                    )
                    .blur(radius: side * 0.032)

                Circle()
                    .stroke(
                        AngularGradient(
                            colors: [
                                Color.clear,
                                palette.particle.opacity(0.82),
                                Color.white.opacity(0.88),
                                palette.glow.opacity(0.54),
                                Color.clear,
                            ],
                            center: .center
                        ),
                        lineWidth: max(1, side * 0.014)
                    )
                    .frame(
                        width: side * 0.90,
                        height: side * 0.90
                    )
                    .rotationEffect(
                        .degrees(Double(poseIndex * 24))
                    )

                Circle()
                    .trim(from: 0.08, to: 0.69)
                    .stroke(
                        palette.eyeInk.opacity(0.20),
                        style: StrokeStyle(
                            lineWidth: max(0.8, side * 0.008),
                            lineCap: .round,
                            dash: [
                                max(3, side * 0.045),
                                max(4, side * 0.065),
                            ]
                        )
                    )
                    .rotationEffect(
                        .degrees(Double(-poseIndex * 19))
                    )
                    .frame(
                        width: side * 0.74,
                        height: side * 0.74
                    )

                Ellipse()
                    .trim(from: 0.04, to: 0.88)
                    .stroke(
                        palette.particle.opacity(0.66),
                        style: StrokeStyle(
                            lineWidth: max(0.8, side * 0.009),
                            lineCap: .round,
                            dash: [
                                max(3, side * 0.038),
                                max(6, side * 0.075),
                            ]
                        )
                    )
                    .frame(
                        width: side * 0.98,
                        height: side * 0.38
                    )
                    .rotationEffect(
                        .degrees(
                            Double(-16 + poseIndex * 6)
                        )
                    )

                Ellipse()
                    .trim(from: 0.46, to: 0.94)
                    .stroke(
                        Color.white.opacity(0.42),
                        style: StrokeStyle(
                            lineWidth: max(0.7, side * 0.007),
                            lineCap: .round
                        )
                    )
                    .frame(
                        width: side * 0.78,
                        height: side * 0.28
                    )
                    .rotationEffect(
                        .degrees(
                            Double(22 - poseIndex * 4)
                        )
                    )

                Circle()
                    .fill(palette.particle)
                    .frame(
                        width: max(4, side * 0.055),
                        height: max(4, side * 0.055)
                    )
                    .shadow(
                        color: palette.glow.opacity(0.78),
                        radius: max(2, side * 0.038)
                    )
                    .offset(
                        x: side * 0.39,
                        y: poseIndex.isMultiple(of: 2)
                            ? -side * 0.12
                            : side * 0.12
                    )

                Circle()
                    .fill(Color.white.opacity(0.92))
                    .frame(
                        width: max(2, side * 0.022),
                        height: max(2, side * 0.022)
                    )
                    .offset(
                        x: -side * 0.34,
                        y: poseIndex < 2
                            ? side * 0.20
                            : -side * 0.19
                    )
            }
            .frame(
                maxWidth: .infinity,
                maxHeight: .infinity
            )
        }
        .allowsHitTesting(false)
    }
}

private struct YumiEnergyTrail: View {
    let color: Color
    let poseIndex: Int

    var body: some View {
        Capsule()
            .fill(
                LinearGradient(
                    colors: [
                        Color.clear,
                        color.opacity(0.34),
                        Color.white.opacity(0.56),
                        Color.clear,
                    ],
                    startPoint: .leading,
                    endPoint: .trailing
                )
            )
            .frame(width: 58, height: 3)
            .blur(radius: 1.4)
            .rotationEffect(
                .degrees(poseIndex.isMultiple(of: 2) ? -18 : 16)
            )
            .offset(
                x: poseIndex.isMultiple(of: 2) ? -22 : 22,
                y: poseIndex < 2 ? -23 : 22
            )
            .blendMode(.plusLighter)
    }
}

private struct YumiEnergyParticles: View {
    let mood: YumiMood
    let poseIndex: Int
    let color: Color

    var body: some View {
        ZStack {
            Circle()
                .fill(color.opacity(0.78))
                .frame(width: 6, height: 6)
                .offset(
                    x: poseIndex.isMultiple(of: 2) ? -34 : 36,
                    y: poseIndex < 2 ? 20 : -22
                )

            Circle()
                .fill(Color.white.opacity(0.72))
                .frame(width: 3, height: 3)
                .offset(
                    x: poseIndex < 2 ? 32 : -30,
                    y: 27
                )

            Circle()
                .stroke(
                    color.opacity(0.52),
                    lineWidth: 1.2
                )
                .frame(width: 9, height: 9)
                .offset(
                    x: poseIndex.isMultiple(of: 2) ? 34 : -32,
                    y: -25
                )

            Image(systemName: "sparkle")
                .font(.system(size: 9))
                .foregroundStyle(color)
                .offset(x: -28, y: -30)

            if mood == .dancing
                || mood == .excited
                || mood == .welcomeBack
                || mood == .happy
            {
                Image(systemName: "sparkles")
                    .font(.system(size: 11))
                    .foregroundStyle(
                        LinearGradient(
                            colors: [color, .white],
                            startPoint: .top,
                            endPoint: .bottom
                        )
                    )
                    .offset(x: 29, y: -27)
            }
        }
    }
}

/// Native SwiftUI projection of components/ui/ExchangeNotesMark.tsx.
///
/// The canonical 400×400 SVG geometry is preserved exactly:
/// - top arm: M 300,70 Q 110,70 100,180
/// - bottom arm: M 100,180 Q 110,320 300,320
/// - middle arm: M 100,180 L 250,180
/// - eye center: 285,180
private struct ExactYumiMark: View {
    let mood: YumiMood
    let poseIndex: Int
    let palette: YumiWidgetPalette

    private var bodyShading: GraphicsContext.Shading {
        .linearGradient(
            Gradient(colors: [
                palette.body,
                palette.glow,
                palette.particle,
                palette.body,
            ]),
            startPoint: CGPoint(x: 58, y: 54),
            endPoint: CGPoint(x: 334, y: 340)
        )
    }

    private var highlightShading: GraphicsContext.Shading {
        .linearGradient(
            Gradient(colors: [
                Color.white.opacity(0.74),
                Color.white.opacity(0.12),
                Color.clear,
            ]),
            startPoint: CGPoint(x: 70, y: 62),
            endPoint: CGPoint(x: 312, y: 300)
        )
    }

    var body: some View {
        Canvas { context, size in
            let scale = min(
                size.width / 400,
                size.height / 400
            )

            let horizontalInset =
                (size.width - (400 * scale)) / 2

            let verticalInset =
                (size.height - (400 * scale)) / 2

            context.translateBy(
                x: horizontalInset,
                y: verticalInset
            )

            context.scaleBy(
                x: scale,
                y: scale
            )

            drawBody(in: &context)
            drawEye(in: &context)
        }
        .aspectRatio(1, contentMode: .fit)
    }

    private func drawBody(
        in context: inout GraphicsContext
    ) {
        let stroke = StrokeStyle(
            lineWidth: 52,
            lineCap: .round,
            lineJoin: .round
        )

        var topArm = Path()
        topArm.move(to: CGPoint(x: 300, y: 70))
        topArm.addQuadCurve(
            to: CGPoint(x: 100, y: 180),
            control: CGPoint(x: 110, y: 70)
        )
        context.stroke(
            topArm,
            with: bodyShading,
            style: stroke
        )
        context.stroke(
            topArm,
            with: highlightShading,
            style: StrokeStyle(
                lineWidth: 8,
                lineCap: .round,
                lineJoin: .round
            )
        )

        var bottomArm = Path()
        bottomArm.move(to: CGPoint(x: 100, y: 180))
        bottomArm.addQuadCurve(
            to: CGPoint(x: 300, y: 320),
            control: CGPoint(x: 110, y: 320)
        )
        context.stroke(
            bottomArm,
            with: bodyShading,
            style: stroke
        )
        context.stroke(
            bottomArm,
            with: highlightShading,
            style: StrokeStyle(
                lineWidth: 8,
                lineCap: .round,
                lineJoin: .round
            )
        )

        var middleArm = Path()
        middleArm.move(to: CGPoint(x: 100, y: 180))
        middleArm.addLine(to: CGPoint(x: 250, y: 180))
        context.stroke(
            middleArm,
            with: bodyShading,
            style: stroke
        )
        context.stroke(
            middleArm,
            with: highlightShading,
            style: StrokeStyle(
                lineWidth: 8,
                lineCap: .round,
                lineJoin: .round
            )
        )
    }

    private func drawEye(
        in context: inout GraphicsContext
    ) {
        let eyeRect = CGRect(
            x: 245,
            y: 140,
            width: 80,
            height: 80
        )

        context.fill(
            Path(ellipseIn: eyeRect),
            with: .color(palette.eyeSurface)
        )

        if mood == .sleeping {
            drawClosedEye(in: &context)
        } else {
            drawOpenEye(
                in: &context,
                eyeRect: eyeRect
            )
        }

        context.stroke(
            Path(ellipseIn: eyeRect),
            with: .color(palette.eyeInk),
            style: StrokeStyle(lineWidth: 12)
        )
    }

    private func drawOpenEye(
        in context: inout GraphicsContext,
        eyeRect: CGRect
    ) {
        let offset = pupilOffset

        context.drawLayer { layer in
            layer.clip(to: Path(ellipseIn: eyeRect))

            layer.fill(
                Path(
                    ellipseIn: CGRect(
                        x: 280 + offset.width,
                        y: 158 + offset.height,
                        width: 28,
                        height: 28
                    )
                ),
                with: .color(palette.eyeInk)
            )

            layer.fill(
                Path(
                    ellipseIn: CGRect(
                        x: 295 + offset.width,
                        y: 161 + offset.height,
                        width: 10,
                        height: 10
                    )
                ),
                with: .color(.white)
            )

            if mood == .sad || mood == .lonely {
                layer.fill(
                    Path(
                        CGRect(
                            x: 245,
                            y: 140,
                            width: 80,
                            height: 24
                        )
                    ),
                    with: .color(palette.eyeSurface)
                )
            }

            if mood == .grumpy {
                var lid = Path()
                lid.move(to: CGPoint(x: 245, y: 145))
                lid.addLine(to: CGPoint(x: 325, y: 166))
                lid.addLine(to: CGPoint(x: 325, y: 140))
                lid.addLine(to: CGPoint(x: 245, y: 140))
                lid.closeSubpath()

                layer.fill(
                    lid,
                    with: .color(palette.eyeSurface)
                )
            }
        }
    }

    private func drawClosedEye(
        in context: inout GraphicsContext
    ) {
        var closedEye = Path()
        closedEye.move(to: CGPoint(x: 263, y: 181))
        closedEye.addQuadCurve(
            to: CGPoint(x: 307, y: 181),
            control: CGPoint(x: 285, y: 194)
        )

        context.stroke(
            closedEye,
            with: .color(palette.eyeInk),
            style: StrokeStyle(
                lineWidth: 8,
                lineCap: .round
            )
        )
    }

    private var pupilOffset: CGSize {
        let poseOffsets = [
            CGSize(width: -3, height: 0),
            CGSize(width: 3, height: -2),
            CGSize(width: 6, height: 1),
            CGSize(width: -5, height: 2),
        ]
        var result = poseOffsets[poseIndex % 4]

        switch mood {
        case .waiting:
            result.width -= 1
        case .curious:
            result.width -= 5
        case .happy:
            result.height -= 2
        case .dancing:
            result.height -= 3
        case .excited:
            result.width += 4
            result.height -= 2
        case .hungry:
            result.height += 6
        case .sad:
            result.width -= 3
            result.height += 5
        case .grumpy:
            result.width += 4
        case .lonely:
            result.width -= 5
            result.height += 5
        case .sleeping:
            return .zero
        case .welcomeBack:
            result.width += 3
            result.height -= 2
        }

        return result
    }
}

@main
struct YumiWidgetBundle: WidgetBundle {
    var body: some Widget {
        YumiDailyWidget()
    }
}
