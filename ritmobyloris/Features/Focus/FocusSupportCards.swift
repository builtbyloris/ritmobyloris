import SwiftUI

struct ActiveTaskCard: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var isHovered = false

    var body: some View {
        HStack(spacing: 18) {
            Image(systemName: "doc.text.fill")
                .font(.system(size: 19, weight: .semibold))
                .foregroundStyle(RitmoColor.gold)
                .frame(width: 52, height: 52)
                .background(RitmoColor.gold.opacity(0.14))
                .clipShape(RoundedRectangle(cornerRadius: 15, style: .continuous))

            VStack(alignment: .leading, spacing: 5) {
                Text("Attività attiva")
                    .font(.system(size: 13, weight: .medium, design: .rounded))
                    .foregroundStyle(RitmoColor.muted)
                Text("Analisi SQL — F1Nsight")
                    .font(.system(size: 18, weight: .bold, design: .rounded))
                Text("Studio")
                    .font(.system(size: 12, weight: .semibold, design: .rounded))
                    .foregroundStyle(RitmoColor.violet)
            }

            Spacer()

            VStack(alignment: .trailing, spacing: 8) {
                Text("Sessione 2 di 4")
                    .font(.system(size: 12, weight: .medium, design: .rounded))
                    .foregroundStyle(RitmoColor.muted)
                HStack(spacing: 7) {
                    ForEach(0..<4, id: \.self) { index in
                        Circle()
                            .fill(index < 2 ? RitmoColor.gold : Color.primary.opacity(0.10))
                            .frame(width: 10, height: 10)
                    }
                }
            }

            Image(systemName: "chevron.right")
                .font(.system(size: 13, weight: .bold))
                .foregroundStyle(RitmoColor.muted)
                .offset(x: isHovered && !reduceMotion ? 3 : 0)
        }
        .ritmoCard(padding: 20)
        .onHover { hovered in
            withAnimation(RitmoMotion.standard(reduceMotion: reduceMotion)) {
                isHovered = hovered
            }
        }
    }
}

struct DailyGoalCard: View {
    var body: some View {
        VStack(spacing: 20) {
            SectionHeader(symbol: "target", title: "Obiettivo oggi", trailing: "2 / 4 sessioni")

            HStack(spacing: 8) {
                ForEach(0..<4, id: \.self) { index in
                    Capsule()
                        .fill(
                            index < 2
                                ? LinearGradient(colors: [RitmoColor.gold, RitmoColor.goldSoft], startPoint: .leading, endPoint: .trailing)
                                : LinearGradient(colors: [Color.primary.opacity(0.08)], startPoint: .leading, endPoint: .trailing)
                        )
                        .frame(height: 13)
                }
            }

            Label("Mantieni la costanza. Ci sei quasi!", systemImage: "scope")
                .font(.system(size: 12, weight: .medium, design: .rounded))
                .foregroundStyle(RitmoColor.muted)
                .frame(maxWidth: .infinity, alignment: .leading)
        }
        .ritmoCard(padding: 20)
    }
}

struct ScheduledTasksCard: View {
    var body: some View {
        VStack(spacing: 14) {
            SectionHeader(symbol: "list.bullet", title: "In programma")

            VStack(spacing: 7) {
                ForEach(FocusDemoData.tasks) { task in
                    ScheduledTaskRow(task: task)
                }
            }
        }
        .ritmoCard(padding: 20)
    }
}

private struct ScheduledTaskRow: View {
    let task: FocusTask
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var isHovered = false

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: task.isCompleted ? "checkmark.circle.fill" : task.isActive ? "circle.circle.fill" : "circle")
                .font(.system(size: 20, weight: .medium))
                .foregroundStyle(task.isCompleted || task.isActive ? RitmoColor.violet : RitmoColor.muted)

            Text(task.title)
                .font(.system(size: 13, weight: task.isActive ? .semibold : .medium, design: .rounded))
                .strikethrough(task.isCompleted)
                .foregroundStyle(task.isCompleted ? RitmoColor.muted : .primary)
                .lineLimit(1)

            Spacer(minLength: 6)

            Text("\(task.duration) min")
                .font(.system(size: 11, weight: .medium, design: .rounded))
                .foregroundStyle(RitmoColor.muted)
        }
        .padding(.horizontal, 12)
        .frame(height: 48)
        .background(task.isActive ? RitmoColor.violet.opacity(0.11) : Color.primary.opacity(isHovered ? 0.045 : 0.025))
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        .onHover { hovered in
            withAnimation(RitmoMotion.standard(reduceMotion: reduceMotion)) {
                isHovered = hovered
            }
        }
    }
}

struct WeeklyFocusCard: View {
    var body: some View {
        VStack(spacing: 18) {
            SectionHeader(symbol: "chart.bar.fill", title: "Ultimi 7 giorni", trailing: "8h 35m")

            HStack(alignment: .bottom, spacing: 12) {
                ForEach(FocusDemoData.week) { item in
                    VStack(spacing: 8) {
                        RoundedRectangle(cornerRadius: 7, style: .continuous)
                            .fill(
                                LinearGradient(
                                    colors: item.isHighlight
                                        ? [RitmoColor.goldSoft, RitmoColor.gold.opacity(0.28)]
                                        : [RitmoColor.violetSoft, RitmoColor.violet.opacity(0.25)],
                                    startPoint: .top,
                                    endPoint: .bottom
                                )
                            )
                            .frame(height: max(22, CGFloat(item.minutes) * 0.55))

                        Text(item.day)
                            .font(.system(size: 10, weight: .medium, design: .rounded))
                            .foregroundStyle(RitmoColor.muted)
                    }
                    .frame(maxWidth: .infinity)
                }
            }
            .frame(height: 112, alignment: .bottom)
        }
        .ritmoCard(padding: 20)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Ultimi sette giorni, 8 ore e 35 minuti di focus")
    }
}
