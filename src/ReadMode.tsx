import { useEffect, useMemo, useRef, useState } from "react";
import ShavianText from "./ShavianText.tsx";
import type { Lesson, Word } from "./content.ts";
import { practiceWords } from "./content.ts";
import { speak, canSpeak } from "./speak.ts";
import {
  speakKokoro,
  prefetchKokoro,
  unlockAudio,
  onKokoroProgress,
  isIOS,
  type Progress,
} from "./kokoro.ts";

interface ReadModeProps {
  lesson: Lesson;
  onDone: () => void;
}

function shuffle(a: Word[]): Word[] {
  const r = [...a];
  for (let k = r.length - 1; k > 0; k--) {
    const j = Math.floor(Math.random() * (k + 1));
    [r[k], r[j]] = [r[j], r[k]];
  }
  return r;
}

export default function ReadMode({ lesson, onDone }: ReadModeProps) {
  const pool = useMemo(() => practiceWords(lesson), [lesson]);

  // Map each Shavian spelling to all English words that share it, so the reveal
  // can show homophones (e.g. 𐑕𐑰 → "see / sea").
  const homophones = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const w of pool) {
      const list = m.get(w.shavian) ?? [];
      if (!list.includes(w.english)) list.push(w.english);
      m.set(w.shavian, list);
    }
    return m;
  }, [pool]);

  // Endlessly-cycling shuffled deck: reshuffle and continue when it runs out.
  const [deck, setDeck] = useState<Word[]>(() => shuffle(pool));
  const [i, setI] = useState(0);
  const [count, setCount] = useState(1);
  const [revealed, setRevealed] = useState(false);
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [prog, setProg] = useState<Progress | null>(null);
  // Kokoro's WASM inference hangs on iOS; use the system voice there.
  const useKokoro = !isIOS();
  const [audioOn, setAudioOn] = useState(() => {
    try {
      return localStorage.getItem("shavian-practice.audio") !== "off";
    } catch {
      return true;
    }
  });

  useEffect(() => onKokoroProgress(setProg), []);

  // The word we'll speak for a card (homophones share a pronunciation).
  const spokenOf = (w: Word) => (homophones.get(w.shavian) ?? [w.english])[0];

  // Pre-synthesise the current word + the next couple while they're on screen,
  // so Reveal plays an already-ready buffer. Desktop/Kokoro only.
  useEffect(() => {
    if (!useKokoro || !audioOn) return;
    for (let k = i; k < Math.min(i + 3, deck.length); k++) {
      prefetchKokoro(spokenOf(deck[k]));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i, useKokoro, audioOn, deck]);

  const toggleAudio = () =>
    setAudioOn((on) => {
      const v = !on;
      try {
        localStorage.setItem("shavian-practice.audio", v ? "on" : "off");
      } catch {
        /* storage may be unavailable */
      }
      return v;
    });

  const word = deck[i];
  const answers = homophones.get(word.shavian) ?? [word.english];

  // homophones share pronunciation, so any spelling works
  const playWord = async (text: string) => {
    if (!useKokoro) {
      speak(text); // iOS: system voice (Kokoro inference doesn't run there)
      return;
    }
    try {
      setVoiceLoading(true);
      await speakKokoro(text);
    } catch {
      speak(text); // fall back to the built-in voice if Kokoro fails
    } finally {
      setVoiceLoading(false);
    }
  };

  const reveal = () => {
    setRevealed(true);
    if (!audioOn) return;
    if (useKokoro) unlockAudio(); // resume the AudioContext within the gesture
    void playWord(answers[0]); // synthesis runs in a worker, so it won't block
  };

  const next = () => {
    setRevealed(false);
    setCount((c) => c + 1);
    if (i + 1 < deck.length) {
      setI(i + 1);
    } else {
      setDeck(shuffle(pool));
      setI(0);
    }
  };

  // Space = reveal, then continue (the flashcard convention).
  const spaceAction = useRef<() => void>(() => {});
  spaceAction.current = () => (revealed ? next() : reveal());
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      const tag = (document.activeElement as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA" || tag === "BUTTON")
        return; // let focused controls handle Space themselves
      e.preventDefault();
      spaceAction.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Status line / progress shown while the Kokoro voice loads or errors.
  const renderVoiceStatus = () => {
    if (prog?.phase === "error") {
      return (
        <span style={{ fontSize: "0.78rem", color: "#c2533b" }}>
          voice error — using system voice ({prog.message.slice(0, 80)})
        </span>
      );
    }
    if (!voiceLoading) return null;
    if (prog?.phase === "download") {
      return (
        <span style={{ display: "flex", flexDirection: "column", gap: "0.25rem", minWidth: "12rem" }}>
          <span style={{ fontSize: "0.75rem", color: "#888" }}>
            downloading voice {prog.loadedMB.toFixed(0)}/{prog.totalMB.toFixed(0)} MB
            {" "}({Math.round(prog.pct * 100)}%)
          </span>
          <span style={{ height: 6, background: "var(--rule)", borderRadius: 3, overflow: "hidden" }}>
            <span style={{ display: "block", height: "100%", width: `${Math.round(prog.pct * 100)}%`, background: "var(--accent)" }} />
          </span>
        </span>
      );
    }
    return (
      <span style={{ fontSize: "0.75rem", color: "#888" }}>
        {prog?.phase === "generate" ? "synthesizing…" : "loading voice…"}
      </span>
    );
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "1rem", padding: "0.75rem", minHeight: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <span style={{ color: "#777" }}>read this:</span>
        <span style={{ flex: 1 }} />
        {canSpeak() && (
          <button
            onClick={toggleAudio}
            title={audioOn ? "Disable audio" : "Enable audio"}
            style={{ fontSize: "0.85rem", padding: "0.3rem 0.6rem" }}
          >
            {audioOn ? "🔊 audio on" : "🔇 audio off"}
          </button>
        )}
        <span style={{ color: "#999", fontSize: "0.85rem" }}>#{count}</span>
      </div>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1.5rem",
          background: "#fff",
          border: "1px solid var(--rule)",
          borderRadius: 12,
          padding: "1rem",
        }}
      >
        <ShavianText text={word.shavian} style={{ fontSize: "4rem", lineHeight: 1 }} />
        {revealed && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <span style={{ fontSize: "1.6rem", color: "var(--ink)" }}>
              {answers.join(" / ")}
            </span>
            {audioOn && (
              <button
                onClick={() => playWord(answers[0])}
                disabled={voiceLoading}
                title="Hear it again"
                aria-label="Hear it again"
                style={{ padding: "0.3rem 0.6rem" }}
              >
                {voiceLoading ? "…" : "🔊"}
              </button>
            )}
          </div>
        )}
        {revealed && renderVoiceStatus()}
      </div>

      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        <button onClick={onDone}>Done</button>
        <span style={{ flex: 1 }} />
        {!revealed ? (
          <button onClick={reveal} style={{ borderColor: "var(--accent)" }}>
            Reveal
          </button>
        ) : (
          <button onClick={next} style={{ borderColor: "var(--accent)" }}>
            Continue ›
          </button>
        )}
      </div>
    </div>
  );
}
