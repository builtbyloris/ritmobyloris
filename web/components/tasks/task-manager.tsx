"use client";

import {
  Check, ChevronLeft, ChevronRight, Clock3, Edit3, ListPlus,
  Play, Plus, Target, Trash2, X,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { FormEvent, useState } from "react";
import { RitmoTask, TaskCategory } from "@/lib/task-db";

type TaskInput = {
  title: string;
  category: TaskCategory;
  estimatedPomodoros: number;
  completedPomodoros: number;
};

type Props = {
  tasks: RitmoTask[];
  loading: boolean;
  error: string | null;
  timerBusy: boolean;
  onCreate: (input: TaskInput) => Promise<RitmoTask>;
  onUpdate: (id: string, input: TaskInput) => Promise<void>;
  onToggle: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onStartFocus: (id: string) => Promise<void>;
};

const categories: TaskCategory[] = ["Studio", "Lavoro", "Personale"];

export function TaskManager({ tasks, loading, error, timerBusy, onCreate, onUpdate, onToggle, onDelete, onStartFocus }: Props) {
  const reduceMotion = useReducedMotion();
  const [editing, setEditing] = useState<RitmoTask | "new" | null>(null);
  const [deleting, setDeleting] = useState<RitmoTask | null>(null);
  const [quickTitle, setQuickTitle] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  const completedCount = tasks.filter((task) => task.completed).length;
  const progress = tasks.length ? Math.round((completedCount / tasks.length) * 100) : 0;
  const suggested = tasks.find((task) => task.isActive && !task.completed) ?? tasks.find((task) => !task.completed);
  const today = tasks.slice(0, 4);
  const later = tasks.slice(4);

  function feedback(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 2400);
  }

  async function submitQuickAdd(event: FormEvent) {
    event.preventDefault();
    const title = quickTitle.trim();
    if (title.length < 2) {
      feedback("Inserisci almeno 2 caratteri.");
      return;
    }
    await onCreate({ title, category: "Studio", estimatedPomodoros: 1, completedPomodoros: 0 });
    setQuickTitle("");
    feedback("Attività aggiunta.");
  }

  async function confirmDelete() {
    if (!deleting) return;
    await onDelete(deleting.id);
    setDeleting(null);
    feedback("Attività eliminata.");
  }

  const animation = reduceMotion ? { duration: 0 } : { type: "spring" as const, stiffness: 330, damping: 28 };

  return (
    <motion.div className="tasks-page" initial={{ opacity: 0, y: reduceMotion ? 0 : 14 }} animate={{ opacity: 1, y: 0 }} transition={animation}>
      <header className="tasks-header">
        <div>
          <p className="eyebrow">ORGANIZZA IL TUO RITMO</p>
          <h1>Le tue attività</h1>
          <p>Organizza, scegli, concentrati.</p>
        </div>
        <button className="button primary new-task-button" onClick={() => setEditing("new")}><Plus size={19} /> Nuova attività</button>
      </header>

      {error && <div className="inline-error" role="alert">{error}</div>}

      <div className="tasks-layout">
        <section className="task-board card">
          <div className="task-board-head">
            <div><strong>Oggi</strong><span>· {today.length} attività</span></div>
            <div className="date-switcher"><button disabled aria-label="Giorno precedente non disponibile"><ChevronLeft size={16} /></button><span>Oggi</span><button disabled aria-label="Giorno successivo non disponibile"><ChevronRight size={16} /></button></div>
          </div>

          {loading ? (
            <TaskSkeleton />
          ) : tasks.length === 0 ? (
            <EmptyTasks onCreate={() => setEditing("new")} />
          ) : (
            <>
              <motion.div className="task-table" layout>
                <AnimatePresence initial={false}>
                  {today.map((task) => <TaskTableRow key={task.id} task={task} timerBusy={timerBusy} onToggle={onToggle} onEdit={() => setEditing(task)} onDelete={() => setDeleting(task)} onStart={onStartFocus} />)}
                </AnimatePresence>
              </motion.div>

              {later.length > 0 && (
                <div className="later-group">
                  <div className="task-group-title"><strong>In seguito</strong><span>· {later.length} attività</span></div>
                  <motion.div className="task-table" layout>
                    <AnimatePresence initial={false}>
                      {later.map((task) => <TaskTableRow key={task.id} task={task} timerBusy={timerBusy} onToggle={onToggle} onEdit={() => setEditing(task)} onDelete={() => setDeleting(task)} onStart={onStartFocus} />)}
                    </AnimatePresence>
                  </motion.div>
                </div>
              )}
            </>
          )}
        </section>

        <aside className="task-aside">
          <article className="card progress-card">
            <div className="section-title"><span><Target size={19} /> Progressi di oggi</span></div>
            <div className="progress-body">
              <div className="progress-donut" style={{ "--task-progress": `${progress * 3.6}deg` } as React.CSSProperties}><span>{progress}%</span></div>
              <div><strong>{completedCount} di {tasks.length}</strong><p>completate</p></div>
            </div>
            <div className="linear-progress"><i style={{ width: `${progress}%` }} /></div>
          </article>

          <article className="card suggestion-card">
            <div className="section-title"><span><Target size={19} /> Sessione consigliata</span></div>
            {suggested ? (
              <>
                <h2>{suggested.title}</h2>
                <div className="suggestion-meta"><span className={`category-chip ${suggested.category.toLowerCase()}`}>{suggested.category}</span><span><Clock3 size={14} /> {suggested.estimatedPomodoros} pomodori</span></div>
                <button className="button amber-button" disabled={timerBusy} title={timerBusy ? "È già attivo un timer" : undefined} onClick={async () => { await onStartFocus(suggested.id); feedback("Attività collegata al timer."); }}><Play size={17} fill="currentColor" /> {timerBusy ? "Timer già attivo" : "Avvia focus"}</button>
              </>
            ) : <p className="muted-copy">Completa: non ci sono sessioni in attesa.</p>}
          </article>

          <article className="card quick-add-card">
            <div className="section-title"><span><ListPlus size={19} /> Inserimento rapido</span></div>
            <form onSubmit={submitQuickAdd}>
              <input value={quickTitle} onChange={(event) => setQuickTitle(event.target.value)} placeholder="Scrivi una nuova attività…" maxLength={80} aria-label="Titolo nuova attività" />
              <button type="submit" aria-label="Aggiungi attività"><ChevronRight size={19} /></button>
            </form>
          </article>
        </aside>
      </div>

      <AnimatePresence>
        {editing && <TaskDialog task={editing === "new" ? null : editing} onClose={() => setEditing(null)} onSave={async (input) => { if (editing === "new") { await onCreate(input); feedback("Attività creata."); } else { await onUpdate(editing.id, input); feedback("Modifiche salvate."); } setEditing(null); }} />}
        {deleting && <ConfirmDelete task={deleting} onCancel={() => setDeleting(null)} onConfirm={confirmDelete} />}
        {toast && <motion.div className="toast" role="status" initial={{ opacity: 0, y: reduceMotion ? 0 : 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: reduceMotion ? 0 : 8 }} transition={animation}><Check size={17} /> {toast}</motion.div>}
      </AnimatePresence>
    </motion.div>
  );
}

