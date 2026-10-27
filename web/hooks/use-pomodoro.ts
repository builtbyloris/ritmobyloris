"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  completeFocusOnce,
  finishBreak,
  FocusSession,
  modeDuration,
  readSessions,
  readTimerState,
  TimerState,
  timerWithPreferences,
  writeTimerState,
} from "@/lib/pomodoro-db";
import { isFinalFocusCountdown, timestampRemaining } from "@/lib/pomodoro-engine";
import { playCompletionSound, playCountdownTick, sendCompletionNotification, unlockFeedbackAudio } from "@/lib/feedback";
import type { RitmoPreferences } from "@/lib/preferences-db";

const clampMinutes = (value: number, fallback: number) => Number.isFinite(value) ? Math.min(180, Math.max(1, Math.round(value))) : fallback;

export function usePomodoro(onTaskChange: () => Promise<unknown>, preferences: RitmoPreferences | null) {
  const [timer, setTimer] = useState<TimerState | null>(null);
  const [sessions, setSessions] = useState<FocusSession[]>([]);
  const [now, setNow] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const completing = useRef(false);
  const lastCountdownSecond = useRef<number | null>(null);

  const reloadSessions = useCallback(async () => setSessions(await readSessions()), []);

  useEffect(() => {
    Promise.all([readTimerState(), readSessions()]).then(([state, history]) => {
      setTimer(state);
      setSessions(history);
      setNow(Date.now());
    });
  }, []);

  const timerStatus = timer?.status;
  const timerMode = timer?.mode;
  const timerEndsAt = timer?.endsAt;
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const interval = window.setInterval(tick, timerStatus === "running" ? 250 : 60_000);
    const sync = () => tick();
    document.addEventListener("visibilitychange", sync);
    window.addEventListener("focus", sync);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", sync);
      window.removeEventListener("focus", sync);
    };
  }, [timerStatus, timerEndsAt]);

  const remainingMs = timer ? timer.status === "running" ? timestampRemaining(timer.endsAt, now, timer.remainingMs) : timer.remainingMs : 0;
  const seconds = Math.ceil(remainingMs / 1000);

  useEffect(() => {
    if (!timerMode || !timerStatus || !isFinalFocusCountdown(timerMode, timerStatus, seconds) || !preferences?.soundEnabled) {
      lastCountdownSecond.current = null;
      return;
    }
    if (lastCountdownSecond.current === seconds) return;
    lastCountdownSecond.current = seconds;
    void playCountdownTick(preferences.soundVolume, seconds);
  }, [preferences?.soundEnabled, preferences?.soundVolume, seconds, timerMode, timerStatus]);

  const handleCompletion = useCallback(async (current: TimerState) => {
    if (completing.current) return;
    completing.current = true;
    try {
      if (current.mode === "focus") {
        const result = await completeFocusOnce(current, Date.now(), preferences);
        setTimer(result.state);
        if (result.counted) {
          setNotice(result.state.mode === "longBreak" ? "Quattro Pomodori completati. È il momento di una pausa lunga." : "Pomodoro completato. Ottimo lavoro!");
          sendCompletionNotification("Focus completato", result.state.mode === "longBreak" ? "Ottimo ritmo. È pronta una pausa lunga." : "Ottimo lavoro. È pronta una pausa breve.", preferences);
          if (preferences?.soundEnabled) void playCompletionSound(preferences.soundVolume);
          await Promise.all([reloadSessions(), onTaskChange()]);
        }
      } else {
        const next = await finishBreak(current, Date.now(), preferences);
        setTimer(next);
        setNotice("Pausa completata. Il prossimo Focus è pronto.");
        sendCompletionNotification("Pausa completata", "Il prossimo Focus è pronto quando vuoi.", preferences);
        if (preferences?.soundEnabled) void playCompletionSound(preferences.soundVolume);
      }
    } catch {
      setNotice("Completamento non registrato: controlla l’accesso ai dati locali e riprova.");
    } finally {
      completing.current = false;
    }
  }, [onTaskChange, preferences, reloadSessions]);

  useEffect(() => {
    if (timer?.status !== "running" || !timer.endsAt || remainingMs > 0) return;
    const completionTask = window.setTimeout(() => void handleCompletion(timer), 0);
    return () => window.clearTimeout(completionTask);
  }, [handleCompletion, remainingMs, timer]);

  const save = useCallback(async (next: TimerState) => {
    try {
      await writeTimerState(next);
      setTimer(next);
      setNow(Date.now());
      return true;
    } catch {
      setNotice("Timer non salvato. Lo stato precedente è stato mantenuto.");
      return false;
    }
  }, []);

  useEffect(() => {
    if (!timer || !preferences || timer.status !== "idle") return;
    const configured = timerWithPreferences(timer, preferences);
    const changed = configured.preset !== timer.preset || configured.focusMinutes !== timer.focusMinutes || configured.shortBreakMinutes !== timer.shortBreakMinutes || configured.longBreakMinutes !== timer.longBreakMinutes || configured.longBreakEvery !== timer.longBreakEvery;
    if (!changed) return;
    configured.remainingMs = modeDuration(configured);
    configured.updatedAt = Date.now();
    void (async () => {
      try {
        await writeTimerState(configured);
        setTimer(configured);
      } catch {
        setNotice("Impossibile sincronizzare le nuove durate con il timer.");
      }
    })();
  }, [preferences, timer]);

  const start = useCallback(async (taskId?: string | null) => {
    if (!timer || timer.status === "running") return;
    if (preferences?.soundEnabled) await unlockFeedbackAudio();
    const timestamp = Date.now();
    const isFreshFocus = timer.mode === "focus" && timer.status === "idle";
    await save({
      ...timer,
      status: "running",
      endsAt: timestamp + timer.remainingMs,
      taskId: taskId === undefined ? timer.taskId : taskId,
      focusStartedAt: isFreshFocus ? timestamp : timer.focusStartedAt,
      cycleId: isFreshFocus ? crypto.randomUUID() : timer.cycleId,
      updatedAt: timestamp,
    });
  }, [preferences?.soundEnabled, save, timer]);

  const pause = useCallback(async () => {
    if (!timer || timer.status !== "running") return;
    const timestamp = Date.now();
    await save({ ...timer, status: "paused", remainingMs: Math.max(0, (timer.endsAt ?? timestamp) - timestamp), endsAt: null, updatedAt: timestamp });
  }, [save, timer]);

  const reset = useCallback(async () => {
    if (!timer) return;
    await save({ ...timer, status: "idle", remainingMs: modeDuration(timer), endsAt: null, focusStartedAt: null, cycleId: crypto.randomUUID(), updatedAt: Date.now() });
    setNotice("Timer reimpostato. La sessione non è stata conteggiata.");
  }, [save, timer]);

  const terminate = useCallback(async () => {
    if (!timer) return;
    const configured = preferences ? timerWithPreferences(timer, preferences) : timer;
    const next: TimerState = { ...configured, mode: "focus", status: "idle", remainingMs: configured.focusMinutes * 60_000, endsAt: null, focusStartedAt: null, cycleId: crypto.randomUUID(), updatedAt: Date.now() };
    await save(next);
    setNotice("Sessione terminata senza conteggio.");
  }, [preferences, save, timer]);

  const skipBreak = useCallback(async () => {
    if (!timer || timer.mode === "focus") return;
    try {
      const next = await finishBreak(timer, Date.now(), preferences);
      setTimer(next);
      setNotice("Pausa saltata. Il Focus è pronto.");
    } catch {
      setNotice("Impossibile saltare la pausa: lo stato precedente è stato mantenuto.");
    }
  }, [preferences, timer]);

  const selectPreset = useCallback(async (preset: TimerState["preset"], focusMinutes: number, shortBreakMinutes: number) => {
    if (!timer) return;
    const focus = clampMinutes(focusMinutes, 25);
    const shortBreak = clampMinutes(shortBreakMinutes, 5);
    const next = { ...timer, preset, focusMinutes: focus, shortBreakMinutes: shortBreak, status: "idle" as const, endsAt: null, focusStartedAt: null, cycleId: crypto.randomUUID(), updatedAt: Date.now() };
    next.remainingMs = modeDuration(next);
    await save(next);
  }, [save, timer]);

  const setTask = useCallback(async (taskId: string | null) => {
    if (!timer || timer.status !== "idle") return;
    await save({ ...timer, taskId, updatedAt: Date.now() });
  }, [save, timer]);

  const totalMs = timer ? modeDuration(timer) : 1;
  const progress = timer ? Math.min(1, Math.max(0, 1 - remainingMs / totalMs)) : 0;
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todaySessions = sessions.filter((session) => session.completedAt >= todayStart.getTime());
  const minutesToday = todaySessions.reduce((sum, session) => sum + session.durationMinutes, 0);

  return {
    timer, sessions, seconds, progress, notice, clearNotice: () => setNotice(null),
    todaySessions: todaySessions.length, minutesToday,
    start, pause, reset, terminate, skipBreak, selectPreset, setTask,
    reloadSessions,
    time: useMemo(() => `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`, [seconds]),
  };
}
