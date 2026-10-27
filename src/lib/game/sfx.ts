/**
 * Tiny WebAudio combat SFX synthesized on the fly — no audio files to
 * download, works offline, and stays silent until the first user gesture
 * (browser autoplay policy).
 */

let ctx: AudioContext | null = null;
let noise: AudioBuffer | null = null;

function ensureContext(): AudioContext | null {
  try {
    if (!ctx) {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) {
        return null;
      }
      ctx = new Ctor();
    }
    if (ctx.state === "suspended") {
      void ctx.resume();
    }
    return ctx;
  } catch {
    return null;
  }
}

function noiseBuffer(context: AudioContext): AudioBuffer {
  if (!noise) {
    const length = Math.floor(context.sampleRate * 0.25);
    noise = context.createBuffer(1, length, context.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < length; i += 1) {
      data[i] = Math.random() * 2 - 1;
    }
  }
  return noise;
}

function burst(
  context: AudioContext,
  at: number,
  volume: number,
  cutoff: number,
  duration: number,
): void {
  const source = context.createBufferSource();
  source.buffer = noiseBuffer(context);
  const filter = context.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = cutoff;
  const gain = context.createGain();
  gain.gain.setValueAtTime(volume, at);
  gain.gain.exponentialRampToValueAtTime(0.001, at + duration);
  source.connect(filter);
  filter.connect(gain);
  gain.connect(context.destination);
  source.start(at);
  source.stop(at + duration + 0.02);
}

function thump(context: AudioContext, at: number, volume: number): void {
  const osc = context.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(150, at);
  osc.frequency.exponentialRampToValueAtTime(48, at + 0.12);
  const gain = context.createGain();
  gain.gain.setValueAtTime(volume, at);
  gain.gain.exponentialRampToValueAtTime(0.001, at + 0.15);
  osc.connect(gain);
  gain.connect(context.destination);
  osc.start(at);
  osc.stop(at + 0.16);
}

/** Short punchy rifle crack with a low body thump. */
export function playGunshot(volume = 0.22): void {
  const context = ensureContext();
  if (!context) {
    return;
  }
  const t = context.currentTime;
  burst(context, t, volume, 1100, 0.16);
  thump(context, t, volume * 0.9);
}

/** Two mechanical clicks for the reload cycle. */
export function playReload(volume = 0.16): void {
  const context = ensureContext();
  if (!context) {
    return;
  }
  const t = context.currentTime;
  burst(context, t, volume, 2600, 0.05);
  burst(context, t + 0.14, volume * 1.2, 3200, 0.06);
}

/** Bright blip when a shot connects. */
export function playHitMarker(volume = 0.12): void {
  const context = ensureContext();
  if (!context) {
    return;
  }
  const t = context.currentTime;
  const osc = context.createOscillator();
  osc.type = "square";
  osc.frequency.value = 1250;
  const gain = context.createGain();
  gain.gain.setValueAtTime(volume, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
  osc.connect(gain);
  gain.connect(context.destination);
  osc.start(t);
  osc.stop(t + 0.08);
}