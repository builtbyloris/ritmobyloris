import SwiftUI

struct PlaceholderView: View {
    let section: AppSection

    var body: some View {
        VStack(spacing: 18) {
            Image(systemName: section.symbol)
                .font(.system(size: 34, weight: .medium))
                .foregroundStyle(RitmoColor.violet)
                .frame(width: 76, height: 76)
                .background(RitmoColor.violet.opacity(0.12))
                .clipShape(Circle())

            Text(section.title)
                .font(.system(size: 30, weight: .bold, design: .rounded))

            Text("Questa sezione arriverà nel prossimo step.")
                .foregroundStyle(RitmoColor.muted)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}
