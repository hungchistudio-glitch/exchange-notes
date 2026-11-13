import SwiftUI
import UIKit
import UniformTypeIdentifiers

/// Yumi Pocket Lookup's share extension: text selected in another app, then
/// Share, then Exchange Notes (Chi, 2026-11-12). It looks the text up at
/// once (PocketShareModel) and closes back into the app it came from.
///
/// Plain text only, 200 characters at most. A shared link is not opened or
/// read: a video's address says nothing about the word that was heard.
@MainActor final class ShareViewController: UIViewController {
    private let model = PocketShareModel()

    override func viewDidLoad() {
        super.viewDidLoad()
        let host = UIHostingController(rootView: PocketShareView(model: model, done: { [weak self] in
            self?.model.stopSpeech()
            self?.extensionContext?.completeRequest(returningItems: nil)
        }))
        addChild(host)
        view.addSubview(host.view)
        host.view.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            host.view.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            host.view.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            host.view.topAnchor.constraint(equalTo: view.topAnchor),
            host.view.bottomAnchor.constraint(equalTo: view.bottomAnchor),
        ])
        host.didMove(toParent: self)

        let providers = (extensionContext?.inputItems as? [NSExtensionItem] ?? []).flatMap { $0.attachments ?? [] }
        guard let provider = providers.first(where: {
            $0.hasItemConformingToTypeIdentifier(UTType.plainText.identifier)
                && !$0.hasItemConformingToTypeIdentifier(UTType.url.identifier)
        }) else { return }

        provider.loadItem(forTypeIdentifier: UTType.plainText.identifier, options: nil) { [weak self] item, _ in
            let text = (item as? String) ?? (item as? Data).flatMap { String(data: $0, encoding: .utf8) }
            Task { @MainActor [weak self] in
                guard let self, let text else { return }
                let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
                guard !trimmed.isEmpty, trimmed.count <= 200 else { return }
                self.model.query = trimmed
                self.model.lookup()
            }
        }
    }

    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        model.stopSpeech()
    }
}

/// The share sheet's one screen: warm white by day, obsidian and ice in
/// Yumi Cosmic, as the app was last seen (PocketPreferences).
struct PocketShareView: View {
    @ObservedObject var model: PocketShareModel
    let done: () -> Void

    private var cosmic: Bool { model.preferences.cosmic }
    // The app's own tokens: Standard's warm white, Cosmic's obsidian bridge.
    private var accent: Color { cosmic ? Color(red: 0.72, green: 0.91, blue: 0.90) : Color(red: 0.30, green: 0.38, blue: 0.29) }
    private var surface: Color { cosmic ? Color(red: 0.06, green: 0.09, blue: 0.13) : Color(red: 1, green: 0.99, blue: 0.96) }
    private var background: Color { cosmic ? Color(red: 0.03, green: 0.04, blue: 0.06) : Color(red: 0.96, green: 0.94, blue: 0.91) }

