export type FocusSound = "off" | "rain" | "brown" | "waves";

type TrackSlot = {
  element: HTMLAudioElement;
  source: MediaElementAudioSourceNode;
  gain: GainNode;
};

type ActiveSound = {
  sound: Exclude<FocusSound, "off">;
  context: AudioContext;
  master: GainNode;
  slots: [TrackSlot, TrackSlot];
  currentSlot: 0 | 1;
  crossfading: boolean;
  interval: number;
  crossfadeTimeout: number | null;
};

export const FOCUS_SOUND_TRACKS: Record<Exclude<FocusSound, "off">, string> = {
  rain: "/audio/rain-thunder.mp3",
  brown: "/audio/ambient-drift.mp3",
  waves: "/audio/forest.mp3",
};

const CROSSFADE_SECONDS = 8;
const FADE_SECONDS = .65;
let sharedContext: AudioContext | null = null;
let activeSound: ActiveSound | null = null;

export function normalizeFocusSound(value: unknown): FocusSound {
  return value === "rain" || value === "brown" || value === "waves" ? value : "off";
}

export function normalizeFocusVolume(value: number) {
  return Math.min(1, Math.max(0, Number.isFinite(value) ? value : .35));
}

function normalizedVolume(volume: number) {
  return Math.min(.72, Math.max(0, volume) * .72);
}

function audioContext() {
  if (typeof window === "undefined") return null;
  const AudioContextClass = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return null;
  sharedContext ??= new AudioContextClass();
  return sharedContext;
}

function createTrackSlot(context: AudioContext, sourceUrl: string) {
  const element = new Audio(sourceUrl);
  element.preload = "auto";
  element.loop = false;
  const source = context.createMediaElementSource(element);
  const gain = context.createGain();
  source.connect(gain);
  return { element, source, gain };
}

function dispose(current: ActiveSound) {
  window.clearInterval(current.interval);
  if (current.crossfadeTimeout !== null) window.clearTimeout(current.crossfadeTimeout);
  current.slots.forEach(({ element, source, gain }) => {
    element.pause();
    element.removeAttribute("src");
    element.load();
    source.disconnect();
    gain.disconnect();
  });
  current.master.disconnect();
}

function fadeOutAndDispose(current: ActiveSound) {
  window.clearInterval(current.interval);
  if (current.crossfadeTimeout !== null) window.clearTimeout(current.crossfadeTimeout);
  const now = current.context.currentTime;
  current.master.gain.cancelScheduledValues(now);
  current.master.gain.setValueAtTime(Math.max(.0001, current.master.gain.value), now);
  current.master.gain.linearRampToValueAtTime(.0001, now + FADE_SECONDS);
  window.setTimeout(() => dispose(current), (FADE_SECONDS + .12) * 1000);
}

function beginCrossfade(current: ActiveSound) {
  if (current.crossfading || activeSound !== current) return;
  const fromIndex = current.currentSlot;
  const toIndex = fromIndex === 0 ? 1 : 0;
  const from = current.slots[fromIndex];
  const to = current.slots[toIndex];
  current.crossfading = true;
  to.element.currentTime = 0;
  void to.element.play().then(() => {
    if (activeSound !== current) {
      to.element.pause();
      return;
    }
    const rampStart = current.context.currentTime;
    to.gain.gain.cancelScheduledValues(rampStart);
    from.gain.gain.cancelScheduledValues(rampStart);
    to.gain.gain.setValueAtTime(0, rampStart);
    from.gain.gain.setValueAtTime(Math.max(.0001, from.gain.gain.value), rampStart);
    to.gain.gain.linearRampToValueAtTime(1, rampStart + CROSSFADE_SECONDS);
    from.gain.gain.linearRampToValueAtTime(.0001, rampStart + CROSSFADE_SECONDS);
    current.crossfadeTimeout = window.setTimeout(() => {
      from.element.pause();
      from.element.currentTime = 0;
      from.gain.gain.setValueAtTime(0, current.context.currentTime);
      current.currentSlot = toIndex;
      current.crossfading = false;
      current.crossfadeTimeout = null;
    }, CROSSFADE_SECONDS * 1000);
  }).catch(() => { current.crossfading = false; });
}

export async function unlockFocusAudio() {
  const context = audioContext();
  if (!context) return false;
  if (context.state === "suspended") await context.resume();
  return context.state === "running";
}

export async function startFocusAudio(sound: FocusSound, volume: number) {
  if (sound === "off") { stopFocusAudio(); return false; }
  const context = audioContext();
  if (!context) return false;
  if (activeSound?.sound === sound) {
    setFocusAudioVolume(volume);
    return true;
  }
  const resumeTask = context.state === "suspended" ? context.resume() : Promise.resolve();
  stopFocusAudio();

  const master = context.createGain();
  const slots: [TrackSlot, TrackSlot] = [createTrackSlot(context, FOCUS_SOUND_TRACKS[sound]), createTrackSlot(context, FOCUS_SOUND_TRACKS[sound])];
  slots[0].gain.gain.value = 1;
  slots[1].gain.gain.value = 0;
  slots.forEach(({ gain }) => gain.connect(master));
  master.connect(context.destination);
  master.gain.setValueAtTime(0, context.currentTime);
  master.gain.linearRampToValueAtTime(normalizedVolume(volume), context.currentTime + 1.2);

  const current: ActiveSound = { sound, context, master, slots, currentSlot: 0, crossfading: false, interval: 0, crossfadeTimeout: null };
  activeSound = current;
  current.interval = window.setInterval(() => {
    if (activeSound !== current || current.crossfading) return;
    const element = current.slots[current.currentSlot].element;
    if (!Number.isFinite(element.duration) || element.duration <= CROSSFADE_SECONDS) return;
    if (element.duration - element.currentTime <= CROSSFADE_SECONDS) beginCrossfade(current);
  }, 250);

  try {
    const playTask = slots[0].element.play();
    await Promise.all([resumeTask, playTask]);
    return true;
  } catch {
    if (activeSound === current) activeSound = null;
    dispose(current);
    return false;
  }
}

export function setFocusAudioVolume(volume: number) {
  if (!activeSound) return;
  activeSound.master.gain.setTargetAtTime(normalizedVolume(volume), activeSound.context.currentTime, .08);
}

export function stopFocusAudio() {
  const current = activeSound;
  activeSound = null;
  if (current) fadeOutAndDispose(current);
}

export async function previewFocusAudio(sound: FocusSound, volume: number) {
  const started = await startFocusAudio(sound, volume);
  if (!started) return false;
  const preview = activeSound;
  window.setTimeout(() => { if (activeSound === preview) stopFocusAudio(); }, 8_000);
  return true;
}