function TaskTableRow({ task, timerBusy, onToggle, onEdit, onDelete, onStart }: { task: RitmoTask; timerBusy: boolean; onToggle: (id: string) => Promise<void>; onEdit: () => void; onDelete: () => void; onStart: (id: string) => Promise<void> }) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div layout exit={{ opacity: 0, height: 0 }} transition={{ duration: reduceMotion ? 0 : .22 }} className={`manager-task-row ${task.isActive ? "active" : ""}`}>
      <button className={`task-check ${task.completed ? "checked" : ""}`} onClick={() => onToggle(task.id)} aria-label={task.completed ? `Riapri ${task.title}` : `Completa ${task.title}`}>{task.completed && <Check size={17} />}</button>
      <div className="manager-task-title"><strong className={task.completed ? "completed" : ""}>{task.title}</strong><span className={`category-chip ${task.category.toLowerCase()}`}>{task.category}</span></div>
      <span className="pomodoro-count"><Clock3 size={15} /> {task.completedPomodoros}/{task.estimatedPomodoros}</span>
      <div className="row-actions">
        {!task.completed && <button className={`start-focus-button ${task.isActive ? "selected" : ""}`} disabled={timerBusy} title={timerBusy ? "È già attivo un timer" : undefined} onClick={() => onStart(task.id)}><Play size={14} fill="currentColor" /> {timerBusy ? "Timer attivo" : task.isActive ? "In focus" : "Avvia focus"}</button>}
        <button className="row-icon-button" onClick={onEdit} aria-label={`Modifica ${task.title}`}><Edit3 size={16} /></button>
        <button className="row-icon-button danger" onClick={onDelete} aria-label={`Elimina ${task.title}`}><Trash2 size={16} /></button>
      </div>
    </motion.div>
  );
}

