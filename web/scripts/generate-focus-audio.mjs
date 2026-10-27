import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const sampleRate = 44_100;
const durationSeconds = 180;
const frameCount = sampleRate * durationSeconds;
const outputDirectory = process.argv[2] ?? "/tmp/ritmo-focus-audio";
mkdirSync(outputDirectory, { recursive: true });

function randomGenerator(seed) {
  let value = seed >>> 0;
  return () => {
    value += 0x6D2B79F5;
    let next = value;
    next = Math.imul(next ^ next >>> 15, next | 1);
    next ^= next + Math.imul(next ^ next >>> 7, next | 61);
    return ((next ^ next >>> 14) >>> 0) / 4_294_967_296;
  };
}

function wavHeader(dataLength) {
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + dataLength, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(2, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 4, 28);
  header.writeUInt16LE(4, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(dataLength, 40);
  return header;
}

function softLimit(sample, gain = 1) {
  return Math.tanh(sample * gain) * .88;
}

function writeTrack(name, generator) {
  const data = Buffer.allocUnsafe(frameCount * 4);
  for (let frame = 0; frame < frameCount; frame += 1) {
    const [left, right] = generator(frame, frame / sampleRate);
    data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, left)) * 32_767), frame * 4);
    data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, right)) * 32_767), frame * 4 + 2);
  }
  writeFileSync(join(outputDirectory, `${name}.wav`), Buffer.concat([wavHeader(data.length), data]));
}

function rainGenerator(seed) {
  const random = randomGenerator(seed);
  const state = [{ fast: 0, slow: 0, pink: 0, drop: 0, dropPhase: 0, dropFrequency: 0 }, { fast: 0, slow: 0, pink: 0, drop: 0, dropPhase: 0, dropFrequency: 0 }];
  const thunderStarts = [31, 72, 118, 157];
  return (frame, time) => {
    const samples = [0, 0];
    for (let channel = 0; channel < 2; channel += 1) {
      const current = state[channel];
      const white = random() * 2 - 1;
      current.fast += .16 * (white - current.fast);
      current.slow += .0022 * (white - current.slow);
      current.pink = current.pink * .986 + white * .014;
      if (random() < .000055) {
        current.drop = .12 + random() * .18;
        current.dropFrequency = 950 + random() * 1850;
        current.dropPhase = 0;
      }
      current.dropPhase += Math.PI * 2 * current.dropFrequency / sampleRate;
      const drop = Math.sin(current.dropPhase) * current.drop;
      current.drop *= .9981;
      let thunder = 0;
      for (const start of thunderStarts) {
        const age = time - start - channel * .07;
        if (age < 0 || age > 13) continue;
        const attack = Math.min(1, age / 1.8);
        const decay = Math.exp(-age / 4.6);
        const rumble = current.slow * 3.1 + Math.sin(Math.PI * 2 * 36 * age) * .055 + Math.sin(Math.PI * 2 * 52 * age) * .03;
        thunder += rumble * attack * decay;
      }
      const rain = (white - current.fast) * .19 + current.pink * .74 + current.fast * .22;
      const movement = .84 + .1 * Math.sin(time * .17 + channel * 1.7) + .06 * Math.sin(time * .047 + channel);
      samples[channel] = softLimit(rain * movement + drop * .32 + thunder * .58, 1.18);
    }
    return samples;
  };
}

