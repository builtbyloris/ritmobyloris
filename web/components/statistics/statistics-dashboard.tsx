"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { CalendarDays, CheckCircle2, Clock3, Focus, History, Target, TimerReset, TrendingDown, TrendingUp } from "lucide-react";
import { AnalyticsRange, buildAnalytics, percentChange } from "@/lib/analytics";
import type { FocusSession } from "@/lib/pomodoro-db";
import type { RitmoTask } from "@/lib/task-db";

const ranges: AnalyticsRange[] = [7, 30, 90];
const categoryColors: Record<string, string> = { Studio: "var(--amber)", Lavoro: "var(--lavender-soft)", Personale: "#8790ae", "Focus libero": "#5fc3c8" };

export function StatisticsDashboard({ sessions, tasks, dailyGoal }: { sessions: FocusSession[]; tasks: RitmoTask[]; dailyGoal: number }) {
  const reduceMotion = useReducedMotion();
  const [range, setRange] = useState<AnalyticsRange>(7);
  const [trendHover, setTrendHover] = useState<number | null>(null);
  const analytics = useMemo(() => buildAnalytics(sessions, tasks, range), [range, sessions, tasks]);
  const maxMinutes = Math.max(1, ...analytics.trend.map((point) => point.minutes));
  const donut = donutGradient(analytics.categories);

  const comparisons = analytics.comparison ? {
    focus: percentChange(analytics.focusMinutes, analytics.comparison.focusMinutes),
    sessions: percentChange(analytics.completedPomodoros, analytics.comparison.completedPomodoros),
    days: percentChange(analytics.activeDays, analytics.comparison.activeDays),
    tasks: percentChange(analytics.completedTasks, analytics.comparison.completedTasks),
  } : null;

  return <motion.div className="analytics-page" initial={{ opacity: 0, y: reduceMotion ? 0 : 10 }} animate={{ opacity: 1, y: 0 }}>
    <header className="analytics-header"><div><p className="eyebrow">STATISTICHE REALI</p><h1>Il tuo ritmo nel tempo</h1><p>I progressi delle tue sessioni sincronizzate. Obiettivo quotidiano: {dailyGoal} sessioni.</p></div><div className="range-control" aria-label="Intervallo statistiche">{ranges.map((value) => <button key={value} className={range === value ? "active" : ""} aria-pressed={range === value} onClick={() => { setRange(value); setTrendHover(null); }}>{value} giorni</button>)}</div></header>

    <section className="analytics-kpis">
      <MetricCard icon={Clock3} label="Tempo di focus" value={formatMinutes(analytics.focusMinutes)} change={comparisons?.focus} tone="amber" />
      <MetricCard icon={Target} label="Pomodori completati" value={String(analytics.completedPomodoros)} change={comparisons?.sessions} tone="lavender" />
      <MetricCard icon={CalendarDays} label="Giorni attivi" value={`${analytics.activeDays} su ${range}`} change={comparisons?.days} tone="neutral" />
      <MetricCard icon={CheckCircle2} label="Attività completate" value={String(analytics.completedTasks)} change={comparisons?.tasks} tone="amber" />
    </section>

    {analytics.sessions.length === 0 ? <EmptyAnalytics range={range} /> : <>
      <section className="analytics-grid">
        <article className="card focus-trend-card"><div className="analytics-card-title"><div><h2>Andamento del focus</h2><p>Minuti registrati nel periodo</p></div><span>{formatMinutes(analytics.focusMinutes)}</span></div><div className="focus-trend-chart" role="img" aria-label={`Andamento focus negli ultimi ${range} giorni`}>{analytics.trend.map((point, index) => <button key={`${point.label}-${index}`} className="trend-column" onMouseEnter={() => setTrendHover(index)} onMouseLeave={() => setTrendHover(null)} onFocus={() => setTrendHover(index)} onBlur={() => setTrendHover(null)} aria-label={`${point.longLabel}: ${point.minutes} minuti, ${point.sessions} sessioni`}><AnimatePresence>{trendHover === index && <motion.span className="chart-tooltip" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}><strong>{point.minutes} min</strong><small>{point.sessions} {point.sessions === 1 ? "sessione" : "sessioni"}</small></motion.span>}</AnimatePresence><span className="trend-track"><motion.i initial={{ height: 0 }} animate={{ height: `${Math.max(3, point.minutes / maxMinutes * 100)}%` }} transition={{ duration: reduceMotion ? 0 : .55, delay: reduceMotion ? 0 : index * .035 }} /></span><small>{point.label}</small></button>)}</div></article>

        <article className="card category-card"><div className="analytics-card-title"><div><h2>Sessioni per categoria</h2><p>Distribuzione del focus</p></div></div><div className="category-content"><div className="category-donut" style={{ background: donut }}><div><strong>{formatMinutes(analytics.focusMinutes)}</strong><small>totali</small></div></div><div className="category-legend">{analytics.categories.map((item) => <div key={item.category} title={`${item.sessions} sessioni · ${item.minutes} minuti`}><i style={{ background: categoryColors[item.category] }} /><p><strong>{item.category}</strong><small>{formatMinutes(item.minutes)}</small></p><span>{item.percentage}%</span></div>)}</div></div></article>

        <article className="card frequent-card"><div className="analytics-card-title"><div><h2>Attività più frequenti</h2><p>Ordinate per sessioni completate</p></div></div><div className="frequent-list">{analytics.activities.map((activity, index) => <motion.div key={activity.title} initial={{ opacity: 0, x: reduceMotion ? 0 : -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: reduceMotion ? 0 : index * .05 }} title={`${activity.sessions} sessioni · ${activity.minutes} minuti`}><span>{index + 1}</span><p><strong>{activity.title}</strong><small>{formatMinutes(activity.minutes)}</small></p><div><i style={{ width: `${Math.max(8, activity.sessions / Math.max(1, analytics.activities[0]?.sessions ?? 1) * 100)}%` }} /></div><b>{activity.sessions}</b></motion.div>)}</div></article>
      </section>
      <SessionHistory sessions={analytics.sessions} />
    </>}
  </motion.div>;
}

