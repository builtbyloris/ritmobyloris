import SwiftUI

struct MainView: View {
    @EnvironmentObject private var appState: AppState

    var body: some View {
        HStack(spacing: 0) {
            SidebarView(selection: $appState.selection)
                .frame(width: 224)

            ZStack {
                RitmoColor.background
                    .ignoresSafeArea()

                backgroundGlow

                Group {
                    switch appState.selection {
                    case .focus:
                        FocusView()
                            .transition(.opacity.combined(with: .move(edge: .bottom)))
                    case .tasks, .statistics, .settings:
                        PlaceholderView(section: appState.selection)
                            .transition(.opacity)
                    }
                }
            }
        }
        .background(RitmoColor.background)
    }

    private var backgroundGlow: some View {
        GeometryReader { proxy in
            Circle()
                .fill(RitmoColor.violet.opacity(0.12))
                .frame(width: 520, height: 520)
                .blur(radius: 110)
                .offset(x: proxy.size.width * 0.55, y: -250)

            Circle()
                .fill(RitmoColor.gold.opacity(0.10))
                .frame(width: 430, height: 430)
                .blur(radius: 100)
                .offset(x: -180, y: proxy.size.height * 0.58)
        }
        .allowsHitTesting(false)
    }
}