function ambientGenerator(seed) {
  const random = randomGenerator(seed);
  const chords = [
    [110, 164.81, 220, 329.63],
    [98, 146.83, 220, 293.66],
    [130.81, 196, 261.63, 329.63],
    [87.31, 130.81, 174.61, 261.63],
  ];
  const chordSeconds = 22.5;
  const echoes = [
    { buffer: new Float32Array(Math.round(sampleRate * .43)), cursor: 0 },
    { buffer: new Float32Array(Math.round(sampleRate * .57)), cursor: 0 },
  ];
  const sparkles = [];
  let cursor = 6;
  const sparkleNotes = [440, 493.88, 523.25, 659.25, 739.99];
  while (cursor < durationSeconds - 4) {
    cursor += 8 + random() * 11;
    sparkles.push({
      start: cursor,
      frequency: sparkleNotes[Math.floor(random() * sparkleNotes.length)],
      pan: random() * 2 - 1,
      duration: 2.8 + random() * 2.5,
    });
  }

  function chordVoice(frequencies, time, channel, gain) {
    const detune = channel === 0 ? .99935 : 1.00065;
    let signal = 0;
    for (let voice = 0; voice < frequencies.length; voice += 1) {
      const frequency = frequencies[voice] * detune;
      const phase = Math.PI * 2 * frequency * time + voice * .71 + channel * .19;
      const drift = 1 + .0011 * Math.sin(time * (.037 + voice * .006) + voice * 1.7);
      signal += Math.sin(phase * drift) * (.105 - voice * .009);
      signal += Math.sin(phase * 2 * drift + .4) * (.018 - voice * .0015);
    }
    return signal * gain;
  }

  return (_frame, time) => {
    const samples = [0, 0];
    const chordPosition = time / chordSeconds;
    const chordIndex = Math.floor(chordPosition) % chords.length;
    const nextChordIndex = (chordIndex + 1) % chords.length;
    const blend = chordPosition - Math.floor(chordPosition);
    const currentGain = Math.cos(blend * Math.PI * .5);
    const nextGain = Math.sin(blend * Math.PI * .5);
    const breath = .86 + .08 * Math.sin(time * .071) + .04 * Math.sin(time * .023 + 1.4);

    for (let channel = 0; channel < 2; channel += 1) {
      let dry = chordVoice(chords[chordIndex], time, channel, currentGain);
      dry += chordVoice(chords[nextChordIndex], time, channel, nextGain);
      dry *= breath;

      for (const sparkle of sparkles) {
        const age = time - sparkle.start;
        if (age < 0 || age > sparkle.duration) continue;
        const envelope = (1 - Math.exp(-age * 8)) * Math.exp(-age * 1.05);
        const panGain = channel === 0 ? 1 - Math.max(0, sparkle.pan) * .65 : 1 + Math.min(0, sparkle.pan) * .65;
        const shimmer = Math.sin(Math.PI * 2 * sparkle.frequency * age) + Math.sin(Math.PI * 2 * sparkle.frequency * 2.01 * age) * .22;
        dry += shimmer * envelope * .048 * panGain;
      }

      const echo = echoes[channel];
      const delayed = echo.buffer[echo.cursor];
      echo.buffer[echo.cursor] = dry + delayed * .34;
      echo.cursor = (echo.cursor + 1) % echo.buffer.length;
      samples[channel] = softLimit(dry + delayed * .24, 1.05);
    }
    return samples;
  };
}

function forestGenerator(seed) {
  const random = randomGenerator(seed);
  const state = [{ fast: 0, slow: 0, pink: 0 }, { fast: 0, slow: 0, pink: 0 }];
  const birds = [];
  let cursor = 4;
  while (cursor < durationSeconds - 3) {
    cursor += 2.8 + random() * 7.5;
    birds.push({ start: cursor, duration: .32 + random() * .55, frequency: 1450 + random() * 2100, sweep: 350 + random() * 1150, pan: random() * 2 - 1, double: random() > .55 });
  }
  return (_frame, time) => {
    const samples = [0, 0];
    for (let channel = 0; channel < 2; channel += 1) {
      const current = state[channel];
      const white = random() * 2 - 1;
      current.fast += .08 * (white - current.fast);
      current.slow += .0014 * (white - current.slow);
      current.pink = current.pink * .992 + white * .008;
      const breeze = .5 + .21 * Math.sin(time * .083 + channel * 1.2) + .12 * Math.sin(time * .031 + 2.1);
      const leaves = (current.fast - current.slow) * (.2 + Math.max(.06, breeze) * .24);
      const air = current.pink * .5 + current.slow * .8;
      const insects = Math.sin(Math.PI * 2 * (3950 + channel * 125) * time) * (.005 + .004 * Math.sin(time * .7 + channel));
      let calls = 0;
      for (const bird of birds) {
        let age = time - bird.start;
        if (bird.double && age > bird.duration + .16) age -= bird.duration + .16;
        if (age < 0 || age > bird.duration) continue;
        const progress = age / bird.duration;
        const envelope = Math.sin(Math.PI * progress) ** 2;
        const frequency = bird.frequency + Math.sin(progress * Math.PI * 2) * bird.sweep + progress * bird.sweep * .35;
        const panning = channel === 0 ? 1 - Math.max(0, bird.pan) * .7 : 1 + Math.min(0, bird.pan) * .7;
        calls += Math.sin(Math.PI * 2 * frequency * age) * envelope * .065 * panning;
      }
      samples[channel] = softLimit(leaves + air * .42 + insects + calls, 1.05);
    }
    return samples;
  };
}

const selectedTrack = process.argv[3] ?? "all";
if (selectedTrack === "all" || selectedTrack === "rain-thunder") writeTrack("rain-thunder", rainGenerator(41_7616));
if (selectedTrack === "all" || selectedTrack === "ambient-drift") writeTrack("ambient-drift", ambientGenerator(41_7797));
if (selectedTrack === "all" || selectedTrack === "forest") writeTrack("forest", forestGenerator(56_4436));
