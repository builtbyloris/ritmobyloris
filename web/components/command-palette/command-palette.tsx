"use client";

import {
  AudioWaveform,
  BarChart3,
  CalendarDays,
  Check,
  CloudRain,
  CircleHelp,
  Focus,
  ListTodo,
  Maximize2,
  Moon,
  Palette,
  Pause,
  Play,
  Settings,
  Sparkles,
  Sun,
  VolumeX,
  Waves,
} from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import type { FocusSound } from "@/lib/focus-audio";
import type { TimerState } from "@/lib/pomodoro-db";
import type { RitmoPreferences, RitmoTheme } from "@/lib/preferences-db";
import type { RitmoTask } from "@/lib/task-db";

export type CommandSection = "focus" | "planner" | "tasks" | "statistics" | "settings" | "help";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  section: CommandSection;
  deepFocus: boolean;
  tasks: RitmoTask[];
  activeTask?: RitmoTask;
  timer: TimerState | null;
  preferences: RitmoPreferences | null;
  onNavigate: (section: CommandSection) => void;
  onToggleTimer: () => Promise<void>;
  onToggleDeepFocus: () => void;
  onSelectTask: (id: string) => Promise<void>;
  onThemeChange: (theme: RitmoTheme) => Promise<unknown>;
  onSoundChange: (sound: FocusSound) => Promise<unknown>;
};

const navigation = [
  { section: "focus", label: "Focus", description: "Apri timer e sessione corrente", icon: Focus, shortcut: "G F" },
  { section: "planner", label: "Planner", description: "Organizza attività e Pomodori per giorno", icon: CalendarDays, shortcut: "G P" },
  { section: "tasks", label: "Attività", description: "Organizza i tuoi task", icon: ListTodo, shortcut: "G A" },
  { section: "statistics", label: "Statistiche", description: "Consulta ritmo e cronologia", icon: BarChart3, shortcut: "G S" },
  { section: "settings", label: "Impostazioni", description: "Personalizza RITMO", icon: Settings, shortcut: "G I" },
  { section: "help", label: "Aiuto", description: "Rivedi procedure e tutorial", icon: CircleHelp, shortcut: "G H" },
] as const;

const themes: Array<{ value: RitmoTheme; label: string; icon: typeof Sun }> = [
  { value: "system", label: "Tema automatico", icon: Sparkles },
  { value: "light", label: "Tema chiaro", icon: Sun },
  { value: "dark", label: "Tema scuro", icon: Moon },
];

const sounds: Array<{ value: FocusSound; label: string; icon: typeof Waves }> = [
  { value: "off", label: "Sottofondo: silenzio", icon: VolumeX },
  { value: "rain", label: "Sottofondo: pioggia", icon: CloudRain },
  { value: "brown", label: "Sottofondo: rumore bruno", icon: AudioWaveform },
  { value: "waves", label: "Sottofondo: onde", icon: Waves },
];

