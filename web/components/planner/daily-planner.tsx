"use client";

import {
  CalendarDays, Check, ChevronLeft, ChevronRight, Circle, Clock3, GripVertical,
  Inbox, Play, Plus, Sparkles, Target, X,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useMemo, useState } from "react";
import { dateFromKey, localDateKey, shiftDateKey, TaskPriority, weekAround } from "@/lib/planner";
import type { RitmoTask } from "@/lib/task-db";

type Props = {
  tasks: RitmoTask[];
  loading: boolean;
  error: string | null;
  timerBusy: boolean;
  onPlan: (id: string, date: string | null, priority: TaskPriority, pomodoros: number) => Promise<void>;
  onReorder: (date: string, ids: string[]) => Promise<void>;
  onToggle: (id: string) => Promise<void>;
  onStartFocus: (id: string) => Promise<void>;
  onCreateTask: () => void;
};

const weekdays = new Intl.DateTimeFormat("it-IT", { weekday: "short" });
const fullDate = new Intl.DateTimeFormat("it-IT", { weekday: "long", day: "numeric", month: "long" });

export function DailyPlanner({ tasks, loading, error, timerBusy, onPlan, onReorder, onToggle, onStartFocus, onCreateTask }: Props) {
  const reduceMotion = useReducedMotion();
  const [selectedDate, setSelectedDate] = useState(localDateKey());
  const [planning, setPlanning] = useState<RitmoTask | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const days = weekAround(selectedDate);
  const dayTasks = useMemo(() => tasks.filter((task) => task.plannedDate === selectedDate).sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt - b.createdAt), [tasks, selectedDate]);
  const backlog = tasks.filter((task) => !task.completed && !task.plannedDate);
  const completed = dayTasks.filter((task) => task.completed).length;
  const progress = dayTasks.length ? Math.round(completed / dayTasks.length * 100) : 0;
  const plannedPomodoros = dayTasks.reduce((sum, task) => sum + task.estimatedPomodoros, 0);

  function feedback(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 2200);
  }

  async function moveTask(targetId: string) {
    if (!draggedId || draggedId === targetId) return;
    const ids = dayTasks.map((task) => task.id);
    const from = ids.indexOf(draggedId);
    const to = ids.indexOf(targetId);
    if (from < 0 || to < 0) return;
    ids.splice(to, 0, ids.splice(from, 1)[0]);
    setDraggedId(null);
    await onReorder(selectedDate, ids);
  }

  async function shiftTask(id: string, direction: -1 | 1) {
    const ids = dayTasks.map((task) => task.id);
    const from = ids.indexOf(id);
    const to = from + direction;
    if (to < 0 || to >= ids.length) return;
    [ids[from], ids[to]] = [ids[to], ids[from]];
    await onReorder(selectedDate, ids);
  }

  const spring = { duration: reduceMotion ? 0 : .24 };
  return <motion.div className="planner-page" initial={{ opacity: 0, y: reduceMotion ? 0 : 12 }} animate={{ opacity: 1, y: 0 }} transition={spring}>
    <header className="planner-header"><div><p className="eyebrow">PIANIFICA IL TUO RITMO</p><h1>Daily Planner</h1><p>Un giorno alla volta, con intenzione.</p></div><button className="button primary" onClick={onCreateTask}><Plus size={18} /> Nuova attività</button></header>
    {error && <div className="inline-error" role="alert">{error}</div>}

    <section className="planner-calendar card" aria-label="Calendario settimanale">
      <div className="planner-date-nav"><button onClick={() => setSelectedDate(shiftDateKey(selectedDate, -7))} aria-label="Settimana precedente"><ChevronLeft /></button><div><strong>{fullDate.format(dateFromKey(selectedDate))}</strong><button onClick={() => setSelectedDate(localDateKey())}>Oggi</button></div><input type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} aria-label="Scegli una data" /><button onClick={() => setSelectedDate(shiftDateKey(selectedDate, 7))} aria-label="Settimana successiva"><ChevronRight /></button></div>
      <div className="planner-week">{days.map((key) => { const date = dateFromKey(key); const count = tasks.filter((task) => task.plannedDate === key).length; return <button key={key} className={`${key === selectedDate ? "selected" : ""} ${key === localDateKey() ? "today" : ""}`} onClick={() => setSelectedDate(key)} aria-pressed={key === selectedDate}><small>{weekdays.format(date)}</small><strong>{date.getDate()}</strong><span>{count ? `${count} ${count === 1 ? "task" : "task"}` : "Libero"}</span></button>; })}</div>
    </section>

    <div className="planner-layout"><section className="planner-board card">
      <div className="planner-board-head"><div><span className="planner-icon"><CalendarDays size={19} /></span><div><h2>{selectedDate === localDateKey() ? "Oggi" : fullDate.format(dateFromKey(selectedDate))}</h2><p>{dayTasks.length} attività · {plannedPomodoros} pomodori pianificati</p></div></div><span className="planner-progress-label">{progress}% completato</span></div>
      <div className="planner-progress"><motion.i animate={{ width: `${progress}%` }} transition={spring} /></div>
      {loading ? <div className="planner-empty">Sincronizzazione del planner…</div> : dayTasks.length === 0 ? <div className="planner-empty"><Sparkles size={28} /><h3>Spazio libero, mente leggera</h3><p>Pianifica un’attività dal backlog per iniziare.</p>{backlog[0] && <button className="button secondary" onClick={() => setPlanning(backlog[0])}><Plus size={16} /> Pianifica attività</button>}</div> : <motion.div className="planner-task-list" layout>{dayTasks.map((task, index) => <motion.article layout key={task.id} draggable onDragStart={() => setDraggedId(task.id)} onDragEnd={() => setDraggedId(null)} onDragOver={(event) => event.preventDefault()} onDrop={() => void moveTask(task.id)} className={`planner-task ${task.completed ? "completed" : ""} ${draggedId === task.id ? "dragging" : ""}`}>
        <button className="drag-handle" aria-label={`Riordina ${task.title}`} title="Trascina per riordinare"><GripVertical size={18} /></button>
        <button className={`task-check ${task.completed ? "checked" : ""}`} onClick={() => void onToggle(task.id)} aria-label={task.completed ? `Riapri ${task.title}` : `Completa ${task.title}`}>{task.completed ? <Check size={16} /> : <Circle size={19} />}</button>
        <div className="planner-task-copy"><strong>{task.title}</strong><div><span className={`priority-pill ${task.priority.toLowerCase()}`}>{task.priority}</span><span>{task.category}</span><span><Clock3 size={13} /> {task.completedPomodoros}/{task.estimatedPomodoros}</span></div></div>
        <div className="planner-row-actions"><span className="order-buttons"><button disabled={index === 0} onClick={() => void shiftTask(task.id, -1)} aria-label="Sposta su">↑</button><button disabled={index === dayTasks.length - 1} onClick={() => void shiftTask(task.id, 1)} aria-label="Sposta giù">↓</button></span><button className="plan-edit" onClick={() => setPlanning(task)}>Modifica</button>{!task.completed && <button className="planner-play" disabled={timerBusy} onClick={async () => { await onStartFocus(task.id); feedback("Focus avviato dal Planner."); }} title={timerBusy ? "È già attivo un timer" : "Avvia Focus"}><Play size={15} fill="currentColor" /><span>{timerBusy ? "Timer attivo" : "Focus"}</span></button>}</div>
      </motion.article>)}</motion.div>}
    </section><aside className="planner-aside">
      <article className="card planner-kpi"><div className="section-title"><span><Target size={19} /> Avanzamento</span></div><div className="planner-donut" style={{ "--planner-progress": `${progress * 3.6}deg` } as React.CSSProperties}><strong>{progress}%</strong><small>{completed} di {dayTasks.length}</small></div><p>{plannedPomodoros} pomodori pianificati</p></article>
      <article className="card planner-backlog"><div className="section-title"><span><Inbox size={19} /> Da pianificare</span><b>{backlog.length}</b></div>{backlog.length ? <div>{backlog.slice(0, 5).map((task) => <button key={task.id} onClick={() => setPlanning(task)}><span className={`command-task-dot ${task.category.toLowerCase()}`} /><span><strong>{task.title}</strong><small>{task.category} · {task.estimatedPomodoros} pomodori</small></span><Plus size={16} /></button>)}</div> : <div className="backlog-empty"><Check size={19} /> Tutto pianificato</div>}</article>
    </aside></div>

    <AnimatePresence>{planning && <PlanDialog task={planning} defaultDate={selectedDate} onClose={() => setPlanning(null)} onSave={async (date, priority, pomodoros) => { await onPlan(planning.id, date, priority, pomodoros); setPlanning(null); feedback(date ? "Attività pianificata." : "Attività rimessa nel backlog."); }} />}{toast && <motion.div className="toast" role="status" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}><Check size={17} /> {toast}</motion.div>}</AnimatePresence>
  </motion.div>;
}

