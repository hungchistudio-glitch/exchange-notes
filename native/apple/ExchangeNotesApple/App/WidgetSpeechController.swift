import AVFoundation
import Foundation
import SwiftUI

@MainActor
final class WidgetSpeechController: ObservableObject {
    private let synthesizer =
        AVSpeechSynthesizer()

    func handle(
        url: URL
    ) -> Bool {
        guard url.host == "speak" else {
            return false
        }

        let components = URLComponents(
            url: url,
            resolvingAgainstBaseURL: false
        )

        let queryItems = components?.queryItems ?? []

        let text = queryItems
            .first(where: { $0.name == "text" })?
            .value?
            .trimmingCharacters(
                in: .whitespacesAndNewlines
            )
            ?? ""

        let language = queryItems
            .first(where: { $0.name == "language" })?
            .value
            ?? "en-US"

        guard !text.isEmpty else {
            return true
        }

        if synthesizer.isSpeaking {
            synthesizer.stopSpeaking(
                at: .immediate
            )
        }

        let utterance = AVSpeechUtterance(
            string: text
        )
        utterance.voice = AVSpeechSynthesisVoice(
            language: language
        )
        utterance.rate = 0.46
        utterance.pitchMultiplier = 1.02

        synthesizer.speak(utterance)

        return true
    }
}
