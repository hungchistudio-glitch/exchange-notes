import AppIntents
import AVFoundation
import Foundation

struct SpeakYumiEnglishWordIntent: AudioPlaybackIntent {
    static let title: LocalizedStringResource =
        "Play Yumi English pronunciation"

    static let description = IntentDescription(
        "Plays a saved English word without opening Exchange Notes."
    )

    static let openAppWhenRun = false

    @Parameter(title: "Text")
    var text: String

    init() {
        text = ""
    }

    init(text: String) {
        self.text = text
    }

    @MainActor
    func perform() async throws -> some IntentResult {
        let language = "en-US"

        YumiSpeechDiagnostics.write(
            phase: "intent-received",
            language: language,
            textReady: !text.trimmingCharacters(
                in: .whitespacesAndNewlines
            ).isEmpty
        )

        await YumiSpeechPlayback.shared.speak(
            text: text,
            language: language
        )

        return .result()
    }
}

struct SpeakYumiTraditionalChineseWordIntent:
    AudioPlaybackIntent
{
    static let title: LocalizedStringResource =
        "Play Yumi Traditional Chinese pronunciation"

    static let description = IntentDescription(
        "Plays a saved Traditional Chinese word without opening Exchange Notes."
    )

    static let openAppWhenRun = false

    @Parameter(title: "Text")
    var text: String

    init() {
        text = ""
    }

    init(text: String) {
        self.text = text
    }

    @MainActor
    func perform() async throws -> some IntentResult {
        let language = "zh-TW"

        YumiSpeechDiagnostics.write(
            phase: "intent-received",
            language: language,
            textReady: !text.trimmingCharacters(
                in: .whitespacesAndNewlines
            ).isEmpty
        )

        await YumiSpeechPlayback.shared.speak(
            text: text,
            language: language
        )

        return .result()
    }
}

@MainActor
private final class YumiSpeechPlayback {
    static let shared = YumiSpeechPlayback()

    private let synthesizer: AVSpeechSynthesizer = {
        let synthesizer = AVSpeechSynthesizer()
        synthesizer.usesApplicationAudioSession = false
        return synthesizer
    }()

    func speak(
        text: String,
        language: String
    ) async {
        let normalizedText =
            text.trimmingCharacters(
                in: .whitespacesAndNewlines
            )

        guard !normalizedText.isEmpty else {
            YumiSpeechDiagnostics.write(
                phase: "empty-text",
                language: language,
                textReady: false
            )
            return
        }

        if synthesizer.isSpeaking {
            synthesizer.stopSpeaking(at: .immediate)
        }

        let voice = AVSpeechSynthesisVoice(
            language: language
        )

        YumiSpeechDiagnostics.write(
            phase: "system-audio-session-selected",
            language: language,
            textReady: true,
            voiceAvailable: voice != nil,
            usesSystemManagedAudioSession: true
        )

        let utterance = AVSpeechUtterance(
            string: normalizedText
        )
        utterance.voice = voice
        utterance.rate = 0.46
        utterance.pitchMultiplier = 1.02

        synthesizer.speak(utterance)

        YumiSpeechDiagnostics.write(
            phase: "speech-requested",
            language: language,
            textReady: true,
            voiceAvailable: voice != nil,
            usesSystemManagedAudioSession: true,
            synthesizerStarted: synthesizer.isSpeaking
        )

        while synthesizer.isSpeaking {
            if Task.isCancelled {
                synthesizer.stopSpeaking(at: .immediate)
                YumiSpeechDiagnostics.write(
                    phase: "speech-cancelled",
                    language: language,
                    textReady: true,
                    voiceAvailable: voice != nil,
                    usesSystemManagedAudioSession: true,
                    synthesizerStarted: true
                )
                break
            }

            try? await Task.sleep(
                for: .milliseconds(100)
            )
        }

        YumiSpeechDiagnostics.write(
            phase: "speech-finished",
            language: language,
            textReady: true,
            voiceAvailable: voice != nil,
            usesSystemManagedAudioSession: true,
            synthesizerStarted: true
        )
    }
}

private struct YumiSpeechDiagnostic: Codable {
    let timestamp: String
    let phase: String
    let language: String
    let textReady: Bool
    let voiceAvailable: Bool
    let usesSystemManagedAudioSession: Bool
    let audioSessionConfigured: Bool
    let audioSessionActivated: Bool
    let synthesizerStarted: Bool
    let executionBundleIdentifier: String
    let error: String?
}

private enum YumiSpeechDiagnostics {
    private static let appGroupIdentifier =
        "group.art.hungchi.exchangenotes"
    private static let fileName =
        "yumi-speech-diagnostics.json"

    static func errorCode(
        for error: Error
    ) -> String {
        let nsError = error as NSError
        return "\(nsError.domain):\(nsError.code)"
    }

    static func write(
        phase: String,
        language: String,
        textReady: Bool,
        voiceAvailable: Bool = false,
        usesSystemManagedAudioSession: Bool = false,
        audioSessionConfigured: Bool = false,
        audioSessionActivated: Bool = false,
        synthesizerStarted: Bool = false,
        error: String? = nil
    ) {
        guard let containerURL = FileManager.default
            .containerURL(
                forSecurityApplicationGroupIdentifier:
                    appGroupIdentifier
            ) else {
            return
        }

        let diagnostic = YumiSpeechDiagnostic(
            timestamp: ISO8601DateFormatter()
                .string(from: Date()),
            phase: phase,
            language: language,
            textReady: textReady,
            voiceAvailable: voiceAvailable,
            usesSystemManagedAudioSession:
                usesSystemManagedAudioSession,
            audioSessionConfigured:
                audioSessionConfigured,
            audioSessionActivated:
                audioSessionActivated,
            synthesizerStarted: synthesizerStarted,
            executionBundleIdentifier:
                Bundle.main.bundleIdentifier ?? "unknown",
            error: error
        )

        guard let data = try? JSONEncoder()
            .encode(diagnostic) else {
            return
        }

        try? data.write(
            to: containerURL.appendingPathComponent(
                fileName
            ),
            options: .atomic
        )
    }
}
