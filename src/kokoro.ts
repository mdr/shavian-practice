// Higher-quality TTS via Kokoro-82M, running fully client-side (Transformers.js
// + ONNX Runtime Web). The model (~86 MB, q8) downloads from the HuggingFace CDN
// on first use and is cached by the browser. kokoro-js is dynamically imported so
// none of this weight is in the initial bundle.

import type { KokoroTTS } from "kokoro-js";

const MODEL = "onnx-community/Kokoro-82M-v1.0-ONNX";
const VOICE = "bf_emma"; // British female, to match the Read Lexicon's RP basis

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

/** Resume the AudioContext within a user gesture so later playback is allowed on iOS. */
export function unlockAudio() {
  const c = audioContext();
  if (c.state === "suspended") void c.resume();
}

/** Whether the model download/load has started (so the UI can show progress once). */
export const kokoroStarted = () => ttsPromise !== null;

function loadKokoro(): Promise<KokoroTTS> {
  if (!ttsPromise) {
    ttsPromise = import("kokoro-js").then(({ KokoroTTS }) =>
      KokoroTTS.from_pretrained(MODEL, { dtype: "q8", device: "wasm" }),
    );
  }
  return ttsPromise;
}

export async function speakKokoro(text: string): Promise<void> {
  const c = audioContext();
  if (c.state === "suspended") await c.resume();
  const tts = await loadKokoro();
  const audio = await tts.generate(text, { voice: VOICE });
  const data = audio.audio as Float32Array;
  const buffer = c.createBuffer(1, data.length, audio.sampling_rate);
  buffer.getChannelData(0).set(data);
  const src = c.createBufferSource();
  src.buffer = buffer;
  src.connect(c.destination);
  src.start();
}
