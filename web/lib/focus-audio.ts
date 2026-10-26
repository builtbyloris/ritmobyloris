export type FocusSound = "off" | "rain" | "brown" | "waves";

type ActiveSound = {
  context: AudioContext;
  gain: GainNode;
  source: AudioBufferSourceNode;
  modulators: OscillatorNode[];
};

let sharedContext: AudioContext | null = null;
let activeSound: ActiveSound | null = null;

export function normalizeFocusSound(value: unknown): FocusSound {
  return value === "rain" || value === "brown" || value === "waves" ? value : "off";
}

export function normalizeFocusVolume(value: number) {
  return Math.min(1, Math.max(0, Number.isFinite(value) ? value : .35));
}

function audioContext() {
  if (typeof window === "undefined") return null;
  const AudioContextClass = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return null;
  sharedContext ??= new AudioContextClass();
  return sharedContext;
}

function noiseBuffer(context: AudioContext, sound: Exclude<FocusSound, "off">) {
  const seconds = 4;
  const buffer = context.createBuffer(1, context.sampleRate * seconds, context.sampleRate);
  const data = buffer.getChannelData(0);
  let previous = 0;
  for (let index = 0; index < data.length; index += 1) {
    const white = Math.random() * 2 - 1;
    if (sound === "brown" || sound === "waves") {
      previous = (previous + .018 * white) / 1.018;
      data[index] = previous * 3.2;
    } else {
      data[index] = white * (.42 + Math.random() * .2);
    }
  }
  return buffer;
}

function normalizedVolume(volume: number) {
  return Math.min(.42, Math.max(0, volume) * .42);
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
  if (context.state === "suspended") await context.resume();
  stopFocusAudio();

  const source = context.createBufferSource();
  const gain = context.createGain();
  const filter = context.createBiquadFilter();
  const modulators: OscillatorNode[] = [];
  source.buffer = noiseBuffer(context, sound);
  source.loop = true;
  gain.gain.setValueAtTime(0, context.currentTime);
  gain.gain.linearRampToValueAtTime(normalizedVolume(volume), context.currentTime + .35);

  if (sound === "rain") {
    filter.type = "bandpass";
    filter.frequency.value = 3300;
    filter.Q.value = .55;
  } else {
    filter.type = "lowpass";
    filter.frequency.value = sound === "waves" ? 720 : 1150;
    filter.Q.value = .45;
  }
  source.connect(filter).connect(gain).connect(context.destination);

  if (sound === "waves") {
    const lfo = context.createOscillator();
    const depth = context.createGain();
    lfo.frequency.value = .11;
    depth.gain.value = normalizedVolume(volume) * .5;
    lfo.connect(depth).connect(gain.gain);
    lfo.start();
    modulators.push(lfo);
  }

  source.start();
  activeSound = { context, gain, source, modulators };
  return true;
}

export function setFocusAudioVolume(volume: number) {
  if (!activeSound) return;
  activeSound.gain.gain.setTargetAtTime(normalizedVolume(volume), activeSound.context.currentTime, .08);
}

export function stopFocusAudio() {
  const current = activeSound;
  activeSound = null;
  if (!current) return;
  const stopAt = current.context.currentTime + .24;
  current.gain.gain.cancelScheduledValues(current.context.currentTime);
  current.gain.gain.setTargetAtTime(.0001, current.context.currentTime, .06);
  current.source.stop(stopAt);
  current.modulators.forEach((node) => node.stop(stopAt));
}

export async function previewFocusAudio(sound: FocusSound, volume: number) {
  const started = await startFocusAudio(sound, volume);
  if (!started) return false;
  const preview = activeSound;
  window.setTimeout(() => { if (activeSound === preview) stopFocusAudio(); }, 4_000);
  return true;
}
