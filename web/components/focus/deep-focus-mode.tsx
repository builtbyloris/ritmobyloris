"use client";

import {
  Coffee,
  CloudRain,
  Focus,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  Search,
  Sparkles,
  Square,
  Trees,
  Volume2,
  VolumeX,
  Waves,
  X,
} from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import { unlockFocusAudio } from "@/lib/focus-audio";
import { unlockFeedbackAudio } from "@/lib/feedback";
import type { FocusSound } from "@/lib/focus-audio";
import type { TimerState } from "@/lib/pomodoro-db";
import type { RitmoPreferences } from "@/lib/preferences-db";
import type { RitmoTask } from "@/lib/task-db";

type Props = {
  timer: TimerState;
  time: string;
  seconds: number;
  progress: number;
  activeTask?: RitmoTask;
  preferences: RitmoPreferences;
  onStart: () => Promise<void>;
  onPause: () => Promise<void>;
  onTerminate: () => Promise<void>;
  onUpdatePreferences: (changes: Partial<Omit<RitmoPreferences, "id">>) => Promise<RitmoPreferences | undefined>;
  onOpenCommand: () => void;
  onExit: () => void;
};

const sounds: Array<{ value: FocusSound; label: string; icon: typeof Waves }> = [
  { value: "off", label: "Silenzio", icon: VolumeX },
  { value: "rain", label: "Pioggia", icon: CloudRain },
  { value: "brown", label: "Ambient", icon: Sparkles },
  { value: "waves", label: "Foresta", icon: Trees },
];