function MetricCard({ icon: Icon, label, value, change, tone }: { icon: typeof Clock3; label: string; value: string; change?: number | null; tone: string }) {
  return <article className={`card analytics-metric ${tone}`}><span><Icon size={22} /></span><div><small>{label}</small><strong>{value}</strong>{change !== undefined && change !== null && <p className={change >= 0 ? "positive" : "negative"}>{change >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}{change > 0 ? "+" : ""}{change}% rispetto al periodo precedente</p>}</div></article>;
}

function EmptyAnalytics({ range }: { range: AnalyticsRange }) {
  return <article className="card analytics-empty"><div><TimerReset size={30} /></div><h2>Nessuna sessione negli ultimi {range} giorni</h2><p>Completa un Focus per iniziare a visualizzare andamento, categorie e attività frequenti.</p></article>;
}

function SessionHistory({ sessions }: { sessions: FocusSession[] }) {
  return <article className="card analytics-history"><div className="analytics-card-title"><div><h2><History size={20} /> Cronologia sessioni</h2><p>{sessions.length} {sessions.length === 1 ? "sessione registrata" : "sessioni registrate"}</p></div></div><div className="history-table"><div className="history-table-head"><span>Attività</span><span>Data</span><span>Durata</span><span>Stato</span></div>{sessions.map((session) => <div className="analytics-session-row" key={session.id}><span className="session-activity"><i><Focus size={16} /></i><p><strong>{session.taskTitle || "Attività eliminata"}</strong><small>{session.category ?? "Focus libero"}</small></p></span><time>{formatSessionDate(session.completedAt)}</time><b>{session.durationMinutes} min</b><em><CheckCircle2 size={13} /> Completata</em></div>)}</div></article>;
}

function donutGradient(categories: ReturnType<typeof buildAnalytics>["categories"]) {
  if (!categories.length) return "conic-gradient(var(--track) 0 100%)";
  let cursor = 0;
  const stops = categories.map((item) => { const start = cursor; cursor += item.percentage; return `${categoryColors[item.category]} ${start}% ${cursor}%`; });
  return `conic-gradient(${stops.join(", ")})`;
}

function formatMinutes(minutes: number) { const hours = Math.floor(minutes / 60); const rest = minutes % 60; return hours ? `${hours}h${rest ? ` ${rest}m` : ""}` : `${rest} min`; }
function formatSessionDate(timestamp: number) { return new Intl.DateTimeFormat("it-IT", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(timestamp)); }
