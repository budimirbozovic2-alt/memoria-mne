// Ambient audio engine — procedural generators for brown noise, rain, forest, lo-fi
export type AmbientTrack = "brown" | "rain" | "forest" | "lofi" | "cafe" | "space" | "piano";

export const AMBIENT_TRACKS: { id: AmbientTrack; label: string }[] = [
  { id: "brown", label: "Brown šum" },
  { id: "rain", label: "Kiša" },
  { id: "forest", label: "Šuma" },
  { id: "lofi", label: "Lo-fi hum" },
  { id: "cafe", label: "Kafić" },
  { id: "space", label: "Space drone" },
  { id: "piano", label: "Tihi klavir" },
];

let audioCtx: AudioContext | null = null;
let sourceNodes: AudioNode[] = [];
let gainNode: GainNode | null = null;
let playing = false;
let currentTrack: AmbientTrack | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

// ── Brown noise (existing algorithm) ──
function createBrownBuffer(ctx: AudioContext): AudioBuffer {
  const len = ctx.sampleRate * 2;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) {
    const w = Math.random() * 2 - 1;
    last = (last + 0.02 * w) / 1.02;
    d[i] = last * 3.5;
  }
  return buf;
}

// ── Rain: filtered white noise + random drip impulses ──
function createRainBuffer(ctx: AudioContext): AudioBuffer {
  const len = ctx.sampleRate * 3;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  // Band-passed noise for steady rain
  let b0 = 0, b1 = 0;
  for (let i = 0; i < len; i++) {
    const w = Math.random() * 2 - 1;
    // Simple low-pass for body
    b0 = 0.95 * b0 + 0.05 * w;
    b1 = 0.9 * b1 + 0.1 * b0;
    let sample = b1 * 2.5;
    // Random drip patter
    if (Math.random() < 0.003) {
      sample += (Math.random() * 2 - 1) * 0.6;
    }
    d[i] = sample;
  }
  return buf;
}

// ── Forest: very low-freq rumble + bird-like chirps ──
function createForestBuffer(ctx: AudioContext): AudioBuffer {
  const len = ctx.sampleRate * 4;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  let lp = 0;
  for (let i = 0; i < len; i++) {
    const t = i / ctx.sampleRate;
    // Wind: very low-passed noise
    const w = Math.random() * 2 - 1;
    lp = 0.98 * lp + 0.02 * w;
    let sample = lp * 1.8;
    // Occasional bird chirp (sine burst)
    if (Math.random() < 0.0004) {
      const chirpLen = Math.floor(ctx.sampleRate * (0.03 + Math.random() * 0.06));
      const freq = 2000 + Math.random() * 3000;
      for (let j = 0; j < chirpLen && (i + j) < len; j++) {
        const env = 1 - j / chirpLen;
        d[i + j] += Math.sin(2 * Math.PI * freq * j / ctx.sampleRate) * env * 0.15;
      }
    }
    d[i] += sample;
  }
  return buf;
}

// ── Lo-fi hum: warm low-frequency drone + vinyl crackle ──
function createLofiBuffer(ctx: AudioContext): AudioBuffer {
  const len = ctx.sampleRate * 3;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) {
    const t = i / ctx.sampleRate;
    // Warm drone (layered low sines)
    let sample = Math.sin(2 * Math.PI * 60 * t) * 0.12
               + Math.sin(2 * Math.PI * 90 * t) * 0.08
               + Math.sin(2 * Math.PI * 120 * t + 0.3) * 0.05;
    // Vinyl crackle
    if (Math.random() < 0.008) {
      sample += (Math.random() * 2 - 1) * 0.25;
    }
    // Subtle filtered noise bed
    sample += (Math.random() * 2 - 1) * 0.03;
    d[i] = sample;
  }
  return buf;
}

// ── Café: murmur of voices + clinking + espresso machine hiss ──
function createCafeBuffer(ctx: AudioContext): AudioBuffer {
  const len = ctx.sampleRate * 4;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  let lp1 = 0, lp2 = 0;
  for (let i = 0; i < len; i++) {
    const w = Math.random() * 2 - 1;
    // Murmur: heavily low-passed noise (voices)
    lp1 = 0.97 * lp1 + 0.03 * w;
    lp2 = 0.95 * lp2 + 0.05 * lp1;
    let sample = lp2 * 2.0;
    // Occasional clink (high-freq ping)
    if (Math.random() < 0.001) {
      const freq = 3000 + Math.random() * 2000;
      const pLen = Math.floor(ctx.sampleRate * 0.02);
      for (let j = 0; j < pLen && (i + j) < len; j++) {
        d[i + j] += Math.sin(2 * Math.PI * freq * j / ctx.sampleRate) * (1 - j / pLen) * 0.08;
      }
    }
    // Espresso machine hiss (burst of filtered noise)
    if (Math.random() < 0.0002) {
      const hLen = Math.floor(ctx.sampleRate * (0.3 + Math.random() * 0.5));
      for (let j = 0; j < hLen && (i + j) < len; j++) {
        const env = Math.sin(Math.PI * j / hLen);
        d[i + j] += (Math.random() * 2 - 1) * env * 0.06;
      }
    }
    d[i] += sample;
  }
  return buf;
}

