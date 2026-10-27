"use client";

import {
  BarChart3, CalendarDays, Check, ChevronLeft, ChevronRight, Focus,
  Headphones, Sparkles, X,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";

const steps = [
  {
    eyebrow: "BENVENUTO IN RITMO",
    title: "Trova il tuo ritmo.",
    description: "RITMO trasforma ciò che vuoi fare in un percorso semplice: pianifica, concentrati e osserva i tuoi progressi.",
    icon: Sparkles,
    accent: "lavender",
    points: ["I tuoi dati restano associati al tuo account", "Puoi cambiare tema e durate in ogni momento"],
  },
  {
    eyebrow: "1 · ORGANIZZA",
    title: "Crea e pianifica le attività",
    description: "Aggiungi un’attività, assegna categoria e priorità, poi trascinala nel Daily Planner sul giorno giusto.",
    icon: CalendarDays,
    accent: "amber",
    points: ["Stima da 1 a 12 Pomodori", "Riordina la giornata in base alle priorità"],
  },
  {
    eyebrow: "2 · CONCENTRATI",
    title: "Collega un task al Focus",
    description: "Avvia il timer dal Planner o dal Task Manager. Alla fine della sessione RITMO aggiorna automaticamente attività e statistiche.",
    icon: Focus,
    accent: "lavender",
    points: ["Scegli 25/5, 50/10 o un preset personale", "Le sessioni interrotte non vengono conteggiate"],
  },
  {
    eyebrow: "3 · PROTEGGI L’ATTENZIONE",
    title: "Entra in Deep Focus",
    description: "Nascondi tutto ciò che non serve, scegli un sottofondo e lascia al centro soltanto il timer e il prossimo passo.",
    icon: Headphones,
    accent: "amber",
    points: ["Apri Deep Focus con ⌘⇧D o Ctrl+Shift+D", "Pioggia, ambient e foresta sono tracce originali riprodotte localmente"],
  },
  {
    eyebrow: "4 · IMPARA DAL RITMO",
    title: "Rivedi i progressi",
    description: "Statistiche e cronologia mostrano il tempo investito davvero. Se dimentichi un passaggio, la sezione Aiuto rimane sempre disponibile.",
    icon: BarChart3,
    accent: "lavender",
    points: ["Confronta 7, 30 e 90 giorni", "Riapri questo tutorial dalla sezione Aiuto"],
  },
] as const;

export function OnboardingTour({ open, onComplete }: { open: boolean; onComplete: () => void }) {
  const reduceMotion = useReducedMotion();
  const [step, setStep] = useState(0);
  const dialog = useRef<HTMLElement>(null);
  const nextButton = useRef<HTMLButtonElement>(null);
  const item = steps[step];
  const Icon = item.icon;
  const last = step === steps.length - 1;
  function finish() {
    setStep(0);
    onComplete();
  }

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setStep(0);
        onComplete();
      }
      if (event.key === "ArrowRight") setStep((current) => Math.min(steps.length - 1, current + 1));
      if (event.key === "ArrowLeft") setStep((current) => Math.max(0, current - 1));
      if (event.key === "Tab") {
        const focusable = Array.from(dialog.current?.querySelectorAll<HTMLElement>("button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex='-1'])") ?? []);
        const first = focusable[0];
        const last = focusable.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.requestAnimationFrame(() => previousFocus?.isConnected && previousFocus.focus({ preventScroll: true }));
    };
  }, [open, onComplete]);

  useEffect(() => {
    if (open) nextButton.current?.focus({ preventScroll: true });
  }, [open, step]);

  return <AnimatePresence>{open ? <motion.div className="tour-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduceMotion ? 0 : .2 }}>
    <motion.section ref={dialog} className="tour-dialog" role="dialog" aria-modal="true" aria-labelledby="tour-title" initial={{ opacity: 0, scale: reduceMotion ? 1 : .96, y: reduceMotion ? 0 : 18 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: reduceMotion ? 1 : .98 }} transition={{ type: reduceMotion ? "tween" : "spring", stiffness: 340, damping: 30 }}>
      <button className="tour-close" onClick={finish} aria-label="Chiudi tutorial"><X size={18} /></button>
      <div className={`tour-visual ${item.accent}`}><motion.div key={step} initial={{ opacity: 0, scale: reduceMotion ? 1 : .82, rotate: reduceMotion ? 0 : -8 }} animate={{ opacity: 1, scale: 1, rotate: 0 }}><Icon size={38} /></motion.div><span /><span /></div>
      <div className="tour-content"><p className="eyebrow">{item.eyebrow}</p><motion.div key={item.title} initial={{ opacity: 0, x: reduceMotion ? 0 : 12 }} animate={{ opacity: 1, x: 0 }}><h2 id="tour-title">{item.title}</h2><p>{item.description}</p><ul>{item.points.map((point) => <li key={point}><Check size={15} /> {point}</li>)}</ul></motion.div></div>
      <footer className="tour-footer"><div className="tour-dots" role="group" aria-label={`Passaggio ${step + 1} di ${steps.length}`}>{steps.map((_, index) => <button key={index} className={index === step ? "active" : ""} onClick={() => setStep(index)} aria-label={`Vai al passaggio ${index + 1}`} aria-current={index === step ? "step" : undefined} />)}</div><div className="tour-actions">{step === 0 ? <button className="tour-skip" onClick={finish}>Salta tutorial</button> : <button className="tour-back" onClick={() => setStep((current) => current - 1)}><ChevronLeft size={17} /> Indietro</button>}<button ref={nextButton} className="button primary" onClick={() => last ? finish() : setStep((current) => current + 1)}>{last ? "Inizia con RITMO" : "Continua"}{last ? <Check size={17} /> : <ChevronRight size={17} />}</button></div></footer>
    </motion.section>
  </motion.div> : null}</AnimatePresence>;
}
