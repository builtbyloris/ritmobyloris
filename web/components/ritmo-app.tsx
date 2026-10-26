"use client";

import {
  BarChart3, CalendarDays, CheckSquare2, ChevronRight, Circle, CircleHelp, Clock3, Coffee, Focus,
  History, Leaf, ListTodo, LogOut, Moon, MoreHorizontal, Pause, Play, RotateCcw,
  Maximize2, Search, Settings, SkipForward, Sparkles, Square, Sun, Target, TimerReset,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { StatisticsDashboard } from "@/components/statistics/statistics-dashboard";
import { SettingsDashboard } from "@/components/settings/settings-dashboard";
import { TaskManager } from "@/components/tasks/task-manager";
import { DeepFocusMode } from "@/components/focus/deep-focus-mode";
import { CommandPalette } from "@/components/command-palette/command-palette";
import { DailyPlanner } from "@/components/planner/daily-planner";
import { HelpCenter } from "@/components/help/help-center";
import { OnboardingTour } from "@/components/help/onboarding-tour";
import { usePomodoro } from "@/hooks/use-pomodoro";
import { useFocusAudio } from "@/hooks/use-focus-audio";
import { usePreferences } from "@/hooks/use-preferences";
import { useTasks } from "@/hooks/use-tasks";
import type { RitmoPreset, RitmoTheme } from "@/lib/preferences-db";
import { unlockFocusAudio } from "@/lib/focus-audio";
import { isDeepFocusShortcut } from "@/lib/deep-focus";
import { isCommandPaletteShortcut } from "@/lib/command-palette";
import { completeOnboarding, hasCompletedOnboarding } from "@/lib/onboarding";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type Theme = RitmoTheme;
type Section = "focus" | "planner" | "tasks" | "statistics" | "settings" | "help";

export function RitmoApp({ userId, userName, userEmail }: { userId: string; userName: string; userEmail: string }) {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [section, setSection] = useState<Section>("focus");
  const [deepFocus, setDeepFocus] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const commandReturnFocus = useRef<HTMLElement | null>(null);
  const onboardingChecked = useRef(false);
  const taskStore = useTasks();
  const preferenceStore = usePreferences();
  const pomodoro = usePomodoro(taskStore.reloadTasks, preferenceStore.preferences);
  useFocusAudio(pomodoro.timer, preferenceStore.preferences);
  const setTimerTask = pomodoro.setTask;
  const theme = preferenceStore.preferences?.theme ?? "system";
  const activeTask = taskStore.tasks.find((task) => task.id === pomodoro.timer?.taskId)
    ?? taskStore.tasks.find((task) => task.isActive);

  const exitDeepFocus = useCallback(() => {
    void (async () => {
      if (document.fullscreenElement) {
        try { await document.exitFullscreen(); } catch { /* Browser keeps control of fullscreen failures. */ }
      }
      setDeepFocus(false);
    })();
  }, []);
  const openCommands = useCallback(() => {
    commandReturnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setCommandOpen(true);
  }, []);
  const handleCommandOpenChange = useCallback((open: boolean) => {
    setCommandOpen(open);
    if (open) return;
    const target = commandReturnFocus.current;
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
      if (target?.isConnected) target.focus({ preventScroll: true });
    }));
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("ritmo-theme", theme);
  }, [theme]);
  useEffect(() => {
    if (onboardingChecked.current) return;
    onboardingChecked.current = true;
    const frame = window.requestAnimationFrame(() => {
      try {
        if (!hasCompletedOnboarding(userId)) setTutorialOpen(true);
      } catch {
        setTutorialOpen(true);
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [userId]);
  useEffect(() => {
    if (pomodoro.timer && !pomodoro.timer.taskId && activeTask) void setTimerTask(activeTask.id);
  }, [activeTask, pomodoro.timer, setTimerTask]);
  useEffect(() => {
    const toggleDeepFocus = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.isContentEditable || target?.matches("input, textarea, select")) return;
      if (!isDeepFocusShortcut(event) || !pomodoro.timer || !preferenceStore.preferences) return;
      event.preventDefault();
      setSection("focus");
      if (deepFocus) exitDeepFocus();
      else setDeepFocus(true);
    };
    window.addEventListener("keydown", toggleDeepFocus);
    return () => window.removeEventListener("keydown", toggleDeepFocus);
  }, [deepFocus, exitDeepFocus, pomodoro.timer, preferenceStore.preferences]);
  useEffect(() => {
    const openCommandPalette = (event: KeyboardEvent) => {
      if (!isCommandPaletteShortcut(event)) return;
      event.preventDefault();
      openCommands();
    };
    window.addEventListener("keydown", openCommandPalette);
    return () => window.removeEventListener("keydown", openCommandPalette);
  }, [openCommands]);

  async function selectTask(id: string) {
    await Promise.all([taskStore.setActiveTask(id), pomodoro.setTask(id)]);
  }
  async function startFocus(id: string) {
    await selectTask(id);
    setSection("focus");
    await pomodoro.start(id);
  }
  async function setPreset(preset: RitmoPreset, focusMinutes: number, shortBreakMinutes: number) {
    const longBreakMinutes = preset === "25 / 5" ? 15 : preset === "50 / 10" ? 20 : preferenceStore.preferences?.longBreakMinutes ?? 18;
    await preferenceStore.updatePreferences({ preset, focusMinutes, shortBreakMinutes, longBreakMinutes });
  }
  async function toggleTimer() {
    const timer = pomodoro.timer;
    if (!timer) return;
    if (timer.status === "running") await pomodoro.pause();
    else {
      if (timer.mode === "focus") await unlockFocusAudio();
      await pomodoro.start(activeTask?.id ?? null);
    }
  }
  function toggleDeepFocus() {
    setSection("focus");
    if (deepFocus) exitDeepFocus();
    else setDeepFocus(true);
  }
  function navigate(section: Section) {
    if (deepFocus) exitDeepFocus();
    setSection(section);
  }
  const finishTutorial = useCallback(() => {
    try { completeOnboarding(userId); } catch { /* Private browsing may disable local storage. */ }
    setTutorialOpen(false);
  }, [userId]);

  async function signOut() {
    await getSupabaseBrowserClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return <><AnimatePresence mode="wait" initial={false}>{deepFocus && pomodoro.timer && preferenceStore.preferences ? <DeepFocusMode
    key="deep-focus"
    timer={pomodoro.timer}
    time={pomodoro.time}
    progress={pomodoro.progress}
    activeTask={activeTask}
    preferences={preferenceStore.preferences}
    onStart={() => pomodoro.start(activeTask?.id ?? null)}
    onPause={pomodoro.pause}
    onTerminate={pomodoro.terminate}
    onUpdatePreferences={preferenceStore.updatePreferences}
    onOpenCommand={openCommands}
    onExit={exitDeepFocus}
  /> : <main className="app-shell" key="dashboard">
    <Sidebar section={section} onChange={setSection} onOpenCommand={openCommands} userName={userName} userEmail={userEmail} onSignOut={signOut} />
    <section className="workspace"><AnimatePresence mode="wait" initial={false}>
      {section === "focus" && <motion.div key="focus" initial={{ opacity: 0, y: reduceMotion ? 0 : 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: reduceMotion ? 0 : -6 }} transition={{ duration: reduceMotion ? 0 : .22 }}><FocusDashboard userName={userName} theme={theme} setTheme={(value) => void preferenceStore.updatePreferences({ theme: value })} dailyGoal={preferenceStore.preferences?.dailyGoal ?? 4} tasks={taskStore.tasks} activeTask={activeTask} pomodoro={pomodoro} onPresetChange={setPreset} onSelectTask={selectTask} onShowHistory={() => setSection("statistics")} onDeepFocus={() => setDeepFocus(true)} /></motion.div>}
      {section === "planner" && <DailyPlanner key="planner" tasks={taskStore.tasks} loading={taskStore.loading} error={taskStore.error} timerBusy={pomodoro.timer?.status !== "idle"} onPlan={taskStore.planTask} onReorder={taskStore.reorderPlannedTasks} onToggle={taskStore.toggleTask} onStartFocus={startFocus} onCreateTask={() => setSection("tasks")} />}
      {section === "tasks" && <TaskManager key="tasks" tasks={taskStore.tasks} loading={taskStore.loading} error={taskStore.error} timerBusy={pomodoro.timer?.status !== "idle"} onCreate={taskStore.createTask} onUpdate={taskStore.updateTask} onToggle={taskStore.toggleTask} onDelete={taskStore.deleteTask} onStartFocus={startFocus} />}
      {section === "statistics" && <StatisticsDashboard key="statistics" sessions={pomodoro.sessions} tasks={taskStore.tasks} dailyGoal={preferenceStore.preferences?.dailyGoal ?? 4} />}
      {section === "settings" && <SettingsDashboard key="settings" preferences={preferenceStore.preferences} error={preferenceStore.error} notificationPermission={preferenceStore.notificationPermission} timer={pomodoro.timer} onUpdate={preferenceStore.updatePreferences} onRequestNotifications={preferenceStore.requestNotifications} onTestSound={preferenceStore.testSound} onPreviewFocusSound={preferenceStore.previewFocusSound} onExport={preferenceStore.exportData} />}
      {section === "help" && <HelpCenter key="help" onReplayTutorial={() => setTutorialOpen(true)} />}
    </AnimatePresence></section>
    <AnimatePresence>{pomodoro.notice && <motion.button className="timer-toast" role="status" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} onClick={pomodoro.clearNotice}>{pomodoro.notice}<span>Chiudi</span></motion.button>}</AnimatePresence>
  </main>}</AnimatePresence>
    <CommandPalette open={commandOpen} onOpenChange={handleCommandOpenChange} section={section} deepFocus={deepFocus} tasks={taskStore.tasks} activeTask={activeTask} timer={pomodoro.timer} preferences={preferenceStore.preferences} onNavigate={navigate} onToggleTimer={toggleTimer} onToggleDeepFocus={toggleDeepFocus} onSelectTask={selectTask} onThemeChange={(value) => preferenceStore.updatePreferences({ theme: value })} onSoundChange={(value) => preferenceStore.updatePreferences({ focusSound: value })} />
    <OnboardingTour open={tutorialOpen} onComplete={finishTutorial} />
  </>;
}

function Sidebar({ section, onChange, onOpenCommand, userName, userEmail, onSignOut }: { section: Section; onChange: (section: Section) => void; onOpenCommand: () => void; userName: string; userEmail: string; onSignOut: () => Promise<void> }) {
  const items = [["focus", Focus, "Focus"], ["planner", CalendarDays, "Planner"], ["tasks", ListTodo, "Attività"], ["statistics", BarChart3, "Statistiche"], ["settings", Settings, "Impostazioni"], ["help", CircleHelp, "Aiuto"]] as const;
  return <aside className="sidebar"><div className="brand" aria-label="Ritmo"><span className="brand-mark" /><span>R I T M O</span></div><nav aria-label="Navigazione principale">{items.map(([value, Icon, label]) => <button key={value} className={`nav-item ${section === value ? "active" : ""}`} onClick={() => onChange(value)} aria-label={label} aria-current={section === value ? "page" : undefined}><Icon size={20} /><span>{label}</span></button>)}<button className="nav-item command-nav-item" onClick={onOpenCommand} aria-label="Apri palette comandi"><Search size={20} /><span>Comandi</span><kbd>⌘K</kbd></button></nav><div className="sidebar-note"><Leaf size={22} /><p>Mantieni<br />il tuo ritmo.</p></div><div className="account-card"><span className="account-avatar">{userName.slice(0, 1).toUpperCase()}</span><span><strong>{userName}</strong><small>{userEmail}</small></span><button onClick={() => void onSignOut()} title="Esci" aria-label="Esci dall’account"><LogOut size={17} /></button></div></aside>;
}

type PomodoroStore = ReturnType<typeof usePomodoro>;
type TaskStore = ReturnType<typeof useTasks>;

function FocusDashboard({ userName, theme, setTheme, dailyGoal, tasks, activeTask, pomodoro, onPresetChange, onSelectTask, onShowHistory, onDeepFocus }: { userName: string; theme: Theme; setTheme: (theme: Theme) => void; dailyGoal: number; tasks: TaskStore["tasks"]; activeTask: TaskStore["tasks"][number] | undefined; pomodoro: PomodoroStore; onPresetChange: (preset: RitmoPreset, focus: number, shortBreak: number) => Promise<void>; onSelectTask: (id: string) => Promise<void>; onShowHistory: () => void; onDeepFocus: () => void }) {
  const reduceMotion = useReducedMotion();
  const timer = pomodoro.timer;
  const [customFocus, setCustomFocus] = useState<number | null>(null);
  const [customBreak, setCustomBreak] = useState<number | null>(null);
  if (!timer) return <div className="focus-loading"><Clock3 className="spin" /> Sincronizzazione del tuo timer…</div>;
  const customFocusValue = customFocus ?? (timer.preset === "Personalizzato" ? timer.focusMinutes : 35);
  const customBreakValue = customBreak ?? (timer.preset === "Personalizzato" ? timer.shortBreakMinutes : 8);
  const isBreak = timer.mode !== "focus";
  const modeLabel = timer.mode === "longBreak" ? "PAUSA LUNGA" : timer.mode === "shortBreak" ? "PAUSA BREVE" : "FOCUS";
  const statusLabel = timer.status === "running" ? `${modeLabel} IN CORSO` : timer.status === "paused" ? `${modeLabel} IN PAUSA` : `${modeLabel} PRONTO`;
  const presetOptions = [{ label: "25 / 5", focus: 25, pause: 5 }, { label: "50 / 10", focus: 50, pause: 10 }, { label: "Personalizzato", focus: customFocusValue, pause: customBreakValue }] as const;

  return <>
    <header className="page-header"><div><p className="eyebrow mobile-only">RITMO · FOCUS</p><h1>{isBreak ? "Ottimo lavoro, " : "Buongiorno, "}<span>{userName}</span></h1><p>{isBreak ? "Recupera energia. Il prossimo passo può aspettare." : "Un passo alla volta, resta nel ritmo."}</p></div><div className="page-header-actions"><button type="button" className="deep-focus-trigger" onClick={onDeepFocus} title="Deep Focus (⌘⇧D)"><Maximize2 size={16} /><span>Deep Focus</span><kbd>⌘⇧D</kbd></button><ThemeControl theme={theme} setTheme={setTheme} /></div></header>
    <div className="dashboard-grid"><section className="primary-column">
      <motion.article className={`card timer-card ${isBreak ? "break-mode" : ""}`} layout transition={{ duration: reduceMotion ? 0 : .3 }}>
        <div className="card-topline"><span className="status-label">{isBreak ? <Coffee size={17} /> : <Focus size={17} />} {statusLabel}</span><span className="cycle-label">Ciclo {timer.completedFocusCount % timer.longBreakEvery + 1} di {timer.longBreakEvery}</span></div>
        {!isBreak && <><div className="preset-tabs" aria-label="Preset Pomodoro">{presetOptions.map((item) => <button key={item.label} className={item.label === timer.preset ? "active" : ""} disabled={timer.status !== "idle"} onClick={() => onPresetChange(item.label, item.focus, item.pause)}>{item.label}</button>)}</div>{timer.preset === "Personalizzato" && timer.status === "idle" && <div className="custom-duration"><label>Focus <input aria-label="Minuti Focus personalizzato" type="number" min="1" max="180" value={customFocusValue} onChange={(event) => setCustomFocus(Number(event.target.value))} onBlur={() => onPresetChange("Personalizzato", customFocusValue, customBreakValue)} /> min</label><label>Pausa <input aria-label="Minuti pausa personalizzata" type="number" min="1" max="60" value={customBreakValue} onChange={(event) => setCustomBreak(Number(event.target.value))} onBlur={() => onPresetChange("Personalizzato", customFocusValue, customBreakValue)} /> min</label></div>}</>}
        <div className="timer-wrap"><motion.div className="timer-ring" animate={{ "--progress": `${Math.max(0.008, pomodoro.progress) * 360}deg` } as never} transition={{ duration: reduceMotion ? 0 : .35, ease: "linear" }}><div className="timer-core"><span className="mode-pill">{isBreak ? <Coffee size={15} /> : <Clock3 size={15} />}{isBreak ? (timer.mode === "longBreak" ? `Pausa lunga · ${timer.longBreakMinutes} min` : `Pausa breve · ${timer.shortBreakMinutes} min`) : `${timer.preset} · ${timer.focusMinutes} min`}</span><strong>{pomodoro.time}</strong><small>{timer.status === "running" ? "TEMPO RIMANENTE" : timer.status === "paused" ? "TIMER IN PAUSA" : "PRONTO QUANDO VUOI"}</small></div></motion.div></div>
        <div className="timer-actions"><button className="button primary" onClick={() => { if (timer.status !== "running" && !isBreak) void unlockFocusAudio(); return timer.status === "running" ? pomodoro.pause() : pomodoro.start(activeTask?.id ?? null); }}>{timer.status === "running" ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}{timer.status === "running" ? "Pausa" : timer.status === "paused" ? "Riprendi" : isBreak ? "Inizia pausa" : "Avvia focus"}</button><button className="button secondary" onClick={pomodoro.reset}><RotateCcw size={17} /> Reset</button>{timer.status !== "idle" && <button className="button tertiary" onClick={pomodoro.terminate}><Square size={15} fill="currentColor" /> Termina</button>}{isBreak && <button className="button tertiary" onClick={pomodoro.skipBreak}><SkipForward size={17} /> Salta pausa</button>}</div>
      </motion.article>
      <article className="card active-task-card"><div className="task-icon amber"><CheckSquare2 size={21} /></div>{activeTask ? <><div className="active-task-copy"><small>Attività collegata</small><strong>{activeTask.title}</strong><span>{activeTask.category}</span></div><div className="session-progress"><small>{activeTask.completedPomodoros} di {activeTask.estimatedPomodoros} pomodori</small><div>{Array.from({ length: Math.min(activeTask.estimatedPomodoros, 8) }, (_, dot) => <i key={dot} className={dot < activeTask.completedPomodoros ? "done" : ""} />)}</div></div></> : <div className="active-task-copy"><small>Attività collegata</small><strong>Focus libero</strong><span>Nessuna attività selezionata</span></div>}<ChevronRight className="chevron" size={18} /></article>
    </section><aside className="secondary-column">
      <article className="card goal-card"><div className="section-title"><span><Target size={19} /> Obiettivo oggi</span><strong>{pomodoro.todaySessions} / {dailyGoal} sessioni</strong></div><div className="goal-bars" style={{ gridTemplateColumns: `repeat(${Math.min(dailyGoal, 10)}, 1fr)` }}>{Array.from({ length: Math.min(dailyGoal, 10) }, (_, bar) => <i key={bar} className={bar < pomodoro.todaySessions ? "filled" : ""} />)}</div><p><Clock3 size={16} /> {pomodoro.minutesToday} {pomodoro.minutesToday === 1 ? "minuto" : "minuti"} di focus registrati</p></article>
      <article className="card schedule-card"><div className="section-title"><span><ListTodo size={19} /> In programma</span></div><div className="task-list">{tasks.filter((task) => !task.completed).slice(0, 3).map((task) => <button key={task.id} className={`task-row ${task.id === timer.taskId ? "current" : ""}`} disabled={timer.status !== "idle"} title={timer.status !== "idle" ? "Termina o reimposta il timer per cambiare attività" : undefined} onClick={() => onSelectTask(task.id)}><span className="check-circle">{task.id === timer.taskId ? <span /> : <Circle size={19} />}</span><span>{task.title}</span><small>{task.completedPomodoros}/{task.estimatedPomodoros}</small><MoreHorizontal size={17} /></button>)}</div></article>
      <HistoryCard sessions={pomodoro.sessions.slice(0, 3)} onShowAll={onShowHistory} />
    </aside></div>
  </>;
}

function HistoryCard({ sessions, onShowAll }: { sessions: PomodoroStore["sessions"]; onShowAll: () => void }) {
  return <article className="card history-card"><div className="section-title"><span><History size={19} /> Cronologia recente</span>{sessions.length > 0 && <button onClick={onShowAll}>Vedi tutte</button>}</div>{sessions.length === 0 ? <div className="history-empty"><TimerReset size={22} /><span>Le sessioni completate appariranno qui.</span></div> : <div className="history-list">{sessions.map((session) => <div key={session.id}><span className="history-dot" /><p><strong>{session.taskTitle}</strong><small>{session.durationMinutes} min · {formatDate(session.completedAt)}</small></p></div>)}</div>}</article>;
}

function ThemeControl({ theme, setTheme }: { theme: Theme; setTheme: (theme: Theme) => void }) { return <div className="theme-control" aria-label="Tema">{([["system", Sparkles, "Automatico"], ["light", Sun, "Chiaro"], ["dark", Moon, "Scuro"]] as const).map(([value, Icon, label]) => <button key={value} className={theme === value ? "selected" : ""} onClick={() => setTheme(value)} title={label} aria-label={`Tema ${label}`} aria-pressed={theme === value}><Icon size={16} /></button>)}</div>; }
function formatDate(timestamp: number) { return new Intl.DateTimeFormat("it-IT", { hour: "2-digit", minute: "2-digit" }).format(new Date(timestamp)); }
