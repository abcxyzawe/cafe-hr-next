/**
 * Soft 2-tone notification chime built with Web Audio API — no asset files.
 * Lazily creates a singleton AudioContext on first call.
 * Silently fails if the browser blocks autoplay or audio APIs are missing.
 * Rate-limited to one chime per 1.5s.
 */

type AudioCtor = typeof AudioContext;

interface WindowWithWebkitAudio extends Window {
  webkitAudioContext?: AudioCtor;
}

let ctx: AudioContext | null = null;
let lastPlayedAt = 0;

const MIN_INTERVAL_MS = 1500;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (ctx) return ctx;
  try {
    const w = window as WindowWithWebkitAudio;
    const Ctor: AudioCtor | undefined = window.AudioContext ?? w.webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
    return ctx;
  } catch {
    return null;
  }
}

function playTone(
  audio: AudioContext,
  frequency: number,
  startAt: number,
  durationSec: number,
  peakGain: number,
): void {
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(frequency, startAt);

  // Gain envelope: 0 → peak → 0 to avoid clicks
  gain.gain.setValueAtTime(0, startAt);
  gain.gain.linearRampToValueAtTime(peakGain, startAt + 0.02);
  gain.gain.linearRampToValueAtTime(0, startAt + durationSec);

  osc.connect(gain);
  gain.connect(audio.destination);
  osc.start(startAt);
  osc.stop(startAt + durationSec + 0.02);
}

export function playChime(): void {
  try {
    const now = Date.now();
    if (now - lastPlayedAt < MIN_INTERVAL_MS) return;

    const audio = getAudioContext();
    if (!audio) return;

    // Some browsers start the context in "suspended" state until a gesture.
    if (audio.state === "suspended") {
      void audio.resume().catch(() => {
        /* ignore — autoplay restriction */
      });
    }

    lastPlayedAt = now;

    const t0 = audio.currentTime + 0.01;
    const toneDur = 0.12; // ~120ms each
    const peak = 0.15;
    playTone(audio, 880, t0, toneDur, peak); // A5
    playTone(audio, 1320, t0 + toneDur, toneDur, peak); // E6
  } catch {
    // Silently ignore — sound is best-effort
  }
}
