"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { AudioWaveform, Bell, Check, CloudRain, Clock3, Database, Download, Minus, Moon, Palette, Play, Plus, ShieldCheck, Sparkles, Sun, Target, Volume2, VolumeX, Waves } from "lucide-react";
import type { FocusSound } from "@/lib/focus-audio";
import type { RitmoPreferences, RitmoPreset, RitmoTheme } from "@/lib/preferences-db";
import type { TimerState } from "@/lib/pomodoro-db";
import { RITMO_PALETTES, type RitmoPalette } from "@/lib/visual-theme";

type Props = {
  preferences: RitmoPreferences | null;
  palette: RitmoPalette;
  error: string | null;
  notificationPermission: "unsupported" | NotificationPermission;
  timer: TimerState | null;
  onUpdate: (changes: Partial<Omit<RitmoPreferences, "id">>) => Promise<RitmoPreferences | undefined>;
  onPaletteChange: (palette: RitmoPalette) => void;
  onRequestNotifications: () => Promise<"unsupported" | NotificationPermission>;
  onTestSound: () => Promise<boolean>;
  onPreviewFocusSound: () => Promise<boolean>;
  onExport: () => Promise<{ tasks: number; sessions: number }>;
};

const presets: Array<{ label: RitmoPreset; focus: number; short: number; long: number }> = [
  { label: "25 / 5", focus: 25, short: 5, long: 15 },
  { label: "50 / 10", focus: 50, short: 10, long: 20 },
  { label: "Personalizzato", focus: 35, short: 8, long: 18 },
];

const focusSounds: Array<{ value: FocusSound; label: string; description: string; icon: typeof Waves }> = [
  { value: "off", label: "Silenzio", description: "Nessun sottofondo", icon: VolumeX },
  { value: "rain", label: "Pioggia", description: "Leggera e uniforme", icon: CloudRain },
  { value: "brown", label: "Rumore bruno", description: "Profondo e avvolgente", icon: AudioWaveform },
  { value: "waves", label: "Onde", description: "Lente e rilassanti", icon: Waves },
];

const paletteGroups = [
  { kind: "gradient", label: "Sfumati", description: "Luce ambientale e passaggi morbidi" },
  { kind: "texture", label: "Texture", description: "Superfici discrete e materiche" },
] as const;

