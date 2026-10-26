import { RitmoTask } from "@/lib/task-db";
import { nextBreakMode } from "@/lib/pomodoro-engine";
import type { RitmoPreferences } from "@/lib/preferences-db";
import { ensureCloudReady, sessionToRow, timerToRow } from "@/lib/cloud-migration";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export type TimerMode = "focus" | "shortBreak" | "longBreak";
export type TimerStatus = "idle" | "running" | "paused";

export type TimerState = {
  id: "current";
  mode: TimerMode;
  status: TimerStatus;
  preset: "25 / 5" | "50 / 10" | "Personalizzato";
  focusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  longBreakEvery: number;
  remainingMs: number;
  endsAt: number | null;
  cycleId: string;
  taskId: string | null;
  focusStartedAt: number | null;
  completedFocusCount: number;
  updatedAt: number;
};

export type FocusSession = {
  id: string;
  taskId: string | null;
  taskTitle: string;
  category: RitmoTask["category"] | null;
  startedAt: number;
  completedAt: number;
  durationMinutes: number;
  status?: "completed";
};

type SessionRow = {
  id: string; task_id: string | null; task_title: string;
  category: RitmoTask["category"] | null; started_at: number; completed_at: number;
  duration_minutes: number;
};

const DEFAULT_TIMER: TimerState = {
  id: "current",
  mode: "focus",
  status: "idle",
  preset: "25 / 5",
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  longBreakEvery: 4,
  remainingMs: 25 * 60_000,
  endsAt: null,
  cycleId: crypto.randomUUID(),
  taskId: null,
  focusStartedAt: null,
  completedFocusCount: 0,
  updatedAt: Date.now(),
};

export function modeDuration(state: TimerState, mode = state.mode): number {
  if (mode === "focus") return state.focusMinutes * 60_000;
  if (mode === "longBreak") return state.longBreakMinutes * 60_000;
  return state.shortBreakMinutes * 60_000;
}

export function timerWithPreferences(state: TimerState, preferences: RitmoPreferences): TimerState {
  return { ...state, preset: preferences.preset, focusMinutes: preferences.focusMinutes, shortBreakMinutes: preferences.shortBreakMinutes, longBreakMinutes: preferences.longBreakMinutes, longBreakEvery: preferences.longBreakEvery };
}

export async function readTimerState(): Promise<TimerState> {
  const userId = await ensureCloudReady();
  const { data, error } = await getSupabaseBrowserClient().from("ritmo_timers").select("*").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  if (!data) {
    const initial = { ...DEFAULT_TIMER, cycleId: crypto.randomUUID(), updatedAt: Date.now() };
    await writeTimerState(initial);
    return initial;
  }
  return {
    id: "current", mode: data.mode, status: data.status, preset: data.preset,
    focusMinutes: data.focus_minutes, shortBreakMinutes: data.short_break_minutes,
    longBreakMinutes: data.long_break_minutes, longBreakEvery: data.long_break_every,
    remainingMs: data.remaining_ms, endsAt: data.ends_at, cycleId: data.cycle_id,
    taskId: data.task_id, focusStartedAt: data.focus_started_at,
    completedFocusCount: data.completed_focus_count, updatedAt: data.updated_at,
  } as TimerState;
}

export async function writeTimerState(state: TimerState): Promise<void> {
  const userId = await ensureCloudReady();
  const { error } = await getSupabaseBrowserClient().from("ritmo_timers").upsert(timerToRow(userId, state));
  if (error) throw error;
}

export async function readSessions(): Promise<FocusSession[]> {
  const userId = await ensureCloudReady();
  const { data, error } = await getSupabaseBrowserClient().from("ritmo_sessions").select("*").eq("user_id", userId).order("completed_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row: SessionRow) => ({
    id: row.id, taskId: row.task_id, taskTitle: row.task_title,
    category: row.category, startedAt: row.started_at, completedAt: row.completed_at,
    durationMinutes: row.duration_minutes, status: "completed",
  } as FocusSession));
}

export async function completeFocusOnce(state: TimerState, completedAt: number, preferences?: RitmoPreferences | null): Promise<{ counted: boolean; state: TimerState }> {
  const userId = await ensureCloudReady();
  const supabase = getSupabaseBrowserClient();
  const completedCount = state.completedFocusCount + 1;
  const configured = preferences ? timerWithPreferences(state, preferences) : state;
  const nextMode: TimerMode = nextBreakMode(completedCount, configured.longBreakEvery);
  let nextState: TimerState = {
    ...configured,
    mode: nextMode,
    status: "idle",
    remainingMs: modeDuration(configured, nextMode),
    endsAt: null,
    focusStartedAt: null,
    cycleId: crypto.randomUUID(),
    completedFocusCount: completedCount,
    updatedAt: completedAt,
  };

  let task: RitmoTask | undefined;
  if (state.taskId) {
    const { data } = await supabase.from("ritmo_tasks").select("*").eq("user_id", userId).eq("id", state.taskId).maybeSingle();
    if (data) task = {
      id: data.id, title: data.title, category: data.category, estimatedPomodoros: data.estimated_pomodoros,
      completedPomodoros: data.completed_pomodoros, completed: data.completed, completedAt: data.completed_at,
      isActive: data.is_active, createdAt: data.created_at, updatedAt: data.updated_at,
    } as RitmoTask;
  }
  if (task && task.completedPomodoros + 1 >= task.estimatedPomodoros) nextState = { ...nextState, taskId: null };
  const session = {
      id: state.cycleId,
      taskId: task?.id ?? null,
      taskTitle: task?.title ?? "Focus libero",
      category: task?.category ?? null,
      startedAt: state.focusStartedAt ?? completedAt - state.focusMinutes * 60_000,
      completedAt,
      durationMinutes: state.focusMinutes,
      status: "completed",
    } satisfies FocusSession;
  const { data: counted, error } = await supabase.rpc("ritmo_complete_focus", {
    p_session: sessionToRow(userId, session), p_next_timer: timerToRow(userId, nextState),
  });
  if (error) throw error;
  if (!counted) return { counted: false, state: await readTimerState() };
  return { counted: true, state: nextState };
}

export async function finishBreak(state: TimerState, completedAt: number, preferences?: RitmoPreferences | null): Promise<TimerState> {
  const configured = preferences ? timerWithPreferences(state, preferences) : state;
  const next: TimerState = {
    ...configured,
    mode: "focus",
    status: "idle",
    remainingMs: configured.focusMinutes * 60_000,
    endsAt: null,
    focusStartedAt: null,
    cycleId: crypto.randomUUID(),
    updatedAt: completedAt,
  };
  await writeTimerState(next);
  return next;
}
