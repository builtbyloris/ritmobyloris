import type { TimerState } from "@/lib/pomodoro-db";
import { ensureCloudReady, preferencesToRow } from "@/lib/cloud-migration";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { normalizeFocusSound, normalizeFocusVolume, type FocusSound } from "@/lib/focus-audio";

export type RitmoTheme = "system" | "light" | "dark";
export type RitmoPreset = TimerState["preset"];

export type RitmoPreferences = {
  id: "current";
  preset: RitmoPreset;
  focusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  longBreakEvery: number;
  dailyGoal: number;
  theme: RitmoTheme;
  notificationsEnabled: boolean;
  soundEnabled: boolean;
  soundVolume: number;
  focusSound: FocusSound;
  focusSoundVolume: number;
  updatedAt: number;
};

export const DEFAULT_PREFERENCES: RitmoPreferences = {
  id: "current",
  preset: "25 / 5",
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  longBreakEvery: 4,
  dailyGoal: 4,
  theme: "system",
  notificationsEnabled: false,
  soundEnabled: true,
  soundVolume: 0.45,
  focusSound: "off",
  focusSoundVolume: 0.35,
  updatedAt: 0,
};

export async function readPreferences(): Promise<RitmoPreferences | null> {
  const userId = await ensureCloudReady();
  const { data, error } = await getSupabaseBrowserClient().from("ritmo_preferences").select("*").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    id: "current", preset: data.preset, focusMinutes: data.focus_minutes,
    shortBreakMinutes: data.short_break_minutes, longBreakMinutes: data.long_break_minutes,
    longBreakEvery: data.long_break_every, dailyGoal: data.daily_goal, theme: data.theme,
    notificationsEnabled: data.notifications_enabled, soundEnabled: data.sound_enabled,
    soundVolume: data.sound_volume, focusSound: data.focus_sound ?? "off",
    focusSoundVolume: data.focus_sound_volume ?? .35, updatedAt: data.updated_at,
  } as RitmoPreferences;
}

export async function writePreferences(preferences: RitmoPreferences): Promise<void> {
  const userId = await ensureCloudReady();
  const { error } = await getSupabaseBrowserClient().from("ritmo_preferences").upsert(preferencesToRow(userId, preferences));
  if (error) throw error;
}

export function normalizePreferences(value: RitmoPreferences): RitmoPreferences {
  const minutes = (input: number, max: number, fallback: number) => Number.isFinite(input) ? Math.min(max, Math.max(1, Math.round(input))) : fallback;
  return {
    ...value,
    focusMinutes: minutes(value.focusMinutes, 180, 25),
    shortBreakMinutes: minutes(value.shortBreakMinutes, 60, 5),
    longBreakMinutes: minutes(value.longBreakMinutes, 90, 15),
    longBreakEvery: minutes(value.longBreakEvery, 12, 4),
    dailyGoal: minutes(value.dailyGoal, 20, 4),
    soundVolume: Math.min(1, Math.max(0, Number.isFinite(value.soundVolume) ? value.soundVolume : .45)),
    focusSound: normalizeFocusSound(value.focusSound),
    focusSoundVolume: normalizeFocusVolume(value.focusSoundVolume),
  };
}