function PlanDialog({ task, defaultDate, onClose, onSave }: { task: RitmoTask; defaultDate: string; onClose: () => void; onSave: (date: string | null, priority: TaskPriority, pomodoros: number) => Promise<void> }) {
  const reduceMotion = useReducedMotion();
  const [date, setDate] = useState(task.plannedDate ?? defaultDate);
  const [priority, setPriority] = useState<TaskPriority>(task.priority);
  const [pomodoros, setPomodoros] = useState(task.estimatedPomodoros);
  const [saving, setSaving] = useState(false);
  return <motion.div className="dialog-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><motion.form className="plan-dialog card" role="dialog" aria-modal="true" aria-labelledby="plan-title" initial={{ opacity: 0, scale: reduceMotion ? 1 : .96, y: reduceMotion ? 0 : 14 }} animate={{ opacity: 1, scale: 1, y: 0 }} onSubmit={async (event) => { event.preventDefault(); setSaving(true); await onSave(date, priority, pomodoros); }}><div className="dialog-head"><div><p className="eyebrow">PIANIFICAZIONE</p><h2 id="plan-title">{task.title}</h2></div><button type="button" onClick={onClose} aria-label="Chiudi"><X size={19} /></button></div><label>Giorno<input type="date" required value={date} onChange={(event) => setDate(event.target.value)} /></label><label>Priorità<div className="priority-control">{(["Alta", "Media", "Bassa"] as TaskPriority[]).map((value) => <button type="button" key={value} className={priority === value ? `selected ${value.toLowerCase()}` : ""} onClick={() => setPriority(value)}>{value}</button>)}</div></label><label>Pomodori pianificati<div className="pomodoro-stepper"><button type="button" onClick={() => setPomodoros(Math.max(1, pomodoros - 1))}>−</button><strong>{pomodoros}</strong><button type="button" onClick={() => setPomodoros(Math.min(12, pomodoros + 1))}>+</button></div></label><div className="dialog-actions">{task.plannedDate && <button type="button" className="button tertiary" onClick={async () => { setSaving(true); await onSave(null, priority, pomodoros); }}>Rimuovi dal giorno</button>}<button type="button" className="button secondary" onClick={onClose}>Annulla</button><button className="button primary" disabled={saving}>{saving ? "Salvataggio…" : "Pianifica"}</button></div></motion.form></motion.div>;
}
