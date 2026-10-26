import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { FocusSession, TimerState } from "@/lib/pomodoro-db";
import type { RitmoPreferences } from "@/lib/preferences-db";
import type { RitmoTask } from "@/lib/task-db";

const LOCAL_DB = "ritmo-local";
const LOCAL_VERSION = 3;
const MIGRATION_OWNER = "ritmo-cloud-migration-owner";
let bootstrapPromise: Promise<string> | null = null;

function request<T>(value: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    value.onsuccess = () => resolve(value.result);
    value.onerror = () => reject(value.error ?? new Error("IndexedDB non disponibile"));
  });
}

function openLocalDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const value = indexedDB.open(LOCAL_DB, LOCAL_VERSION);
    value.onsuccess = () => resolve(value.result);
    value.onerror = () => reject(value.error ?? new Error("IndexedDB non disponibile"));
  });
}

async function readStore<T>(name: string): Promise<T[]> {
  const database = await openLocalDatabase();
  if (!database.objectStoreNames.contains(name)) { database.close(); return []; }
  const values = await request<T[]>(database.transaction(name, "readonly").objectStore(name).getAll());
  database.close();
  return values;
}

export const taskToRow = (userId: string, task: RitmoTask) => ({
  user_id: userId, id: task.id, title: task.title, category: task.category,
  estimated_pomodoros: task.estimatedPomodoros, completed_pomodoros: task.completedPomodoros,
  completed: task.completed, completed_at: task.completedAt ?? null, is_active: task.isActive,
  created_at: task.createdAt, updated_at: task.updatedAt,
});

export const sessionToRow = (userId: string, session: FocusSession) => ({
  user_id: userId, id: session.id, task_id: session.taskId, task_title: session.taskTitle,
  category: session.category, started_at: session.startedAt, completed_at: session.completedAt,
  duration_minutes: session.durationMinutes, status: session.status ?? "completed",
});

export const timerToRow = (userId: string, timer: TimerState) => ({
  user_id: userId, mode: timer.mode, status: timer.status, preset: timer.preset,
  focus_minutes: timer.focusMinutes, short_break_minutes: timer.shortBreakMinutes,
  long_break_minutes: timer.longBreakMinutes, long_break_every: timer.longBreakEvery,
  remaining_ms: timer.remainingMs, ends_at: timer.endsAt, cycle_id: timer.cycleId,
  task_id: timer.taskId, focus_started_at: timer.focusStartedAt,
  completed_focus_count: timer.completedFocusCount, updated_at: timer.updatedAt,
});

export const preferencesToRow = (userId: string, value: RitmoPreferences) => ({
  user_id: userId, preset: value.preset, focus_minutes: value.focusMinutes,
  short_break_minutes: value.shortBreakMinutes, long_break_minutes: value.longBreakMinutes,
  long_break_every: value.longBreakEvery, daily_goal: value.dailyGoal, theme: value.theme,
  notifications_enabled: value.notificationsEnabled, sound_enabled: value.soundEnabled,
  sound_volume: value.soundVolume, focus_sound: value.focusSound,
  focus_sound_volume: value.focusSoundVolume, updated_at: value.updatedAt,
});

async function migrateForUser(userId: string) {
  const supabase = getSupabaseBrowserClient();
  const { data: existing, error: checkError } = await supabase.from("ritmo_migrations").select("migrated_at").eq("user_id", userId).maybeSingle();
  if (checkError) throw checkError;
  if (existing) return userId;

  const owner = localStorage.getItem(MIGRATION_OWNER);
  if (!owner || owner === userId) {
    const [tasks, sessions, timers, preferences] = await Promise.all([
      readStore<RitmoTask>("tasks"), readStore<FocusSession>("sessions"),
      readStore<TimerState>("timer"), readStore<RitmoPreferences>("preferences"),
    ]);
    if (tasks.length) {
      const { error } = await supabase.from("ritmo_tasks").upsert(tasks.map((item) => taskToRow(userId, item)));
      if (error) throw error;
    }
    if (sessions.length) {
      const { error } = await supabase.from("ritmo_sessions").upsert(sessions.map((item) => sessionToRow(userId, item)));
      if (error) throw error;
    }
    if (timers[0]) {
      const { error } = await supabase.from("ritmo_timers").upsert(timerToRow(userId, timers[0]));
      if (error) throw error;
    }
    if (preferences[0]) {
      const { error } = await supabase.from("ritmo_preferences").upsert(preferencesToRow(userId, preferences[0]));
      if (error) throw error;
    }
    localStorage.setItem(MIGRATION_OWNER, userId);
  }
  const { error } = await supabase.from("ritmo_migrations").upsert({ user_id: userId, migrated_at: Date.now(), source_version: 6 });
  if (error) throw error;
  return userId;
}

export function ensureCloudReady() {
  if (!bootstrapPromise) {
    bootstrapPromise = (async () => {
      const supabase = getSupabaseBrowserClient();
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) throw error ?? new Error("Sessione non disponibile");
      return migrateForUser(user.id);
    })().catch((error) => { bootstrapPromise = null; throw error; });
  }
  return bootstrapPromise;
}
