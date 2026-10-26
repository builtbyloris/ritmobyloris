"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { playCompletionSound, notificationSupport } from "@/lib/feedback";
import { previewFocusAudio } from "@/lib/focus-audio";
import { DEFAULT_PREFERENCES, normalizePreferences, readPreferences, RitmoPreferences, writePreferences } from "@/lib/preferences-db";
import { readSessions, readTimerState } from "@/lib/pomodoro-db";
import { readTasks } from "@/lib/task-db";

export function usePreferences() {
  const [preferences, setPreferences] = useState<RitmoPreferences | null>(null);
  const preferencesRef = useRef<RitmoPreferences | null>(null);
  const writeQueueRef = useRef(Promise.resolve());
  const [error, setError] = useState<string | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<ReturnType<typeof notificationSupport>>("unsupported");

  useEffect(() => {
    void (async () => {
      try {
        setNotificationPermission(notificationSupport());
        let stored = await readPreferences();
        if (!stored) {
          const timer = await readTimerState();
          const legacyTheme = localStorage.getItem("ritmo-theme");
          stored = normalizePreferences({ ...DEFAULT_PREFERENCES, preset: timer.preset, focusMinutes: timer.focusMinutes, shortBreakMinutes: timer.shortBreakMinutes, longBreakMinutes: timer.longBreakMinutes, longBreakEvery: timer.longBreakEvery, theme: legacyTheme === "light" || legacyTheme === "dark" || legacyTheme === "system" ? legacyTheme : "system", updatedAt: Date.now() });
          await writePreferences(stored);
        }
        preferencesRef.current = stored;
        setPreferences(stored);
      } catch { setError("Impossibile caricare le preferenze locali."); }
    })();
  }, []);

  const updatePreferences = useCallback(async (changes: Partial<Omit<RitmoPreferences, "id">>) => {
    const current = preferencesRef.current;
    if (!current) return;
    const next = normalizePreferences({ ...current, ...changes, updatedAt: Date.now() });
    preferencesRef.current = next;
    setPreferences(next);
    try {
      writeQueueRef.current = writeQueueRef.current.catch(() => undefined).then(() => writePreferences(next));
      await writeQueueRef.current;
      setError(null);
    } catch {
      if (preferencesRef.current === next) {
        preferencesRef.current = current;
        setPreferences(current);
      }
      setError("Salvataggio non riuscito. Le modifiche non sono state applicate.");
      return current;
    }
    return next;
  }, []);

  const requestNotifications = useCallback(async () => {
    if (!("Notification" in window)) { setNotificationPermission("unsupported"); return "unsupported" as const; }
    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
    await updatePreferences({ notificationsEnabled: permission === "granted" });
    return permission;
  }, [updatePreferences]);

  const testSound = useCallback(async () => preferences ? playCompletionSound(preferences.soundVolume) : false, [preferences]);
  const previewFocusSound = useCallback(async () => preferences ? previewFocusAudio(preferences.focusSound, preferences.focusSoundVolume) : false, [preferences]);

  const exportData = useCallback(async () => {
    if (!preferences) throw new Error("Preferenze non disponibili");
    const [tasks, sessions, timer] = await Promise.all([readTasks(), readSessions(), readTimerState()]);
    const payload = { format: "ritmobyloris-export", version: 1, exportedAt: new Date().toISOString(), data: { tasks, sessions, timer, preferences } };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ritmobyloris-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
    return { tasks: tasks.length, sessions: sessions.length };
  }, [preferences]);

  return { preferences, error, notificationPermission, updatePreferences, requestNotifications, testSound, previewFocusSound, exportData };
}
