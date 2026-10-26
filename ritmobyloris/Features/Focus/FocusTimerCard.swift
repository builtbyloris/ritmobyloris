import SwiftUI

struct FocusTimerCard: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var progress = 0.0
    @State private var isPaused = false

    var body: some View {
        VStack(spacing: 18) {
            HStack {
                Label("FOCUS IN CORSO", systemImage: "scope")
                    .font(.system(size: 13, weight: .bold, design: .rounded))
                    .tracking(1.6)
                    .foregroundStyle(RitmoColor.violet)

                Spacer()

                HoverIconButton(symbol: "ellipsis") {}
                    .accessibilityLabel("Altre opzioni")
            }

            Label("Pomodoro · 25 min", systemImage: "clock")
                .font(.system(size: 14, weight: .semibold, design: .rounded))
                .foregroundStyle(RitmoColor.violet)
                .padding(.horizontal, 16)
                .frame(height: 34)
                .background(RitmoColor.violet.opacity(0.11))
                .clipShape(Capsule())

            AnimatedTimerRing(progress: progress, isPaused: isPaused)
                .frame(width: 300, height: 300)
                .padding(.vertical, 2)

            HStack(spacing: 14) {
                Button {
                    isPaused.toggle()
                } label: {
                    Label(isPaused ? "Riprendi" : "Pausa", systemImage: isPaused ? "play.fill" : "pause.fill")
                        .frame(minWidth: 140)
                }
                .buttonStyle(RitmoPrimaryButtonStyle())

                Button {} label: {
                    Label("Termina", systemImage: "stop.fill")
                        .frame(minWidth: 112)
                }
                .buttonStyle(RitmoSecondaryButtonStyle())
            }
        }
        .padding(28)
        .background {
            ZStack {
                RitmoColor.card
                RadialGradient(
                    colors: [RitmoColor.gold.opacity(0.22), .clear],
                    center: .bottomLeading,
                    startRadius: 10,
                    endRadius: 330
                )
                RadialGradient(
                    colors: [RitmoColor.violet.opacity(0.20), .clear],
                    center: .topTrailing,
                    startRadius: 10,
                    endRadius: 300
                )
            }
        }
        .clipShape(RoundedRectangle(cornerRadius: RitmoMetrics.cardRadius, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: RitmoMetrics.cardRadius, style: .continuous)
                .stroke(RitmoColor.border, lineWidth: 1)
        }
        .shadow(color: .black.opacity(0.10), radius: 24, y: 12)
        .onAppear {
            if reduceMotion {
                progress = 0.72
            } else {
                withAnimation(.easeInOut(duration: 1.25)) {
                    progress = 0.72
                }
            }
        }
    }
}

private struct AnimatedTimerRing: View {
    let progress: Double
    let isPaused: Bool

    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var glow = false

    var body: some View {
        ZStack {
            Circle()
                .stroke(Color.primary.opacity(0.08), lineWidth: 18)

            Circle()
                .trim(from: 0, to: progress)
                .stroke(
                    AngularGradient(
                        colors: [RitmoColor.gold, RitmoColor.goldSoft, RitmoColor.violetSoft, RitmoColor.violet],
                        center: .center,
                        startAngle: .degrees(-90),
                        endAngle: .degrees(270)
                    ),
                    style: StrokeStyle(lineWidth: 18, lineCap: .round)
                )
                .rotationEffect(.degrees(-90))
                .shadow(color: RitmoColor.gold.opacity(glow ? 0.36 : 0.16), radius: glow ? 18 : 8)

            TimerEndDot(progress: progress)

            VStack(spacing: 7) {
                Text("18:42")
                    .font(.system(size: 57, weight: .bold, design: .rounded))
                    .monospacedDigit()
                    .tracking(-2)
                    .contentTransition(.numericText())

                Text(isPaused ? "IN PAUSA" : "TEMPO RIMANENTE")
                    .font(.system(size: 12, weight: .bold, design: .rounded))
                    .tracking(1.7)
                    .foregroundStyle(RitmoColor.muted)
            }
        }
        .padding(16)
        .onAppear {
            guard !reduceMotion else { return }
            withAnimation(.easeInOut(duration: 1.8).repeatForever(autoreverses: true)) {
                glow = true
            }
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Timer focus, 18 minuti e 42 secondi rimanenti")
    }
}

private struct TimerEndDot: View {
    let progress: Double

    var body: some View {
        GeometryReader { proxy in
            let diameter = min(proxy.size.width, proxy.size.height)
            let radius = (diameter - 32) / 2
            let angle = (progress * 360 - 90) * .pi / 180
            let center = CGPoint(x: proxy.size.width / 2, y: proxy.size.height / 2)

            Circle()
                .fill(.white)
                .frame(width: 18, height: 18)
                .overlay(Circle().stroke(RitmoColor.goldSoft, lineWidth: 4))
                .shadow(color: RitmoColor.gold.opacity(0.55), radius: 10)
                .position(
                    x: center.x + radius * cos(angle),
                    y: center.y + radius * sin(angle)
                )
        }
    }
}
