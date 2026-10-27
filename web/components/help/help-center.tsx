"use client";

import {
  BarChart3, Bell, BookOpen, CalendarDays, CheckCircle2, CircleHelp,
  Clock3, Command, Focus, Headphones, ListTodo, Play, RotateCcw, Settings,
  Sparkles,
} from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

const guides = [
  {
    icon: CalendarDays,
    title: "Dalla lista alla giornata",
    description: "Quando hai molte cose da fare, segui sempre questo ordine.",
    steps: ["Crea l’attività e scegli una categoria.", "Apri Planner e assegnale giorno, priorità e Pomodori.", "Riordina la giornata lasciando in alto ciò che conta di più.", "Avvia Focus direttamente dall’attività pianificata."],
  },
  {
    icon: Focus,
    title: "Una sessione di Focus efficace",
    description: "Un piccolo rituale rende il timer più utile.",
    steps: ["Scegli un solo task concreto.", "Imposta il telefono in silenzioso e chiudi ciò che distrae.", "Avvia 25/5 o 50/10 e lavora fino al segnale.", "Durante la pausa alzati, respira e non iniziare un altro task."],
  },
  {
    icon: BarChart3,
    title: "Leggere i progressi",
    description: "Usa i dati per correggere il ritmo, non per giudicarti.",
    steps: ["Controlla i minuti di Focus e i giorni attivi.", "Confronta periodi simili: 7, 30 o 90 giorni.", "Osserva quali categorie assorbono più tempo.", "Ridimensiona i Pomodori stimati quando una previsione non è realistica."],
  },
] as const;

const reminders = [
  { icon: Clock3, title: "Il timer continua correttamente", copy: "RITMO usa timestamp reali: refresh, scheda inattiva e sospensione del Mac non accorciano la sessione." },
  { icon: CheckCircle2, title: "Conta solo ciò che completi", copy: "Reset e interruzioni anticipate non aggiungono Pomodori né minuti alle statistiche." },
  { icon: Headphones, title: "Il suono è un supporto", copy: "Scegli Pioggia, Ambient o Foresta a volume basso. Se distrae, torna al silenzio." },
  { icon: Bell, title: "Le notifiche richiedono permesso", copy: "Il browser può avvisarti a fine sessione solo quando è autorizzato; non sono garantite a browser chiuso." },
] as const;

export function HelpCenter({ onReplayTutorial }: { onReplayTutorial: () => void }) {
  const reduceMotion = useReducedMotion();
  return <motion.div className="help-page" initial={{ opacity: 0, y: reduceMotion ? 0 : 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduceMotion ? 0 : .24 }}>
    <header className="help-header"><div><p className="eyebrow">GUIDA RITMO</p><h1>Come possiamo aiutarti?</h1><p>Procedure brevi da consultare quando vuoi ritrovare il prossimo passo.</p></div><button className="button primary" onClick={onReplayTutorial}><Play size={17} fill="currentColor" /> Rivedi tutorial</button></header>

    <section className="help-start card"><div className="help-start-icon"><Sparkles size={25} /></div><div><h2>Il metodo RITMO in 4 passi</h2><p>Organizza l’attività, pianifica i Pomodori, concentrati su una cosa e usa i progressi per migliorare la stima successiva.</p></div><div className="help-flow"><span><ListTodo size={17} /> Crea</span><i>→</i><span><CalendarDays size={17} /> Pianifica</span><i>→</i><span><Focus size={17} /> Concentrati</span><i>→</i><span><BarChart3 size={17} /> Osserva</span></div></section>

    <div className="help-guide-grid">{guides.map((guide, guideIndex) => { const Icon = guide.icon; return <motion.article className="card help-guide" key={guide.title} initial={{ opacity: 0, y: reduceMotion ? 0 : 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: reduceMotion ? 0 : guideIndex * .06 }}><div className="help-guide-head"><span><Icon size={20} /></span><div><h2>{guide.title}</h2><p>{guide.description}</p></div></div><ol>{guide.steps.map((step, index) => <li key={step}><b>{index + 1}</b><span>{step}</span></li>)}</ol></motion.article>; })}</div>

    <section className="help-reminders"><div className="help-section-heading"><span><BookOpen size={20} /></span><div><h2>Da ricordare</h2><p>Le regole che proteggono dati e concentrazione.</p></div></div><div>{reminders.map(({ icon: Icon, title, copy }) => <article className="card help-reminder" key={title}><span><Icon size={19} /></span><div><h3>{title}</h3><p>{copy}</p></div></article>)}</div></section>

    <section className="card help-shortcuts"><div><Command size={21} /><h2>Scorciatoie e recupero rapido</h2></div><dl><div><dt><kbd>⌘ K</kbd><kbd>Ctrl K</kbd></dt><dd>Apri la Command Palette</dd></div><div><dt><kbd>⌘ ⇧ D</kbd><kbd>Ctrl ⇧ D</kbd></dt><dd>Attiva o chiudi Deep Focus</dd></div><div><dt><RotateCcw size={16} /></dt><dd>Resetta il timer senza registrare la sessione</dd></div><div><dt><Settings size={16} /></dt><dd>Modifica durate, obiettivo, tema, suoni e notifiche</dd></div></dl></section>

    <p className="help-footer-note"><CircleHelp size={16} /> Questa guida rimane sempre disponibile dal menu Aiuto.</p>
  </motion.div>;
}
