import { useEffect, useMemo, useState } from "react";
import ShavianText from "./ShavianText.tsx";
import type { Lesson, Word } from "./content.ts";
import { practiceWords } from "./content.ts";
import { speak, canSpeak } from "./speak.ts";
import { speakKokoro, unlockAudio, onKokoroProgress, type Progress } from "./kokoro.ts";

interface ReadModeProps {
  lesson: Lesson;
  onDone: () => void;
}

const SESSION_SIZE = 12;

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

  const words = useMemo<Word[]>(() => {
    const a = [...pool];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a.slice(0, SESSION_SIZE);
  }, [pool]);

  const [i, setI] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [tally, setTally] = useState({ got: 0, missed: 0 });
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [prog, setProg] = useState<Progress | null>(null);
  const [audioOn, setAudioOn] = useState(() => {
    try {
      return localStorage.getItem("shavian-practice.audio") !== "off";
    } catch {
      return true;
    }
  });

  useEffect(() => onKokoroProgress(setProg), []);

  const toggleAudio = () =>
    setAudioOn((on) => {
      const next = !on;
      try {
        localStorage.setItem("shavian-practice.audio", next ? "on" : "off");
      } catch {
        /* storage may be unavailable */
      }
      return next;
    });

  const word = words[i];
  const finished = i >= words.length;

  const next = (got: boolean) => {
    setTally((t) => ({
      got: t.got + (got ? 1 : 0),
      missed: t.missed + (got ? 0 : 1),
    }));
    setRevealed(false);
    setI((n) => n + 1);
  };

  if (finished) {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1rem", padding: "2rem" }}>
        <h2>Session complete</h2>
        <p style={{ fontSize: "1.2rem" }}>
          {tally.got} ✓ · {tally.missed} ✗
        </p>
        <button onClick={onDone} style={{ borderColor: "var(--accent)" }}>
          Back to lesson
        </button>
      </div>
    );
  }

  const answers = homophones.get(word.shavian) ?? [word.english];

  // homophones share pronunciation, so any spelling works
  const playWord = async (text: string) => {
    try {
      setVoiceLoading(true);
      await speakKokoro(text);
    } catch {
      speak(text); // fall back to the built-in voice if Kokoro fails
    } finally {
      setVoiceLoading(false);
    }
  };

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

  const reveal = () => {
    setRevealed(true);
    if (!audioOn) return;
    unlockAudio(); // resume AudioContext within this tap (iOS requirement)
    void playWord(answers[0]);
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
        <span style={{ color: "#999", fontSize: "0.85rem" }}>
          {i + 1} / {words.length}
        </span>
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
        <span style={{ flex: 1 }} />
        {!revealed ? (
          <button onClick={reveal} style={{ borderColor: "var(--accent)" }}>
            Reveal
          </button>
        ) : (
          <>
            <button onClick={() => next(false)}>Missed ✗</button>
            <button onClick={() => next(true)} style={{ borderColor: "var(--accent)" }}>
              Got it ✓
            </button>
          </>
        )}
      </div>
    </div>
  );
}
