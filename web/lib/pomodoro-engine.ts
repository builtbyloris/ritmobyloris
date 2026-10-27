export type PomodoroMode = "focus" | "shortBreak" | "longBreak";

export function nextBreakMode(completedFocusCount: number, longBreakEvery: number): PomodoroMode {
  const cadence = Math.max(1, Math.round(longBreakEvery));
  return completedFocusCount > 0 && completedFocusCount % cadence === 0 ? "longBreak" : "shortBreak";
}

export function timestampRemaining(endsAt: number | null, now: number, fallback: number): number {
  return endsAt === null ? Math.max(0, fallback) : Math.max(0, endsAt - now);
}

export function isFinalFocusCountdown(mode: PomodoroMode, status: "idle" | "running" | "paused", seconds: number): boolean {
  return mode === "focus" && status === "running" && seconds >= 1 && seconds <= 5;
}