    private func copy(_ key: String) -> String {
        PocketCopy.text(key, model.preferences.interfaceLanguage)
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    Text(copy(model.needsConnection || model.fromDictionary ? "offline" : "aiSource"))
                        .font(.caption)
                        .foregroundStyle(.secondary)

                    TextField(copy("search"), text: Binding(
                        get: { model.query },
                        set: { model.query = $0; model.invalidate() }
                    ))
                    .textFieldStyle(.roundedBorder)
                    .submitLabel(.search)
                    .onSubmit(model.lookup)

                    HStack {
                        languagePicker("source", selection: $model.preferences.learningLanguageCode)
                        Image(systemName: "arrow.right")
                        languagePicker("target", selection: $model.preferences.translationLanguageCode)
                    }

                    Button(action: model.lookup) {
                        Label(copy("lookup"), systemImage: "magnifyingglass")
                            .frame(maxWidth: .infinity, minHeight: 44)
                            // Dark ink on Cosmic's ice: white on it was all but unreadable.
                            .foregroundStyle(cosmic ? Color(red: 0.04, green: 0.10, blue: 0.11) : .white)
                    }
                    .buttonStyle(.borderedProminent)
                    .disabled(!model.queryIsUsable || model.phase == .looking)

                    result

                    if model.needsConnection {
                        Text(copy("connect")).font(.footnote).foregroundStyle(.secondary)
                    }
                }
                .padding(24)
            }
            .scrollContentBackground(.hidden)
            .background(background)
            .navigationTitle(copy("title"))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button(copy("done"), action: done).frame(minHeight: 44)
                }
            }
            .tint(accent)
        }
        .preferredColorScheme(cosmic ? .dark : .light)
        .onChange(of: model.preferences) { _, _ in model.invalidate() }
        .onDisappear { model.stopSpeech() }
    }

    @ViewBuilder private var result: some View {
        switch model.phase {
        case .looking:
            HStack(spacing: 10) {
                ProgressView()
                Text(copy("looking")).foregroundStyle(.secondary)
            }
        case .found:
            if let entry = model.entry {
                VStack(alignment: .leading, spacing: 20) {
                    wordLine(entry.term, language: entry.termLanguage ?? model.preferences.learningLanguageCode, serif: true)
                    if let ipa = entry.termIpa, !ipa.isEmpty {
                        Text(ipa).font(.footnote).foregroundStyle(.secondary)
                    }
                    Divider()
                    wordLine(entry.translation, language: entry.translationLanguage ?? model.preferences.translationLanguageCode, serif: false)
                    if let example = entry.termExample, !example.isEmpty {
                        VStack(alignment: .leading, spacing: 6) {
                            Text(example)
                            if let gloss = entry.translationExample, !gloss.isEmpty {
                                Text(gloss).font(.footnote).foregroundStyle(.secondary)
                            }
                        }
                        .padding(.leading, 12)
                        .overlay(alignment: .leading) { Rectangle().fill(accent).frame(width: 2) }
                    }
                }
                .padding(24)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(surface, in: RoundedRectangle(cornerRadius: 24))

                if model.canSave {
                    saveButton
                } else if model.fromDictionary && !model.needsConnection {
                    Text(copy("offlineFallback")).font(.footnote).foregroundStyle(.secondary)
                }
            }
        case .missing:
            Text(copy("missing")).font(.callout).foregroundStyle(.secondary)
        case .idle:
            Text(copy("invalid")).font(.callout).foregroundStyle(.secondary)
        }
    }

    /// 收藏: the reader's choice, never automatic. Saved and already-there
    /// both end it; a failure can be tried again.
    private var saveButton: some View {
        let state = model.saveState
        let label: String = switch state {
        case .idle: copy("save")
        case .saving: copy("saving")
        case .saved: copy("saved")
        case .duplicate: copy("duplicate")
        case .failed: copy("saveFailed")
        }
        let icon = state == .saved || state == .duplicate ? "checkmark" : "bookmark"
        return Button(action: model.save) {
            Label(label, systemImage: icon).frame(maxWidth: .infinity, minHeight: 44)
        }
        .buttonStyle(.bordered)
        .disabled(state == .saving || state == .saved || state == .duplicate)
    }

    private func languagePicker(_ label: String, selection: Binding<String>) -> some View {
        Picker(copy(label), selection: selection) {
            ForEach(PocketPreferences.languages, id: \.self) { code in
                Text(YumiWidgetLanguage.name(for: code, displayedIn: model.preferences.interfaceLanguage)).tag(code)
            }
        }
        .pickerStyle(.menu)
        .frame(minHeight: 44)
        .accessibilityLabel(copy(label))
    }

    private func wordLine(_ text: String, language: String, serif: Bool) -> some View {
        HStack {
            Text(text)
                .font(.system(size: serif ? 30 : 26, design: serif ? .serif : .default))
                .frame(maxWidth: .infinity, alignment: .leading)
            Button { model.speak(text, language: language) } label: {
                Image(systemName: "speaker.wave.2").frame(width: 44, height: 44)
            }
            .accessibilityLabel(YumiWidgetLanguage.playPronunciationLabel(for: language, displayedIn: model.preferences.interfaceLanguage))
        }
    }
}