export function SettingsDashboard({ preferences, palette, error, notificationPermission, timer, onUpdate, onPaletteChange, onRequestNotifications, onTestSound, onPreviewFocusSound, onExport }: Props) {
  const reduceMotion = useReducedMotion();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (!preferences) return <div className="focus-loading"><Clock3 className="spin" /> Caricamento preferenze locali…</div>;

  async function update(changes: Partial<Omit<RitmoPreferences, "id">>, message = "Preferenze salvate") {
    await onUpdate(changes);
    setFeedback(message);
    window.setTimeout(() => setFeedback(null), 2400);
  }
  async function choosePreset(preset: typeof presets[number]) {
    const changes = preset.label === "Personalizzato" ? { preset: preset.label } : { preset: preset.label, focusMinutes: preset.focus, shortBreakMinutes: preset.short, longBreakMinutes: preset.long };
    await update(changes, `${preset.label} selezionato`);
  }
  async function authorize() {
    setBusy(true);
    try { const result = await onRequestNotifications(); setFeedback(result === "granted" ? "Notifiche autorizzate" : result === "denied" ? "Autorizzazione negata dal browser" : "Notifiche non supportate"); } finally { setBusy(false); }
  }
  async function testSound() { setBusy(true); try { setFeedback(await onTestSound() ? "Suono riprodotto" : "Audio non disponibile nel browser"); } finally { setBusy(false); } }
  async function previewFocusSound() { setBusy(true); try { setFeedback(await onPreviewFocusSound() ? "Anteprima avviata per 4 secondi" : "Scegli un suono da ascoltare"); } finally { setBusy(false); } }
  async function exportData() { setBusy(true); try { const result = await onExport(); setFeedback(`Esportati ${result.tasks} task e ${result.sessions} sessioni`); } catch { setFeedback("Esportazione non riuscita"); } finally { setBusy(false); } }

  return <motion.div className="settings-page" initial={{ opacity: 0, y: reduceMotion ? 0 : 10 }} animate={{ opacity: 1, y: 0 }}>
    <header className="settings-header"><div><p className="eyebrow">PREFERENZE LOCALI</p><h1>Impostazioni</h1><p>Personalizza il tuo ritmo</p></div>{timer && timer.status !== "idle" && <div className="pending-settings"><Clock3 size={15} /> Le nuove durate valgono dalla prossima sessione</div>}</header>
    {(error || feedback) && <motion.div className={`settings-feedback ${error ? "error" : ""}`} initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}><Check size={15} />{error ?? feedback}</motion.div>}
    <div className="settings-layout"><section className="settings-main">
      <SettingsCard icon={Clock3} title="Timer Pomodoro" subtitle="Imposta la durata delle sessioni e delle pause">
        <div className="settings-presets" aria-label="Preset timer">{presets.map((preset) => <button key={preset.label} className={preferences.preset === preset.label ? "active" : ""} aria-pressed={preferences.preset === preset.label} onClick={() => choosePreset(preset)}>{preset.label}</button>)}</div>
        <div className="stepper-list"><Stepper label="Focus" description="Durata di una sessione concentrata" value={preferences.focusMinutes} unit="min" min={1} max={180} onChange={(value) => update({ focusMinutes: value, preset: "Personalizzato" })} /><Stepper label="Pausa breve" description="Recupero tra due sessioni" value={preferences.shortBreakMinutes} unit="min" min={1} max={60} onChange={(value) => update({ shortBreakMinutes: value, preset: "Personalizzato" })} /><Stepper label="Pausa lunga" description="Pausa per ricaricare le energie" value={preferences.longBreakMinutes} unit="min" min={1} max={90} onChange={(value) => update({ longBreakMinutes: value, preset: "Personalizzato" })} /><Stepper label="Pausa lunga ogni" description="Frequenza in Pomodori completati" value={preferences.longBreakEvery} unit="sessioni" min={1} max={12} onChange={(value) => update({ longBreakEvery: value })} /></div>
      </SettingsCard>
      <SettingsCard icon={Bell} title="Notifiche e suoni" subtitle="Scegli come ricevere il feedback di completamento">
        <SettingRow label="Avviso fine sessione" description={notificationDescription(notificationPermission)}>{notificationPermission === "default" ? <button className="permission-button" disabled={busy} onClick={authorize}>Autorizza</button> : <Toggle checked={preferences.notificationsEnabled && notificationPermission === "granted"} disabled={notificationPermission !== "granted"} label="Notifiche" onChange={(checked) => update({ notificationsEnabled: checked })} />}</SettingRow>
        <SettingRow label="Suono di completamento" description="Riproduci un breve tono al termine"><Toggle checked={preferences.soundEnabled} label="Suoni" onChange={(checked) => update({ soundEnabled: checked })} /></SettingRow>
        <div className={`volume-control ${preferences.soundEnabled ? "" : "disabled"}`}><VolumeX size={16} /><input type="range" min="0" max="1" step="0.05" value={preferences.soundVolume} disabled={!preferences.soundEnabled} aria-label="Volume suoni" onChange={(event) => onUpdate({ soundVolume: Number(event.target.value) })} onMouseUp={() => setFeedback("Volume salvato")} /><Volume2 size={18} /><span>{Math.round(preferences.soundVolume * 100)}%</span><button disabled={!preferences.soundEnabled || busy} onClick={testSound}><Play size={13} fill="currentColor" /> Prova</button></div>
        <div className="focus-sound-block"><div className="focus-sound-heading"><div><strong>Atmosfera di concentrazione</strong><small>Si avvia solo mentre il timer Focus è in esecuzione</small></div>{preferences.focusSound !== "off" && <span>Solo sul dispositivo attivo</span>}</div><div className="soundscape-grid">{focusSounds.map(({ value, label, description, icon: Icon }) => <button key={value} className={preferences.focusSound === value ? "active" : ""} aria-pressed={preferences.focusSound === value} onClick={() => update({ focusSound: value }, value === "off" ? "Sottofondo disattivato" : `${label} selezionato`)}><Icon size={18} /><span><strong>{label}</strong><small>{description}</small></span></button>)}</div><div className={`volume-control focus-volume ${preferences.focusSound !== "off" ? "" : "disabled"}`}><VolumeX size={16} /><input type="range" min="0" max="1" step="0.05" value={preferences.focusSoundVolume} disabled={preferences.focusSound === "off"} aria-label="Volume sottofondo focus" onChange={(event) => onUpdate({ focusSoundVolume: Number(event.target.value) })} onMouseUp={() => setFeedback("Volume del sottofondo salvato")} /><Volume2 size={18} /><span>{Math.round(preferences.focusSoundVolume * 100)}%</span><button disabled={preferences.focusSound === "off" || busy || timer?.status === "running"} title={timer?.status === "running" ? "Metti in pausa il timer per ascoltare l’anteprima" : undefined} onClick={previewFocusSound}><Play size={13} fill="currentColor" /> Ascolta</button></div></div>
        <p className="browser-note">Le notifiche funzionano quando il browser è aperto e il sistema le consente.</p>
      </SettingsCard>
      <SettingsCard icon={Target} title="Obiettivo giornaliero" subtitle="Quante sessioni vuoi completare ogni giorno"><Stepper label="Sessioni giornaliere" description="Il tuo traguardo quotidiano" value={preferences.dailyGoal} unit="sessioni" min={1} max={20} onChange={(value) => update({ dailyGoal: value })} /></SettingsCard>
    </section><aside className="settings-aside">
      <SettingsCard icon={Palette} title="Temi" subtitle="Scegli modalità e atmosfera di RITMO"><div className="theme-mode-label"><strong>Modalità</strong><small>Segui il sistema oppure forza chiaro o scuro</small></div><div className="appearance-tabs">{([ ["system", Sparkles, "Automatico"], ["light", Sun, "Chiaro"], ["dark", Moon, "Scuro"] ] as Array<[RitmoTheme, typeof Sun, string]>).map(([value, Icon, label]) => <button key={value} className={preferences.theme === value ? "active" : ""} aria-pressed={preferences.theme === value} onClick={() => update({ theme: value }, `Modalità ${label}`)}><Icon size={18} /><span>{label}</span></button>)}</div>{paletteGroups.map((group) => <div className="theme-palette-section" key={group.kind}><div className="theme-palette-label"><strong>{group.label}</strong><small>{group.description}</small></div><div className="theme-palette-grid">{RITMO_PALETTES.filter((item) => item.kind === group.kind).map((item) => <button key={item.value} className={palette === item.value ? "active" : ""} aria-pressed={palette === item.value} onClick={() => { onPaletteChange(item.value); setFeedback(`Tema ${item.label} applicato`); window.setTimeout(() => setFeedback(null), 2400); }}><span className={`theme-palette-preview ${item.kind} ${item.value}`} style={{ "--theme-a": item.colors[0], "--theme-b": item.colors[1], "--theme-bg": item.colors[2] } as React.CSSProperties}><i /><i /><i /></span><span><strong>{item.label}</strong><small>{item.description}</small></span>{palette === item.value ? <Check size={15} /> : null}</button>)}</div></div>)}<p className="theme-device-note">L’atmosfera viene ricordata su questo dispositivo; la modalità chiaro/scuro resta sincronizzata con il tuo account.</p></SettingsCard>
      <SettingsCard icon={ShieldCheck} title="Dati e privacy" subtitle="I tuoi dati, protetti dal tuo account"><div className="privacy-box"><Database size={25} /><div><strong>Spazio personale sincronizzato</strong><p>Attività, sessioni e preferenze sono associate al tuo account Google e protette da regole di accesso per utente.</p></div></div><button className="export-button" disabled={busy} onClick={exportData}><Download size={17} /> Esporta dati JSON</button><small className="export-caption">Crea una copia locale leggibile e portabile</small></SettingsCard>
    </aside></div>
  </motion.div>;
}

