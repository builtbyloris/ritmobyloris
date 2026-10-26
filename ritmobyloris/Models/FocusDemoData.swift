import Foundation

struct FocusTask: Identifiable, Hashable {
    let id = UUID()
    let title: String
    let duration: Int
    let isCompleted: Bool
    let isActive: Bool
}

struct WeekFocus: Identifiable {
    let id = UUID()
    let day: String
    let minutes: Int
    let isHighlight: Bool
}

enum FocusDemoData {
    static let tasks = [
        FocusTask(title: "Ripassare JOIN", duration: 25, isCompleted: true, isActive: false),
        FocusTask(title: "Analisi SQL — F1Nsight", duration: 25, isCompleted: false, isActive: true),
        FocusTask(title: "Leggere 20 pagine", duration: 25, isCompleted: false, isActive: false)
    ]

    static let week = [
        WeekFocus(day: "L", minutes: 110, isHighlight: true),
        WeekFocus(day: "M", minutes: 135, isHighlight: false),
        WeekFocus(day: "M", minutes: 82, isHighlight: false),
        WeekFocus(day: "G", minutes: 155, isHighlight: true),
        WeekFocus(day: "V", minutes: 136, isHighlight: false),
        WeekFocus(day: "S", minutes: 58, isHighlight: false),
        WeekFocus(day: "D", minutes: 120, isHighlight: true)
    ]
}
