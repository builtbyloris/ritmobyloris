import assert from "node:assert/strict";
import test from "node:test";
import { buildAnalytics, percentChange } from "../lib/analytics.ts";
import { nextBreakMode, timestampRemaining } from "../lib/pomodoro-engine.ts";
import { normalizeFocusSound, normalizeFocusVolume } from "../lib/focus-audio.ts";
import { isDeepFocusShortcut } from "../lib/deep-focus.ts";
import type { FocusSession } from "../lib/pomodoro-db.ts";
import type { RitmoTask } from "../lib/task-db.ts";

const minute = 60_000;

function session(id: string, completedAt: number, durationMinutes = 25, overrides: Partial<FocusSession> = {}): FocusSession {
  return {
    id,
    taskId: null,
    taskTitle: "Focus libero",
    category: null,
    startedAt: completedAt - durationMinutes * minute,
    completedAt,
    durationMinutes,
    status: "completed",
    ...overrides,
  };
}

test("il motore sceglie la pausa lunga solo alla cadenza configurata", () => {
  assert.equal(nextBreakMode(1, 4), "shortBreak");
  assert.equal(nextBreakMode(4, 4), "longBreak");
  assert.equal(nextBreakMode(8, 4), "longBreak");
  assert.equal(nextBreakMode(1, 0), "longBreak");
});

test("il countdown usa il timestamp e non scende mai sotto zero", () => {
  assert.equal(timestampRemaining(10_000, 7_500, 99_000), 2_500);
  assert.equal(timestampRemaining(10_000, 10_001, 99_000), 0);
  assert.equal(timestampRemaining(null, 50_000, -1), 0);
});

test("le statistiche filtrano il periodo e deduplicano le sessioni per id", () => {
  const now = new Date(2026, 9, 21, 12).getTime();
  const yesterday = new Date(2026, 9, 20, 18).getTime();
  const old = new Date(2026, 9, 12, 18).getTime();
  const duplicate = session("same-cycle", yesterday, 25, { taskTitle: "Attività eliminata", category: "Studio" });
  const analytics = buildAnalytics([duplicate, duplicate, session("today", now - minute, 50), session("old", old)], [], 7, now);

  assert.equal(analytics.completedPomodoros, 2);
  assert.equal(analytics.focusMinutes, 75);
  assert.equal(analytics.activeDays, 2);
  assert.equal(analytics.activities[0]?.title, "Focus libero");
  assert.equal(analytics.categories.find((item) => item.category === "Studio")?.minutes, 25);
  assert.equal(analytics.trend.reduce((sum, point) => sum + point.sessions, 0), 2);
});

test("il confronto appare solo con dati sufficienti in entrambi i periodi", () => {
  const now = new Date(2026, 9, 21, 12).getTime();
  const current = [session("c1", new Date(2026, 9, 20, 10).getTime()), session("c2", new Date(2026, 9, 21, 10).getTime())];
  const sparsePrevious = [session("p1", new Date(2026, 9, 13, 10).getTime())];
  assert.equal(buildAnalytics([...current, ...sparsePrevious], [], 7, now).comparison, null);

  const enoughPrevious = [...sparsePrevious, session("p2", new Date(2026, 9, 12, 10).getTime())];
  assert.ok(buildAnalytics([...current, ...enoughPrevious], [], 7, now).comparison);
  assert.equal(percentChange(75, 50), 50);
  assert.equal(percentChange(50, 0), null);
});

test("le attività completate rispettano i confini locali del giorno", () => {
  const now = new Date(2026, 9, 21, 12).getTime();
  const tasks = [
    { id: "in", completed: true, completedAt: new Date(2026, 9, 15, 0, 0, 0).getTime() },
    { id: "out", completed: true, completedAt: new Date(2026, 9, 14, 23, 59, 59).getTime() },
  ] as RitmoTask[];
  assert.equal(buildAnalytics([], tasks, 7, now).completedTasks, 1);
});

test("le preferenze audio normalizzano scelta e volume senza valori non validi", () => {
  assert.equal(normalizeFocusSound("rain"), "rain");
  assert.equal(normalizeFocusSound("vento"), "off");
  assert.equal(normalizeFocusVolume(2), 1);
  assert.equal(normalizeFocusVolume(Number.NaN), .35);
});

test("Deep Focus usa una scorciatoia intenzionale e non intercetta la digitazione normale", () => {
  assert.equal(isDeepFocusShortcut({ key: "d", metaKey: true, ctrlKey: false, shiftKey: true }), true);
  assert.equal(isDeepFocusShortcut({ key: "D", metaKey: false, ctrlKey: true, shiftKey: true }), true);
  assert.equal(isDeepFocusShortcut({ key: "d", metaKey: false, ctrlKey: false, shiftKey: true }), false);
  assert.equal(isDeepFocusShortcut({ key: "d", metaKey: true, ctrlKey: false, shiftKey: false }), false);
});
