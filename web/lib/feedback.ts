import type { RitmoPreferences } from "@/lib/preferences-db";

export function notificationSupport(): "unsupported" | NotificationPermission {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission;
}

export function sendCompletionNotification(title: string, body: string, preferences: RitmoPreferences | null) {
  if (!preferences?.notificationsEnabled || notificationSupport() !== "granted") return false;
  try { new Notification(title, { body, icon: "/favicon.svg", tag: "ritmo-completion" }); return true; } catch { return false; }
}

export async function playCompletionSound(volume: number) {
  if (typeof window === "undefined") return false;
  try {
    const AudioContextClass = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return false;
    const context = new AudioContextClass();
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
    window.setTimeout(() => void context.close(), 650);
    return true;
  } catch { return false; }
}
