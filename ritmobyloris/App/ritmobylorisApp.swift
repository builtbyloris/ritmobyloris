import SwiftUI

@main
struct ritmobylorisApp: App {
    @StateObject private var appState = AppState()

    var body: some Scene {
        WindowGroup {
            MainView()
                .environmentObject(appState)
                .preferredColorScheme(appState.appearance.colorScheme)
                .frame(minWidth: 1_020, minHeight: 700)
        }
        .defaultSize(width: 1_360, height: 860)
        .windowStyle(.hiddenTitleBar)
        .windowResizability(.contentMinSize)
    }
}
