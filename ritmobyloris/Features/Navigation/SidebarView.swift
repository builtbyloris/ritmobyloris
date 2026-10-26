import SwiftUI

enum AppSection: String, CaseIterable, Identifiable {
    case focus
    case tasks
    case statistics
    case settings

    var id: Self { self }

    var title: String {
        switch self {
        case .focus: "Focus"
        case .tasks: "Attività"
        case .statistics: "Statistiche"
        case .settings: "Impostazioni"
        }
    }

    var symbol: String {
        switch self {
        case .focus: "timer"
        case .tasks: "checklist"
        case .statistics: "chart.bar.xaxis"
        case .settings: "gearshape"
        }
    }
}

struct SidebarView: View {
    @Binding var selection: AppSection
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            LogoView()
                .padding(.top, 54)
                .padding(.horizontal, 28)
                .padding(.bottom, 40)

            VStack(spacing: 8) {
                ForEach(AppSection.allCases) { section in
                    SidebarRow(section: section, isSelected: selection == section) {
                        withAnimation(RitmoMotion.standard(reduceMotion: reduceMotion)) {
                            selection = section
                        }
                    }
                }
            }
            .padding(.horizontal, 16)

            Spacer()

            VStack(alignment: .leading, spacing: 12) {
                Image(systemName: "leaf")
                    .font(.system(size: 20, weight: .medium))
                    .foregroundStyle(RitmoColor.violet)
                Text("Mantieni\nil tuo ritmo.")
                    .font(.system(size: 14, weight: .medium, design: .rounded))
                    .foregroundStyle(RitmoColor.muted)
                    .lineSpacing(4)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(20)
            .background(
                LinearGradient(
                    colors: [RitmoColor.violet.opacity(0.09), RitmoColor.gold.opacity(0.16)],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
            )
            .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
            .padding(16)
        }
        .background(RitmoColor.sidebar)
        .overlay(alignment: .trailing) {
            Rectangle().fill(RitmoColor.border).frame(width: 1)
        }
    }
}

private struct LogoView: View {
    var body: some View {
        HStack(spacing: 13) {
            ZStack {
                Circle()
                    .trim(from: 0.08, to: 0.72)
                    .stroke(
                        LinearGradient(
                            colors: [RitmoColor.gold, RitmoColor.violet],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        ),
                        style: StrokeStyle(lineWidth: 7, lineCap: .round)
                    )
                    .rotationEffect(.degrees(154))
            }
            .frame(width: 38, height: 38)

            Text("R I T M O")
                .font(.system(size: 15, weight: .bold, design: .rounded))
                .tracking(2.8)
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Ritmo")
    }
}

private struct SidebarRow: View {
    let section: AppSection
    let isSelected: Bool
    let action: () -> Void

    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var isHovered = false

    var body: some View {
        Button(action: action) {
            HStack(spacing: 14) {
                Image(systemName: section.symbol)
                    .font(.system(size: 17, weight: .semibold))
                    .frame(width: 24)
                Text(section.title)
                    .font(.system(size: 15, weight: isSelected ? .semibold : .medium, design: .rounded))
                Spacer()
            }
            .foregroundStyle(isSelected ? RitmoColor.violet : Color.primary.opacity(0.78))
            .padding(.horizontal, 16)
            .frame(height: 50)
            .background {
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .fill(
                        isSelected
                            ? RitmoColor.violet.opacity(0.14)
                            : Color.primary.opacity(isHovered ? 0.045 : 0)
                    )
            }
        }
        .buttonStyle(.plain)
        .onHover { hovered in
            withAnimation(RitmoMotion.standard(reduceMotion: reduceMotion)) {
                isHovered = hovered
            }
        }
        .accessibilityAddTraits(isSelected ? .isSelected : [])
    }
}