// ── Space drone: deep sub-bass + harmonic overtones + cosmic shimmer ──
function createSpaceBuffer(ctx: AudioContext): AudioBuffer {
  const len = ctx.sampleRate * 5;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) {
    const t = i / ctx.sampleRate;
    // Deep sub-bass drone with slow modulation
    const mod = Math.sin(2 * Math.PI * 0.07 * t);
    let sample = Math.sin(2 * Math.PI * 40 * t) * (0.10 + 0.03 * mod)
               + Math.sin(2 * Math.PI * 60 * t + 0.5) * 0.06
               + Math.sin(2 * Math.PI * 80 * t + 1.2) * 0.04;
    // Harmonic shimmer (slow-beating high partials)
    sample += Math.sin(2 * Math.PI * 200 * t + Math.sin(2 * Math.PI * 0.3 * t) * 2) * 0.015;
    sample += Math.sin(2 * Math.PI * 320 * t + Math.sin(2 * Math.PI * 0.2 * t) * 3) * 0.01;
    // Cosmic dust (very sparse filtered noise)
    sample += (Math.random() * 2 - 1) * 0.015;
    d[i] = sample;
  }
  return buf;
}

// ── Piano: gentle repeating piano-like tones (pentatonic) ──
function createPianoBuffer(ctx: AudioContext): AudioBuffer {
  const len = ctx.sampleRate * 6;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  // Pentatonic scale frequencies (C4-based, soothing)
  const notes = [261.6, 293.7, 329.6, 392.0, 440.0, 523.3];
  // Pre-place gentle notes
  const noteSpacing = Math.floor(ctx.sampleRate * 0.8);
  const noteCount = Math.floor(len / noteSpacing);
  // Use seeded-ish pattern for consistent loop
  let seed = 42;
  const nextRand = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  for (let n = 0; n < noteCount; n++) {
    const startIdx = n * noteSpacing + Math.floor(nextRand() * noteSpacing * 0.3);
    const freq = notes[Math.floor(nextRand() * notes.length)];
    const decay = ctx.sampleRate * (1.2 + nextRand() * 0.8);
    const vol = 0.06 + nextRand() * 0.04;
    for (let j = 0; j < decay && (startIdx + j) < len; j++) {
      const env = Math.exp(-j / (decay * 0.3));
      // Piano-like: fundamental + soft 2nd harmonic
      const s = Math.sin(2 * Math.PI * freq * j / ctx.sampleRate) * env * vol
              + Math.sin(2 * Math.PI * freq * 2 * j / ctx.sampleRate) * env * vol * 0.15;
      d[startIdx + j] += s;
    }
  }
  // Add very subtle reverb-like tail (low noise bed)
  let lp = 0;
  for (let i = 0; i < len; i++) {
    lp = 0.995 * lp + 0.005 * (Math.random() * 2 - 1);
    d[i] += lp * 0.02;
  }
  return buf;
}

const bufferCache = new Map<AmbientTrack, AudioBuffer>();

function getBuffer(ctx: AudioContext, track: AmbientTrack): AudioBuffer {
  let buf = bufferCache.get(track);
  if (buf) return buf;
  switch (track) {
    case "brown": buf = createBrownBuffer(ctx); break;
    case "rain": buf = createRainBuffer(ctx); break;
    case "forest": buf = createForestBuffer(ctx); break;
    case "lofi": buf = createLofiBuffer(ctx); break;
    case "cafe": buf = createCafeBuffer(ctx); break;
    case "space": buf = createSpaceBuffer(ctx); break;
    case "piano": buf = createPianoBuffer(ctx); break;
  }
  bufferCache.set(track, buf);
  return buf;
}

export function startAmbient(track: AmbientTrack = "brown", volume = 0.3): void {
  if (playing) stopAmbient();
  const ctx = getCtx();
  const buffer = getBuffer(ctx, track);

  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.loop = true;

  gainNode = ctx.createGain();
  gainNode.gain.value = volume;

  src.connect(gainNode);
  gainNode.connect(ctx.destination);
  src.start();

  sourceNodes = [src];
  playing = true;
  currentTrack = track;
}

export function stopAmbient(): void {
  for (const n of sourceNodes) {
    try { (n as AudioBufferSourceNode).stop(); } catch {}
    n.disconnect();
  }
  sourceNodes = [];
  if (gainNode) { gainNode.disconnect(); gainNode = null; }
  if (audioCtx) { audioCtx.close(); audioCtx = null; }
  playing = false;
  currentTrack = null;
  bufferCache.clear();
}

export function setAmbientVolume(v: number): void {
  if (gainNode) gainNode.gain.value = v;
}

export function isAmbientPlaying(): boolean { return playing; }
export function getCurrentTrack(): AmbientTrack | null { return currentTrack; }

// Backward-compatible aliases
export const startBrownNoise = (v?: number) => startAmbient("brown", v);
export const stopBrownNoise = stopAmbient;
export const setBrownNoiseVolume = setAmbientVolume;
export const isBrownNoisePlaying = isAmbientPlaying;
