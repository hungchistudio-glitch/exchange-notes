import UIKit
import SwiftUI
import UniformTypeIdentifiers
import AVFoundation

@MainActor final class ShareViewController: UIViewController {
    private let model = PocketShareModel()
    override func viewDidLoad() {
        super.viewDidLoad()
        let host = UIHostingController(rootView: PocketShareView(model: model, done: { [weak self] in
            self?.model.stopSpeech()
            self?.extensionContext?.completeRequest(returningItems: nil)
        }))
        addChild(host); view.addSubview(host.view); host.view.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([host.view.leadingAnchor.constraint(equalTo: view.leadingAnchor), host.view.trailingAnchor.constraint(equalTo: view.trailingAnchor), host.view.topAnchor.constraint(equalTo: view.topAnchor), host.view.bottomAnchor.constraint(equalTo: view.bottomAnchor)])
        host.didMove(toParent: self)
        let providers = (extensionContext?.inputItems as? [NSExtensionItem] ?? []).flatMap { $0.attachments ?? [] }
        guard let provider = providers.first(where: { $0.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) && !$0.hasItemConformingToTypeIdentifier(UTType.url.identifier) }) else { return }
        provider.loadItem(forTypeIdentifier: UTType.plainText.identifier, options: nil) { [weak self] item, _ in
            let text = (item as? String) ?? (item as? Data).flatMap { String(data: $0, encoding: .utf8) }
            Task { @MainActor [weak self] in
                guard let self, let text, !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty, text.count <= 200 else { return }
                self.model.query = text
                self.model.lookup()
            }
        }
    }
    override func viewWillDisappear(_ animated: Bool) { super.viewWillDisappear(animated); model.stopSpeech() }
}

@MainActor final class PocketShareModel: ObservableObject {
    @Published var preferences = PocketPreferences.load()
    @Published var query = ""
    @Published var result: (String,String)?
    @Published var searched = false
    private let dictionary = PocketDictionary()
    private let speech = AVSpeechSynthesizer()
    func lookup() {
        stopSpeech(); searched = true
        result = dictionary.lookup(query, from: preferences.learningLanguageCode, to: preferences.translationLanguageCode)
    }
    func stopSpeech() { speech.stopSpeaking(at: .immediate) }
    func speak(_ text: String, language: String) {
        stopSpeech()
        let utterance = AVSpeechUtterance(string: text)
        let tag = YumiWidgetLanguage.speechTag(for: language)
        utterance.voice = AVSpeechSynthesisVoice.speechVoices()
            .filter { $0.language == tag }
            .max { $0.quality.rawValue < $1.quality.rawValue }
            ?? AVSpeechSynthesisVoice(language: tag)
        utterance.rate = AVSpeechUtteranceDefaultSpeechRate * 0.9
        speech.speak(utterance)
    }
}

struct PocketShareView: View {
    @ObservedObject var model: PocketShareModel
    let done: () -> Void
    private var accent: Color { model.preferences.cosmic ? Color(red:0.72,green:0.9,blue:0.86) : Color(red:0.30,green:0.38,blue:0.29) }
    private var surface: Color { model.preferences.cosmic ? Color(red:0.07,green:0.11,blue:0.13) : Color(red:1,green:0.99,blue:0.96) }
    private var background: Color { model.preferences.cosmic ? Color(red:0.03,green:0.05,blue:0.07) : Color(red:0.96,green:0.94,blue:0.91) }
    private func copy(_ key: String) -> String { PocketCopy.text(key, model.preferences.interfaceLanguage) }
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment:.leading,spacing:20) {
                    Text(copy("offline")).font(.caption).foregroundStyle(.secondary)
                    TextField(copy("search"), text:Binding(get: { model.query }, set: { model.query = $0; model.result = nil; model.searched = false; model.stopSpeech() })).textFieldStyle(.roundedBorder).submitLabel(.search).onSubmit(model.lookup)
                    HStack {
                        languagePicker("source", selection:$model.preferences.learningLanguageCode)
                        Image(systemName:"arrow.right")
                        languagePicker("target", selection:$model.preferences.translationLanguageCode)
                    }
                    Button(action:model.lookup) { Label(copy("lookup"),systemImage:"magnifyingglass").frame(maxWidth:.infinity,minHeight:44) }.buttonStyle(.borderedProminent).disabled(model.query.trimmingCharacters(in:.whitespacesAndNewlines).isEmpty || model.query.count > 200 || model.preferences.learningLanguageCode == model.preferences.translationLanguageCode)
                    if let (word,translation) = model.result {
                        VStack(alignment:.leading,spacing:24) {
                            wordLine(word,language:model.preferences.learningLanguageCode)
                            Divider()
                            wordLine(translation,language:model.preferences.translationLanguageCode)
                        }.padding(24).frame(maxWidth:.infinity,alignment:.leading).background(surface,in:RoundedRectangle(cornerRadius:24))
                        Text(copy("nosave")).font(.footnote).foregroundStyle(.secondary)
                    } else {
                        Text(copy(model.searched ? "missing" : "invalid")).font(.callout).foregroundStyle(.secondary)
                    }
                }.padding(24)
            }
            .scrollContentBackground(.hidden).background(background)
            .navigationTitle(copy("title")).navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement:.confirmationAction) { Button(copy("done"), action:done).frame(minHeight:44) } }
            .tint(accent)
        }
        .preferredColorScheme(model.preferences.cosmic ? .dark : .light)
        .onChange(of:model.preferences) { _,_ in model.result = nil; model.searched = false; model.stopSpeech() }
        .onDisappear { model.stopSpeech() }
    }
    private func languagePicker(_ label: String, selection: Binding<String>) -> some View {
        Picker(copy(label),selection:selection) {
            ForEach(PocketPreferences.languages,id:\.self) { code in
                Text(YumiWidgetLanguage.name(for:code,displayedIn:model.preferences.interfaceLanguage)).tag(code)
            }
        }.pickerStyle(.menu).frame(minHeight:44).accessibilityLabel(copy(label))
    }
    private func wordLine(_ text:String,language:String) -> some View {
        HStack {
            Text(text).font(.system(size:30,design:.serif)).frame(maxWidth:.infinity,alignment:.leading)
            Button { model.speak(text,language:language) } label: { Image(systemName:"speaker.wave.2").frame(width:44,height:44) }
                .accessibilityLabel(YumiWidgetLanguage.playPronunciationLabel(for:language,displayedIn:model.preferences.interfaceLanguage))
        }
    }
}
