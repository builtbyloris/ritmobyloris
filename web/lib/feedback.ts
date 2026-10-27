import type { RitmoPreferences } from "@/lib/preferences-db";

let sharedFeedbackContext: AudioContext | null = null;

function feedbackContext() {
  if (typeof window === "undefined") return null;
  const AudioContextClass = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return null;
  sharedFeedbackContext ??= new AudioContextClass();
  return sharedFeedbackContext;
}

export async function unlockFeedbackAudio() {
  const context = feedbackContext();
  if (!context) return false;
  if (context.state === "suspended") await context.resume();
  return context.state === "running";
}

export function notificationSupport(): "unsupported" | NotificationPermission {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission;
}

export function sendCompletionNotification(title: string, body: string, preferences: RitmoPreferences | null) {
  if (!preferences?.notificationsEnabled || notificationSupport() !== "granted") return false;
  try { new Notification(title, { body, icon: "/favicon.svg", tag: "ritmo-completion" }); return true; } catch { return false; }
}

export async function playCompletionSound(volume: number) {
  try {
    const context = feedbackContext();
    if (!context) return false;
    if (context.state === "suspended") await context.resume();
    const gain = context.createGain();
    gain.gain.setValueAtTime(0, context.currentTime);
    gain.gain.linearRampToValueAtTime(Math.min(.32, Math.max(0, volume) * .32), context.currentTime + .02);
    gain.gain.exponentialRampToValueAtTime(.001, context.currentTime + .48);
    gain.connect(context.destination);
    [523.25, 659.25].forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      oscillator.connect(gain);
      oscillator.start(context.currentTime + index * .11);
      oscillator.stop(context.currentTime + .5);
    });
    return true;
  } catch { return false; }
}

export async function playCountdownTick(volume: number, secondsRemaining: number) {
  try {
    const context = feedbackContext();
    if (!context || context.state !== "running") return false;
    const start = context.currentTime;
    const gain = context.createGain();
    const oscillator = context.createOscillator();
    const step = Math.min(5, Math.max(1, Math.round(secondsRemaining)));
    const frequency = step === 1 ? 988 : 660 + (5 - step) * 55;
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(Math.min(.2, Math.max(0, volume) * .2), start + .008);
    gain.gain.exponentialRampToValueAtTime(.001, start + (step === 1 ? .18 : .11));
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + (step === 1 ? .2 : .13));
    return true;
  } catch { return false; }
}