function SettingsCard({ icon: Icon, title, subtitle, children }: { icon: typeof Clock3; title: string; subtitle: string; children: React.ReactNode }) { return <article className="card settings-card"><header><span><Icon size={21} /></span><div><h2>{title}</h2><p>{subtitle}</p></div></header>{children}</article>; }
function SettingRow({ label, description, children }: { label: string; description: string; children: React.ReactNode }) { return <div className="setting-row"><div><strong>{label}</strong><small>{description}</small></div>{children}</div>; }
function Stepper({ label, description, value, unit, min, max, onChange }: { label: string; description: string; value: number; unit: string; min: number; max: number; onChange: (value: number) => void }) { return <div className="stepper-row"><div><strong>{label}</strong><small>{description}</small></div><div className="stepper"><button aria-label={`Riduci ${label}`} disabled={value <= min} onClick={() => onChange(Math.max(min, value - 1))}><Minus size={14} /></button><span>{value} <small>{unit}</small></span><button aria-label={`Aumenta ${label}`} disabled={value >= max} onClick={() => onChange(Math.min(max, value + 1))}><Plus size={14} /></button></div></div>; }
function Toggle({ checked, disabled, label, onChange }: { checked: boolean; disabled?: boolean; label: string; onChange: (checked: boolean) => void }) { const reduceMotion = useReducedMotion(); return <button type="button" role="switch" aria-label={label} aria-checked={checked} disabled={disabled} className={`settings-toggle ${checked ? "on" : ""}`} onClick={() => onChange(!checked)}><motion.i layout transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 500, damping: 32 }} /></button>; }
function notificationDescription(permission: Props["notificationPermission"]) { if (permission === "unsupported") return "Il browser non supporta le notifiche"; if (permission === "denied") return "Bloccate nelle impostazioni del browser"; if (permission === "granted") return "Autorizzate su questo dispositivo"; return "Richiede una scelta esplicita del browser"; }
