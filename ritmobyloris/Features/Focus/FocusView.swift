import SwiftUI

struct FocusView: View {
    @EnvironmentObject private var appState: AppState

    var body: some View {
        GeometryReader { proxy in
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    header

                    if proxy.size.width >= 950 {
                        HStack(alignment: .top, spacing: 18) {
                            leftColumn
                                .frame(maxWidth: .infinity)

                            rightColumn
                                .frame(width: min(390, proxy.size.width * 0.36))
                        }
                    } else {
                        VStack(spacing: 18) {
                            leftColumn
                            rightColumn
                        }
                    }
                }
                .padding(RitmoMetrics.pagePadding)
                .frame(maxWidth: 1_260)
                .frame(maxWidth: .infinity)
            }
            .scrollIndicators(.hidden)
        }
    }

    private var header: some View {
        HStack(alignment: .top, spacing: 24) {
            VStack(alignment: .leading, spacing: 6) {
                Text("Buongiorno, Loris")
                    .font(.system(size: 36, weight: .bold, design: .rounded))
                    .tracking(-1.2)
                Text("Un passo alla volta, resta nel ritmo.")
                    .font(.system(size: 18, weight: .medium, design: .rounded))
                    .foregroundStyle(RitmoColor.muted)
            }

            Spacer()

            AppearanceControl(selection: $appState.appearance)
        }
    }

    private var leftColumn: some View {
        VStack(spacing: 18) {
            FocusTimerCard()
            ActiveTaskCard()
        }
    }

    private var rightColumn: some View {
        VStack(spacing: 18) {
            DailyGoalCard()
            ScheduledTasksCard()
            WeeklyFocusCard()
        }
    }
}

private struct AppearanceControl: View {
    @Binding var selection: AppearanceMode
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        HStack(spacing: 4) {
            ForEach(AppearanceMode.allCases) { mode in
                Button {
                    withAnimation(RitmoMotion.standard(reduceMotion: reduceMotion)) {
                        selection = mode
                    }
                } label: {
                    Image(systemName: mode.symbol)
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(selection == mode ? Color.white : RitmoColor.muted)
                        .frame(width: 36, height: 32)
                        .background(selection == mode ? RitmoColor.violet : Color.clear)
                        .clipShape(Capsule())
                }
                .buttonStyle(.plain)
                .help(mode.title)
                .accessibilityLabel("Tema \(mode.title)")
                .accessibilityAddTraits(selection == mode ? .isSelected : [])
            }
        }
        .padding(4)
        .background(RitmoColor.card)
        .clipShape(Capsule())
        .overlay(Capsule().stroke(RitmoColor.border, lineWidth: 1))
    }
}
