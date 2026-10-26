import SwiftUI

struct RitmoPrimaryButtonStyle: ButtonStyle {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 15, weight: .semibold, design: .rounded))
            .foregroundStyle(.white)
            .padding(.horizontal, 26)
            .frame(minHeight: 50)
            .background(
                LinearGradient(
                    colors: [RitmoColor.violetSoft, RitmoColor.violet],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
            )
            .clipShape(Capsule())
            .shadow(color: RitmoColor.violet.opacity(configuration.isPressed ? 0.16 : 0.30), radius: 14, y: 7)
            .scaleEffect(configuration.isPressed && !reduceMotion ? 0.975 : 1)
            .animation(RitmoMotion.standard(reduceMotion: reduceMotion), value: configuration.isPressed)
    }
}

struct RitmoSecondaryButtonStyle: ButtonStyle {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 15, weight: .medium, design: .rounded))
            .foregroundStyle(.primary)
            .padding(.horizontal, 24)
            .frame(minHeight: 50)
            .background(RitmoColor.elevated.opacity(configuration.isPressed ? 1 : 0.72))
            .clipShape(Capsule())
            .overlay(Capsule().stroke(RitmoColor.border, lineWidth: 1))
            .scaleEffect(configuration.isPressed && !reduceMotion ? 0.975 : 1)
            .animation(RitmoMotion.standard(reduceMotion: reduceMotion), value: configuration.isPressed)
    }
}

struct HoverIconButton: View {
    let symbol: String
    let action: () -> Void

    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var isHovered = false

    var body: some View {
        Button(action: action) {
            Image(systemName: symbol)
                .font(.system(size: 16, weight: .semibold))
                .frame(width: 38, height: 38)
                .background(RitmoColor.elevated.opacity(isHovered ? 1 : 0.68))
                .clipShape(Circle())
                .overlay(Circle().stroke(RitmoColor.border, lineWidth: 1))
        }
        .buttonStyle(.plain)
        .onHover { hovered in
            withAnimation(RitmoMotion.standard(reduceMotion: reduceMotion)) {
                isHovered = hovered
            }
        }
    }
}

struct SectionHeader: View {
    let symbol: String
    let title: String
    var trailing: String?

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: symbol)
                .font(.system(size: 15, weight: .bold))
                .foregroundStyle(RitmoColor.violet)
                .frame(width: 34, height: 34)
                .background(RitmoColor.violet.opacity(0.12))
                .clipShape(Circle())

            Text(title)
                .font(.system(size: 18, weight: .bold, design: .rounded))

            Spacer()

            if let trailing {
                Text(trailing)
                    .font(.system(size: 15, weight: .semibold, design: .rounded))
                    .foregroundStyle(RitmoColor.muted)
            }
        }
    }
}
