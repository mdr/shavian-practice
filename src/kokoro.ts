// Higher-quality TTS via Kokoro-82M, running fully client-side (Transformers.js
// + ONNX Runtime Web). The model (~86 MB, q8) downloads from the HuggingFace CDN
// on first use and is cached by the browser. kokoro-js is dynamically imported so
// none of this weight is in the initial bundle.
//
// NOTE: ONNX Runtime Web WASM inference does not complete on iOS/iPadOS Safari
// (onnxruntime #15644, #26827) — generate() hangs regardless of threads / worker
// / SIMD settings. So callers should use isIOS() to fall back to the system
// voice there; Kokoro is used on desktop, where it works.

import type { KokoroTTS } from "kokoro-js";

const MODEL = "onnx-community/Kokoro-82M-v1.0-ONNX";
const VOICE = "af_heart"; // Kokoro's default female voice (American)

/** iOS/iPadOS (incl. iPadOS posing as macOS) — Kokoro WASM inference hangs here. */
export function isIOS(): boolean {
  const n = navigator as Navigator & { maxTouchPoints: number };
  return (
    /iPad|iPhone|iPod/.test(n.userAgent) ||
    (n.platform === "MacIntel" && n.maxTouchPoints > 1)
  );
}

export type Progress =
  | { phase: "download"; pct: number; loadedMB: number; totalMB: number }
  | { phase: "generate" }
  | { phase: "ready" }
  | { phase: "error"; message: string };

const listeners = new Set<(p: Progress) => void>();
export function onKokoroProgress(fn: (p: Progress) => void) {
  listeners.add(fn);
  return () => void listeners.delete(fn);
}
const emit = (p: Progress) => listeners.forEach((f) => f(p));

// Aggregate byte counts across the files transformers.js downloads, so the bar
// reflects total progress rather than jumping per-file.
const files = new Map<string, { loaded: number; total: number }>();
function emitDownload() {
  let loaded = 0;
  let total = 0;
  for (const f of files.values()) {
    loaded += f.loaded;
    total += f.total;
  }
  if (total > 0) {
    emit({
      phase: "download",
      pct: Math.min(1, loaded / total),
      loadedMB: loaded / 1e6,
      totalMB: total / 1e6,
    });
  }
}

const progress_callback = (x: {
  status: string;
  file?: string;
  loaded?: number;
  total?: number;
}) => {
  if (!x.file) return;
  if (x.status === "progress" || x.status === "download") {
    files.set(x.file, { loaded: x.loaded ?? 0, total: x.total ?? 0 });
    emitDownload();
  } else if (x.status === "done") {
    const f = files.get(x.file);
    if (f) f.loaded = f.total;
    emitDownload();
  }
};

let ttsPromise: Promise<KokoroTTS> | null = null;
let ctx: AudioContext | null = null;

function audioContext(): AudioContext {
  if (!ctx) {
    const AC =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    ctx = new AC();
  }
  return ctx;
}

/** Resume the AudioContext within a user gesture so later playback is allowed. */
export function unlockAudio() {
  const c = audioContext();
  if (c.state === "suspended") void c.resume();
}

function loadKokoro(): Promise<KokoroTTS> {
  if (!ttsPromise) {
    ttsPromise = import("kokoro-js").then(({ KokoroTTS }) =>
      KokoroTTS.from_pretrained(MODEL, {
        dtype: "q8",
        device: "wasm",
        progress_callback,
      }),
    );
  }
  return ttsPromise;
}

export async function speakKokoro(text: string): Promise<void> {
  try {
    const c = audioContext();
    if (c.state === "suspended") await c.resume();
    const tts = await loadKokoro();
    emit({ phase: "generate" });
    const audio = await tts.generate(text, { voice: VOICE });
    const data = audio.audio as Float32Array;
    const buffer = c.createBuffer(1, data.length, audio.sampling_rate);
    buffer.getChannelData(0).set(data);
    const src = c.createBufferSource();
    src.buffer = buffer;
    src.connect(c.destination);
    src.start();
    emit({ phase: "ready" });
  } catch (e) {
    emit({ phase: "error", message: e instanceof Error ? e.message : String(e) });
    throw e;
  }
}