export function CommandPalette({ open, onOpenChange, section, deepFocus, tasks, activeTask, timer, preferences, onNavigate, onToggleTimer, onToggleDeepFocus, onSelectTask, onThemeChange, onSoundChange }: Props) {
  const reduceMotion = useReducedMotion();
  const timerBusy = timer?.status !== "idle";
  const timerAction = timer?.status === "running" ? "Metti in pausa" : timer?.status === "paused" ? "Riprendi sessione" : timer?.mode === "focus" ? "Avvia Focus" : "Avvia pausa";
  const TimerIcon = timer?.status === "running" ? Pause : Play;

  function run(action: () => void | Promise<unknown>) {
    onOpenChange(false);
    void action();
  }

  return <CommandDialog open={open} onOpenChange={onOpenChange} title="Comandi RITMO" description="Cerca un comando o un’attività" className="ritmo-command-dialog" showCloseButton={false}>
    <motion.div className="command-palette-head" initial={{ opacity: 0, y: reduceMotion ? 0 : -5 }} animate={{ opacity: 1, y: 0 }}>
      <span className="command-orb"><Palette size={17} /></span>
      <div><strong>Comandi RITMO</strong><small>Vai ovunque, senza perdere il ritmo.</small></div>
      <kbd>⌘ K</kbd>
    </motion.div>
    <CommandInput placeholder="Cerca comandi o attività…" aria-label="Cerca comandi o attività" />
    <CommandList className="ritmo-command-list">
      <CommandEmpty><div className="command-empty"><Sparkles size={22} /><strong>Nessun risultato</strong><span>Prova con “focus”, “tema” o il nome di un’attività.</span></div></CommandEmpty>

      <CommandGroup heading="Azioni rapide">
        <CommandItem value={`${timerAction} timer pomodoro`} onSelect={() => run(onToggleTimer)} disabled={!timer}><span className="command-icon lavender"><TimerIcon size={17} /></span><span className="command-copy"><strong>{timerAction}</strong><small>{timer?.status === "running" ? "Il countdown e il sottofondo verranno sospesi" : activeTask?.title ?? "Focus libero"}</small></span><CommandShortcut>Space</CommandShortcut></CommandItem>
        <CommandItem value={`${deepFocus ? "Esci da" : "Attiva"} Deep Focus modalità immersiva`} onSelect={() => run(onToggleDeepFocus)} disabled={!timer || !preferences}><span className="command-icon amber"><Maximize2 size={17} /></span><span className="command-copy"><strong>{deepFocus ? "Esci da Deep Focus" : "Attiva Deep Focus"}</strong><small>Timer immersivo, senza distrazioni</small></span><CommandShortcut>⌘⇧D</CommandShortcut></CommandItem>
      </CommandGroup>

      <CommandSeparator />
      <CommandGroup heading="Navigazione">
        {navigation.map(({ section: target, label, description, icon: Icon, shortcut }) => <CommandItem key={target} value={`Vai a ${label} ${description}`} onSelect={() => run(() => onNavigate(target))}><span className="command-icon"><Icon size={17} /></span><span className="command-copy"><strong>{label}</strong><small>{description}</small></span>{section === target ? <span className="command-current"><Check size={13} /> Aperta</span> : <CommandShortcut>{shortcut}</CommandShortcut>}</CommandItem>)}
      </CommandGroup>

      {tasks.some((task) => !task.completed) ? <><CommandSeparator /><CommandGroup heading="Attività">
        {tasks.filter((task) => !task.completed).map((task) => <CommandItem key={task.id} value={`Attività ${task.title} ${task.category}`} keywords={[task.category, "task", "pomodoro"]} disabled={timerBusy && task.id !== timer?.taskId} onSelect={() => run(() => onSelectTask(task.id))}><span className={`command-task-dot ${task.category.toLowerCase()}`} /><span className="command-copy"><strong>{task.title}</strong><small>{task.category} · {task.completedPomodoros}/{task.estimatedPomodoros} pomodori</small></span>{task.id === timer?.taskId || task.isActive ? <span className="command-current"><Check size={13} /> Attiva</span> : timerBusy ? <CommandShortcut>Timer occupato</CommandShortcut> : <CommandShortcut>Invio</CommandShortcut>}</CommandItem>)}
      </CommandGroup></> : null}

      <CommandSeparator />
      <CommandGroup heading="Aspetto e suoni">
        {themes.map(({ value, label, icon: Icon }) => <CommandItem key={value} value={`${label} aspetto`} onSelect={() => run(() => onThemeChange(value))}><span className="command-icon"><Icon size={17} /></span><span className="command-copy"><strong>{label}</strong><small>{value === "system" ? "Segue le impostazioni del dispositivo" : `Usa sempre l’aspetto ${value === "light" ? "chiaro" : "scuro"}`}</small></span>{preferences?.theme === value ? <span className="command-current"><Check size={13} /> Attivo</span> : null}</CommandItem>)}
        {sounds.map(({ value, label, icon: Icon }) => <CommandItem key={value} value={`${label} audio concentrazione`} onSelect={() => run(() => onSoundChange(value))}><span className="command-icon"><Icon size={17} /></span><span className="command-copy"><strong>{label}</strong><small>{value === "off" ? "Disattiva l’atmosfera durante il Focus" : "Riproduci durante le sessioni Focus"}</small></span>{preferences?.focusSound === value ? <span className="command-current"><Check size={13} /> Attivo</span> : null}</CommandItem>)}
      </CommandGroup>
    </CommandList>
    <footer className="command-footer"><span><kbd>↑</kbd><kbd>↓</kbd> Naviga</span><span><kbd>↵</kbd> Esegui</span><span><kbd>Esc</kbd> Chiudi</span></footer>
  </CommandDialog>;
}