export function DeepFocusMode({ timer, time, seconds, progress, activeTask, preferences, onStart, onPause, onTerminate, onUpdatePreferences, onOpenCommand, onExit }: Props) {
  const reduceMotion = useReducedMotion();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const isBreak = timer.mode !== "focus";
  const isRunning = timer.status === "running";
  const finalCountdown = !isBreak && isRunning && seconds >= 1 && seconds <= 5;
  const modeLabel = timer.mode === "longBreak" ? "Pausa lunga" : timer.mode === "shortBreak" ? "Pausa breve" : "Deep Focus";

  useEffect(() => {
    const syncFullscreen = () => setIsFullscreen(document.fullscreenElement !== null);
    document.addEventListener("fullscreenchange", syncFullscreen);
    syncFullscreen();
    return () => document.removeEventListener("fullscreenchange", syncFullscreen);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || document.fullscreenElement) return;
      onExit();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onExit]);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      setIsFullscreen(false);
    }
  }, []);

  async function toggleTimer() {
    if (isRunning) await onPause();
    else {
      if (!isBreak) await Promise.all([unlockFocusAudio(), unlockFeedbackAudio()]);
      await onStart();
    }
  }

  async function chooseSound(sound: FocusSound) {
    if (sound !== "off" && isRunning && !isBreak) await unlockFocusAudio();
    await onUpdatePreferences({ focusSound: sound });
  }

  return <motion.main
    className={`deep-focus ${isBreak ? "break-mode" : ""}`}
    initial={{ opacity: 0, scale: reduceMotion ? 1 : 1.015 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: reduceMotion ? 1 : .99 }}
    transition={{ duration: reduceMotion ? 0 : .32, ease: [0.22, 1, 0.36, 1] }}
  >
    <div className="deep-ambient" aria-hidden="true"><i /><i /><i /></div>
    <header className="deep-header">
      <div className="deep-brand"><span className="brand-mark" /><span>R I T M O</span><b>DEEP FOCUS</b></div>
      <div className="deep-window-actions">
        <span className="deep-shortcut" aria-label="Scorciatoia Deep Focus">⌘⇧D</span>
        <button type="button" onClick={onOpenCommand} aria-label="Apri palette comandi" title="Comandi (⌘K)"><Search size={18} /></button>
        <button type="button" onClick={() => void toggleFullscreen()} aria-label={isFullscreen ? "Esci da schermo intero" : "Attiva schermo intero"} title={isFullscreen ? "Esci da schermo intero (Esc)" : "Schermo intero"}>{isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}</button>
        <button type="button" onClick={onExit} aria-label="Chiudi Deep Focus" title="Chiudi Deep Focus (Esc)"><X size={19} /></button>
      </div>
    </header>

    <section className="deep-stage" aria-label="Timer Deep Focus">
      <motion.div className="deep-status" layout transition={{ duration: reduceMotion ? 0 : .25 }}>
        {isBreak ? <Coffee size={16} /> : <Focus size={16} />}
        <span>{modeLabel}</span><i />
        <span>{isRunning ? "In corso" : timer.status === "paused" ? "In pausa" : "Pronto"}</span>
      </motion.div>

      <div className="deep-ring-wrap">
        <motion.div
          className={`deep-ring ${finalCountdown ? "countdown-warning" : ""}`}
          animate={{ "--deep-progress": `${Math.max(.008, progress) * 360}deg` } as never}
          transition={{ duration: reduceMotion ? 0 : .35, ease: "linear" }}
        >
          <div className="deep-ring-core">
            <span>{isBreak ? modeLabel : `${timer.preset} · ${timer.focusMinutes} min`}</span>
            <strong aria-live="off">{time}</strong>
            <small aria-live={finalCountdown ? "polite" : "off"}>{finalCountdown ? `PAUSA TRA ${seconds}` : isRunning ? "TEMPO RIMANENTE" : timer.status === "paused" ? "RESPIRA. RIPRENDI QUANDO VUOI." : "PRONTO QUANDO VUOI"}</small>
          </div>
        </motion.div>
      </div>

      <div className="deep-task">
        <small>ATTIVITÀ CORRENTE</small>
        <strong>{activeTask?.title ?? "Focus libero"}</strong>
        <span>{activeTask ? `${activeTask.category} · ${activeTask.completedPomodoros} di ${activeTask.estimatedPomodoros} pomodori` : "Nessuna attività collegata"}</span>
      </div>

      <div className="deep-controls">
        <button className="deep-primary" type="button" onClick={() => void toggleTimer()}>{isRunning ? <Pause size={19} fill="currentColor" /> : <Play size={19} fill="currentColor" />}{isRunning ? "Pausa" : timer.status === "paused" ? "Riprendi" : isBreak ? "Inizia pausa" : "Avvia focus"}</button>
        {timer.status !== "idle" ? <button className="deep-secondary" type="button" onClick={() => void onTerminate()}><Square size={15} fill="currentColor" /> Termina</button> : null}
      </div>
    </section>

    <aside className="deep-audio" aria-label="Sottofondo Focus">
      <div className="deep-audio-heading"><span><Volume2 size={17} /> Sottofondo</span><small>{isBreak ? "Disponibile durante il Focus" : isRunning ? "In riproduzione sul dispositivo" : "Si avvia insieme al timer"}</small></div>
      <div className="deep-sounds">{sounds.map(({ value, label, icon: Icon }) => <button type="button" key={value} className={preferences.focusSound === value ? "active" : ""} aria-label={`Sottofondo: ${label}`} aria-pressed={preferences.focusSound === value} onClick={() => void chooseSound(value)}><Icon size={17} /><span>{label}</span></button>)}</div>
      <label className={`deep-volume ${preferences.focusSound === "off" ? "disabled" : ""}`}><VolumeX size={15} /><input type="range" min="0" max="1" step="0.05" aria-label="Volume del sottofondo" disabled={preferences.focusSound === "off"} value={preferences.focusSoundVolume} onChange={(event) => void onUpdatePreferences({ focusSoundVolume: Number(event.target.value) })} /><Volume2 size={17} /><span>{Math.round(preferences.focusSoundVolume * 100)}%</span></label>
    </aside>
  </motion.main>;
}