function TaskDialog({ task, onClose, onSave }: { task: RitmoTask | null; onClose: () => void; onSave: (input: TaskInput) => Promise<void> }) {
  const reduceMotion = useReducedMotion();
  const [title, setTitle] = useState(task?.title ?? "");
  const [category, setCategory] = useState<TaskCategory>(task?.category ?? "Studio");
  const [estimated, setEstimated] = useState(task?.estimatedPomodoros ?? 1);
  const [completed, setCompleted] = useState(task?.completedPomodoros ?? 0);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const cleanTitle = title.trim();
    if (cleanTitle.length < 2) { setFormError("Il titolo deve contenere almeno 2 caratteri."); return; }
    if (estimated < 1 || estimated > 12) { setFormError("Scegli da 1 a 12 pomodori stimati."); return; }
    if (completed < 0 || completed > estimated) { setFormError("I pomodori completati non possono superare quelli stimati."); return; }
    setSaving(true);
    await onSave({ title: cleanTitle, category, estimatedPomodoros: estimated, completedPomodoros: completed });
  }

  return (
    <motion.div className="dialog-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduceMotion ? 0 : .18 }} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <motion.form className="task-dialog card" role="dialog" aria-modal="true" aria-labelledby="task-dialog-title" onSubmit={submit} initial={{ opacity: 0, scale: reduceMotion ? 1 : .96, y: reduceMotion ? 0 : 18 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: reduceMotion ? 1 : .98 }} transition={{ duration: reduceMotion ? 0 : .2 }}>
        <div className="dialog-head"><div><p className="eyebrow">ATTIVITÀ</p><h2 id="task-dialog-title">{task ? "Modifica attività" : "Nuova attività"}</h2></div><button type="button" onClick={onClose} aria-label="Chiudi"><X size={19} /></button></div>
        <label>Titolo<input autoFocus value={title} onChange={(event) => { setTitle(event.target.value); setFormError(""); }} maxLength={80} placeholder="Cosa vuoi portare a termine?" /></label>
        <label>Categoria<select value={category} onChange={(event) => setCategory(event.target.value as TaskCategory)}>{categories.map((item) => <option key={item}>{item}</option>)}</select></label>
        <div className="form-columns">
          <label>Pomodori stimati<input type="number" min="1" max="12" value={estimated} onChange={(event) => setEstimated(Number(event.target.value))} /></label>
          <label>Completati<input type="number" min="0" max={estimated} value={completed} onChange={(event) => setCompleted(Number(event.target.value))} /></label>
        </div>
        {formError && <p className="form-error" role="alert">{formError}</p>}
        <div className="dialog-actions"><button type="button" className="button secondary" onClick={onClose}>Annulla</button><button type="submit" className="button primary" disabled={saving}>{saving ? "Salvataggio…" : task ? "Salva modifiche" : "Crea attività"}</button></div>
      </motion.form>
    </motion.div>
  );
}

function ConfirmDelete({ task, onCancel, onConfirm }: { task: RitmoTask; onCancel: () => void; onConfirm: () => Promise<void> }) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div className="dialog-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div className="confirm-dialog card" role="alertdialog" aria-modal="true" aria-labelledby="delete-dialog-title" initial={{ opacity: 0, scale: reduceMotion ? 1 : .96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
        <div className="danger-icon"><Trash2 size={23} /></div><h2 id="delete-dialog-title">Eliminare l’attività?</h2><p>“{task.title}” verrà rimossa dai dati locali.</p>
        <div className="dialog-actions"><button className="button secondary" onClick={onCancel}>Annulla</button><button className="button delete-button" onClick={onConfirm}>Elimina</button></div>
      </motion.div>
    </motion.div>
  );
}

function EmptyTasks({ onCreate }: { onCreate: () => void }) {
  return <div className="empty-state"><div><ListPlus size={28} /></div><h2>La giornata è libera</h2><p>Crea la prima attività e scegli il prossimo passo.</p><button className="button primary" onClick={onCreate}><Plus size={17} /> Crea attività</button></div>;
}

function TaskSkeleton() {
  return <div className="task-skeleton" aria-label="Caricamento attività">{[0, 1, 2, 3].map((item) => <i key={item} />)}</div>;
}
