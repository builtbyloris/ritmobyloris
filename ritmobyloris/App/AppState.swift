import SwiftUI

@MainActor
final class AppState: ObservableObject {
    @Published var selection: AppSection = .focus
    @Published var appearance: AppearanceMode = .automatic
}

enum AppearanceMode: String, CaseIterable, Identifiable {
    case automatic
    case light
    case dark

    var id: Self { self }

    var colorScheme: ColorScheme? {
        switch self {
        case .automatic: nil
        case .light: .light
        case .dark: .dark
        }
    }

    var title: String {
        switch self {
        case .automatic: "Automatico"
        case .light: "Chiaro"
        case .dark: "Scuro"
        }
    }

    var symbol: String {
        switch self {
        case .automatic: "circle.lefthalf.filled"
        case .light: "sun.max.fill"
        case .dark: "moon.fill"
        }
    }
}
