import AppKit
import SwiftUI

enum RitmoColor {
    static let violet = Color(red: 0.48, green: 0.42, blue: 0.95)
    static let violetSoft = Color(red: 0.68, green: 0.64, blue: 1.00)
    static let gold = Color(red: 1.00, green: 0.72, blue: 0.28)
    static let goldSoft = Color(red: 1.00, green: 0.84, blue: 0.49)

    static let background = adaptive(
        light: NSColor(srgbRed: 0.95, green: 0.96, blue: 0.99, alpha: 1),
        dark: NSColor(srgbRed: 0.035, green: 0.045, blue: 0.075, alpha: 1)
    )

    static let sidebar = adaptive(
        light: NSColor(srgbRed: 0.94, green: 0.95, blue: 0.98, alpha: 0.92),
        dark: NSColor(srgbRed: 0.055, green: 0.065, blue: 0.10, alpha: 0.96)
    )

    static let card = adaptive(
        light: NSColor(srgbRed: 1, green: 1, blue: 1, alpha: 0.72),
        dark: NSColor(srgbRed: 0.085, green: 0.095, blue: 0.14, alpha: 0.88)
    )

    static let elevated = adaptive(
        light: NSColor(srgbRed: 0.94, green: 0.95, blue: 0.99, alpha: 0.88),
        dark: NSColor(srgbRed: 0.11, green: 0.12, blue: 0.18, alpha: 0.92)
    )

    static let muted = adaptive(
        light: NSColor(srgbRed: 0.34, green: 0.37, blue: 0.52, alpha: 1),
        dark: NSColor(srgbRed: 0.65, green: 0.67, blue: 0.78, alpha: 1)
    )

    static let border = adaptive(
        light: NSColor.white.withAlphaComponent(0.78),
        dark: NSColor.white.withAlphaComponent(0.12)
    )

    private static func adaptive(light: NSColor, dark: NSColor) -> Color {
        Color(nsColor: NSColor(name: nil) { appearance in
            appearance.bestMatch(from: [.darkAqua, .aqua]) == .darkAqua ? dark : light
        })
    }
}

enum RitmoMetrics {
    static let cardRadius: CGFloat = 24
    static let compactRadius: CGFloat = 15
    static let pagePadding: CGFloat = 30
    static let cardPadding: CGFloat = 24
}

enum RitmoMotion {
    static func standard(reduceMotion: Bool) -> Animation? {
        reduceMotion ? nil : .spring(response: 0.42, dampingFraction: 0.84)
    }

    static func gentle(reduceMotion: Bool) -> Animation? {
        reduceMotion ? nil : .easeInOut(duration: 0.7)
    }
}

struct RitmoCardModifier: ViewModifier {
    let padding: CGFloat
    let radius: CGFloat

    func body(content: Content) -> some View {
        content
            .padding(padding)
            .background(RitmoColor.card)
            .clipShape(RoundedRectangle(cornerRadius: radius, style: .continuous))
            .overlay {
                RoundedRectangle(cornerRadius: radius, style: .continuous)
                    .stroke(RitmoColor.border, lineWidth: 1)
            }
            .shadow(color: .black.opacity(0.08), radius: 22, y: 10)
    }
}

extension View {
    func ritmoCard(
        padding: CGFloat = RitmoMetrics.cardPadding,
        radius: CGFloat = RitmoMetrics.cardRadius
    ) -> some View {
        modifier(RitmoCardModifier(padding: padding, radius: radius))
    }
}
