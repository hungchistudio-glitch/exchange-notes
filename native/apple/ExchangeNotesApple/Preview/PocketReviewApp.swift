import SwiftUI
import WidgetKit

/// Simulator-only visual harness. This target is never embedded in Exchange Notes.
@main struct PocketReviewApp: App {
    var body: some Scene { WindowGroup { PocketReviewScreen() } }
}
struct PocketReviewScreen: View {
    @StateObject private var model = PocketShareModel()
    @State private var tab = 0
    var body: some View {
        VStack(spacing:12) {
            HStack {
                Toggle("Cosmic",isOn:Binding(get:{model.preferences.cosmic},set:{model.preferences.appMode = $0 ? "cosmic" : "standard"}))
                Picker("Interface language",selection:$model.preferences.interfaceLanguage) {
                    ForEach(["english","traditional-chinese","spanish","french","italian"],id:\.self){Text($0).tag($0)}
                }.pickerStyle(.menu)
            }.padding(.horizontal)
            Picker("Preview",selection:$tab){Text("Widget").tag(0);Text("Share").tag(1)}.pickerStyle(.segmented).padding(.horizontal)
            if tab == 0 {
                Spacer()
                PocketWidgetView(preferences:model.preferences,previewFamily:.systemMedium)
                    .padding(20).frame(width:340,height:170)
                    .background(model.preferences.cosmic ? Color(red:0.07,green:0.11,blue:0.13) : Color(red:1,green:0.99,blue:0.96),in:RoundedRectangle(cornerRadius:24))
                Text("Layout preview · install the actual widget from the Home Screen gallery.").font(.caption).foregroundStyle(.secondary).padding()
                Spacer()
            } else {
                PocketShareView(model:model,done:{tab=0})
            }
        }.background(model.preferences.cosmic ? Color.black : Color(red:0.96,green:0.94,blue:0.91))
        .preferredColorScheme(model.preferences.cosmic ? .dark : .light)
        .task(id:tab) { if tab == 1 { await Task.yield(); model.lookup() } }
        .onAppear {
            model.preferences = PocketPreferences()
            model.preferences.interfaceLanguage = "traditional-chinese"
            model.preferences.appMode = ProcessInfo.processInfo.environment["POCKET_REVIEW_COSMIC"] == "1" ? "cosmic" : "standard"
            model.query = "thank you"
            tab = ProcessInfo.processInfo.environment["POCKET_REVIEW_SHARE"] == "1" ? 1 : 0
        }
    }
}
