import type { Rarity, UserSettings } from "@wikideck/shared";

type AudioSettings = UserSettings["audio"];

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let sfxBus: GainNode | null = null;
let bgmBus: GainNode | null = null;
let current: AudioSettings | null = null;
let stopBgm: (() => void) | null = null;
let unlocked = false;

function context() {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
    master = ctx.createGain();
    sfxBus = ctx.createGain();
    bgmBus = ctx.createGain();
    sfxBus.connect(master);
    bgmBus.connect(master);
    master.connect(ctx.destination);
    applyVolumes();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function applyVolumes() {
  if (!ctx || !current) return;
  const t = ctx.currentTime;
  master!.gain.setTargetAtTime(current.master / 100, t, 0.05);
  sfxBus!.gain.setTargetAtTime(current.sfx ? current.sfxVolume / 100 : 0, t, 0.05);
  bgmBus!.gain.setTargetAtTime(current.bgm ? (current.bgmVolume / 100) * 0.45 : 0, t, 0.3);
}

function startAmbient() {
  const c = context();
  if (!c || !bgmBus || stopBgm) return;
  const filter = c.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 700;
  const breath = c.createGain();
  breath.gain.value = 0.7;
  filter.connect(breath).connect(bgmBus);

  const oscillators = [110, 164.81, 220.5, 329.6].map((hz, i) => {
    const osc = c.createOscillator();
    osc.type = i % 2 ? "sawtooth" : "triangle";
    osc.frequency.value = hz;
    osc.detune.value = (i - 1.5) * 7;
    const g = c.createGain();
    g.gain.value = 0.16 / (1 + i * 0.4);
    osc.connect(g).connect(filter);
    osc.start();
    return osc;
  });
  const lfo = (rate: number, depth: number, target: AudioParam) => {
    const l = c.createOscillator();
    const d = c.createGain();
    l.frequency.value = rate;
    d.gain.value = depth;
    l.connect(d).connect(target);
    l.start();
    return l;
  };
  const lfos = [lfo(0.05, 350, filter.frequency), lfo(0.08, 0.2, breath.gain)];

  stopBgm = () => {
    breath.gain.setTargetAtTime(0, c.currentTime, 0.4);
    window.setTimeout(() => {
      [...oscillators, ...lfos].forEach((o) => o.stop());
      filter.disconnect();
      breath.disconnect();
    }, 1500);
    stopBgm = null;
  };
}

function syncAmbient() {
  if (!current) return;
  const wanted = current.bgm && current.master > 0 && current.bgmVolume > 0;
  if (wanted && unlocked) startAmbient();
  else stopBgm?.();
}

export function configureAudio(settings: AudioSettings) {
  current = settings;
  applyVolumes();
  syncAmbient();
}

export function unlockAudio() {
  if (unlocked) return;
  unlocked = true;
  if (current && (current.bgm || current.sfx)) {
    const c = context();
    if (c && current.sfx) {
      preload(c, LEGENDARY_SOUND);
      preload(c, MYTHIC_SOUND);
    }
  }
  syncAmbient();
}

function ready() {
  const c = context();
  if (!c || !current?.sfx || current.master <= 0 || current.sfxVolume <= 0) return null;
  preload(c, LEGENDARY_SOUND);
  preload(c, MYTHIC_SOUND);
  return c;
}

const samples = new Map<string, AudioBuffer | "loading">();

function preload(c: AudioContext, url: string) {
  if (samples.has(url)) return;
  samples.set(url, "loading");
  fetch(url)
    .then((r) => r.arrayBuffer())
    .then((data) => c.decodeAudioData(data))
    .then((buffer) => samples.set(url, buffer))
    .catch(() => samples.delete(url));
}

function playSample(c: AudioContext, url: string, volume = 1) {
  const buffer = samples.get(url);
  if (!buffer || buffer === "loading") return false;
  const source = c.createBufferSource();
  source.buffer = buffer;
  const gain = c.createGain();
  gain.gain.value = volume;
  source.connect(gain).connect(sfxBus!);
  source.start();
  return true;
}

const LEGENDARY_SOUND = "/legendary.mp3";
const MYTHIC_SOUND = "/mystic.mp3";

function tone(
  c: AudioContext,
  hz: number,
  start: number,
  length: number,
  peak: number,
  type: OscillatorType = "sine",
) {
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(hz, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(peak, start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
  osc.connect(gain).connect(sfxBus!);
  osc.start(start);
  osc.stop(start + length + 0.05);
}

const SCALE = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51];
const NOTES: Record<Rarity, number> = {
  COMMON: 1,
  UNCOMMON: 2,
  RARE: 3,
  SUPER_RARE: 4,
  ULTRA_RARE: 5,
  LEGENDARY: 7,
  MYTHIC: 7,
};

// seconde où le son atteint son pic, c'est là que la carte se retourne
export const LEGENDARY_IMPACT_S = 4;
export const MYTHIC_IMPACT_S = 3.6;

export function playLegendary(mythic = false): { duration: number; stop: () => void } | null {
  const c = ready();
  if (!c) return null;
  const buffer = samples.get(mythic ? MYTHIC_SOUND : LEGENDARY_SOUND);
  if (!buffer || buffer === "loading") return null;
  const source = c.createBufferSource();
  source.buffer = buffer;
  const gain = c.createGain();
  source.connect(gain).connect(sfxBus!);
  source.start();
  return {
    duration: buffer.duration,
    stop() {
      const t = c.currentTime;
      gain.gain.cancelScheduledValues(t);
      gain.gain.setTargetAtTime(0, t, 0.06);
      source.stop(t + 0.4);
    },
  };
}

export const sfx = {
  click() {
    const c = ready();
    if (!c) return;
    const t = c.currentTime;
    tone(c, 1320, t, 0.06, 0.2, "triangle");
    tone(c, 880, t + 0.02, 0.05, 0.12, "sine");
  },
  open() {
    const c = ready();
    if (!c) return;
    const t = c.currentTime;
    const noise = c.createBufferSource();
    const buffer = c.createBuffer(1, c.sampleRate * 1.2, c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    noise.buffer = buffer;
    const band = c.createBiquadFilter();
    band.type = "bandpass";
    band.Q.value = 1.4;
    band.frequency.setValueAtTime(260, t);
    band.frequency.exponentialRampToValueAtTime(3200, t + 0.7);
    const gain = c.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.5, t + 0.45);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
    noise.connect(band).connect(gain).connect(sfxBus!);
    noise.start(t);
    noise.stop(t + 1);
    tone(c, 70, t, 0.5, 0.6);
  },
  trade() {
    const c = ready();
    if (!c) return;
    const t = c.currentTime;
    tone(c, 523, t, 0.25, 0.18, "triangle");
    tone(c, 784, t + 0.12, 0.25, 0.18, "triangle");
    tone(c, 1047, t + 0.62, 0.7, 0.2, "triangle");
    tone(c, 1319, t + 0.64, 0.7, 0.14, "sine");
    tone(c, 523, t + 0.62, 0.7, 0.14, "sine");
  },
  reveal(rarity: Rarity) {
    const c = ready();
    if (!c) return;
    if (rarity === "LEGENDARY" && playSample(c, LEGENDARY_SOUND)) return;
    if (rarity === "MYTHIC" && playSample(c, MYTHIC_SOUND)) return;
    const t = c.currentTime;
    const count = NOTES[rarity];
    for (let i = 0; i < count; i++) {
      tone(
        c,
        SCALE[Math.min(i, SCALE.length - 1)],
        t + i * 0.085,
        0.55,
        0.22 - i * 0.01,
        "triangle",
      );
    }
  },
};
