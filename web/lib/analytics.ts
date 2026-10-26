import type { FocusSession } from "@/lib/pomodoro-db";
import type { RitmoTask, TaskCategory } from "@/lib/task-db";

export type AnalyticsRange = 7 | 30 | 90;
export type SessionCategory = TaskCategory | "Focus libero";

export type TrendPoint = {
  label: string;
  longLabel: string;
  minutes: number;
  sessions: number;
};

export type AnalyticsSnapshot = {
  range: AnalyticsRange;
  start: number;
  end: number;
  sessions: FocusSession[];
  focusMinutes: number;
  completedPomodoros: number;
  activeDays: number;
  completedTasks: number;
  comparison: { focusMinutes: number; completedPomodoros: number; activeDays: number; completedTasks: number } | null;
  trend: TrendPoint[];
  categories: Array<{ category: SessionCategory; minutes: number; sessions: number; percentage: number }>;
  activities: Array<{ title: string; minutes: number; sessions: number }>;
};

const dayKey = (timestamp: number) => {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
};

function localStart(timestamp: number) {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date;
}

function shiftDays(date: Date, amount: number) {
  const shifted = new Date(date);
  shifted.setDate(shifted.getDate() + amount);
  return shifted;
}

function sessionsIn(sessions: FocusSession[], start: number, end: number) {
  return sessions.filter((session) => session.completedAt >= start && session.completedAt <= end);
}

function core(sessions: FocusSession[]) {
  return {
    focusMinutes: sessions.reduce((sum, session) => sum + session.durationMinutes, 0),
    completedPomodoros: sessions.length,
    activeDays: new Set(sessions.map((session) => dayKey(session.completedAt))).size,
  };
}

export function percentChange(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

export function buildAnalytics(sessions: FocusSession[], tasks: RitmoTask[], range: AnalyticsRange, now = Date.now()): AnalyticsSnapshot {
  const uniqueSessions = [...new Map(sessions.map((session) => [session.id, session])).values()];
  const today = localStart(now);
  const startDate = shiftDays(today, -(range - 1));
  const start = startDate.getTime();
  const currentSessions = sessionsIn(uniqueSessions, start, now).sort((a, b) => b.completedAt - a.completedAt);
  const previousEnd = start - 1;
  const previousStart = shiftDays(startDate, -range).getTime();
  const previousSessions = sessionsIn(uniqueSessions, previousStart, previousEnd);
  const currentCore = core(currentSessions);
  const previousCore = core(previousSessions);
  const completedTasks = tasks.filter((task) => task.completed && task.completedAt && task.completedAt >= start && task.completedAt <= now).length;
  const previousCompletedTasks = tasks.filter((task) => task.completedAt && task.completedAt >= previousStart && task.completedAt <= previousEnd).length;
  const comparison = currentSessions.length >= 2 && previousSessions.length >= 2 ? { ...previousCore, completedTasks: previousCompletedTasks } : null;

  const bucketSize = range === 7 ? 1 : range === 30 ? 3 : 10;
  const trend: TrendPoint[] = [];
  const shortFormatter = new Intl.DateTimeFormat("it-IT", range === 7 ? { weekday: "short" } : { day: "numeric", month: "short" });
  const longFormatter = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "long", year: "numeric" });
  for (let offset = 0; offset < range; offset += bucketSize) {
    const bucketStart = shiftDays(startDate, offset);
    const bucketEndDate = shiftDays(bucketStart, Math.min(bucketSize, range - offset));
    const bucketSessions = sessionsIn(currentSessions, bucketStart.getTime(), Math.min(now, bucketEndDate.getTime() - 1));
    trend.push({
      label: shortFormatter.format(bucketStart).replace(".", ""),
      longLabel: bucketSize === 1 ? longFormatter.format(bucketStart) : `${shortFormatter.format(bucketStart)} – ${shortFormatter.format(shiftDays(bucketEndDate, -1))}`,
      minutes: bucketSessions.reduce((sum, session) => sum + session.durationMinutes, 0),
      sessions: bucketSessions.length,
    });
  }

  const categoryMap = new Map<SessionCategory, { minutes: number; sessions: number }>();
  const activityMap = new Map<string, { minutes: number; sessions: number }>();
  for (const session of currentSessions) {
    const category = session.category ?? "Focus libero";
    const categoryValue = categoryMap.get(category) ?? { minutes: 0, sessions: 0 };
    categoryMap.set(category, { minutes: categoryValue.minutes + session.durationMinutes, sessions: categoryValue.sessions + 1 });
    const title = session.taskTitle || "Attività eliminata";
    const activityValue = activityMap.get(title) ?? { minutes: 0, sessions: 0 };
    activityMap.set(title, { minutes: activityValue.minutes + session.durationMinutes, sessions: activityValue.sessions + 1 });
  }
  const categories = [...categoryMap.entries()].map(([category, value]) => ({ category, ...value, percentage: currentCore.focusMinutes ? Math.round(value.minutes / currentCore.focusMinutes * 100) : 0 })).sort((a, b) => b.minutes - a.minutes);
  const activities = [...activityMap.entries()].map(([title, value]) => ({ title, ...value })).sort((a, b) => b.sessions - a.sessions || b.minutes - a.minutes).slice(0, 5);

  return { range, start, end: now, sessions: currentSessions, ...currentCore, completedTasks, comparison, trend, categories, activities };
}
