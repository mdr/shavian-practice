import { useMemo, useRef, useState } from "react";
import InkCanvas, { type InkCanvasHandle } from "./InkCanvas.tsx";
import ShavianText from "./ShavianText.tsx";
import type { Lesson, Word } from "./content.ts";
import { practiceWords } from "./content.ts";

interface RecallModeProps {
  lesson: Lesson;
  allowTouch: boolean;
  onRecord: (got: boolean) => void;
  onDone: () => void;
}

const SESSION_SIZE = 12;

export default function RecallMode({
  lesson,
  allowTouch,
  onRecord,
  onDone,
}: RecallModeProps) {
  const canvasRef = useRef<InkCanvasHandle>(null);

  // Draw a fresh, shuffled session from the whole gated pool each time, so
  // every word (curated seeds + frequency-ranked generated) is reachable and
  // sessions vary — rather than always replaying the first 12.
  const words = useMemo<Word[]>(() => {
    const pool = [...practiceWords(lesson)];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, SESSION_SIZE);
  }, [lesson]);

  const [i, setI] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [tally, setTally] = useState({ got: 0, missed: 0 });

  const word = words[i];
  const finished = i >= words.length;

  const assess = (got: boolean) => {
    onRecord(got);
    setTally((t) => ({
      got: t.got + (got ? 1 : 0),
      missed: t.missed + (got ? 0 : 1),
    }));
    canvasRef.current?.clear();
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

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.6rem", padding: "0.75rem", minHeight: 0 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: "1rem" }}>
        <span style={{ color: "#777" }}>write in Shavian:</span>
        <strong style={{ fontSize: "1.8rem" }}>{word.english}</strong>
        <span style={{ marginLeft: "auto", color: "#999", fontSize: "0.85rem" }}>
          {i + 1} / {words.length}
        </span>
      </div>

      <div
        style={{
          height: 72,
          background: "#fff",
          border: "1px solid var(--rule)",
          borderRadius: 10,
          overflow: "hidden",
        }}
      >
        <InkCanvas key={i} ref={canvasRef} allowTouch={allowTouch} />
      </div>

      <div
        style={{
          minHeight: "3.2rem",
          display: "flex",
          alignItems: "center",
          gap: "1rem",
          padding: "0.5rem 0.75rem",
          background: revealed ? "#f0f5fa" : "transparent",
          borderRadius: 8,
        }}
      >
        {revealed && (
          <>
            <span style={{ color: "#777" }}>answer:</span>
            <ShavianText text={word.shavian} style={{ fontSize: "2.2rem" }} />
          </>
        )}
      </div>

      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        <button onClick={() => canvasRef.current?.undo()}>Undo</button>
        <button onClick={() => canvasRef.current?.clear()}>Clear</button>
        <span style={{ flex: 1 }} />
        {!revealed ? (
          <button
            onClick={() => setRevealed(true)}
            style={{ borderColor: "var(--accent)" }}
          >
            Reveal
          </button>
        ) : (
          <>
            <button onClick={() => assess(false)}>Missed ✗</button>
            <button onClick={() => assess(true)} style={{ borderColor: "var(--accent)" }}>
              Got it ✓
            </button>
          </>
        )}
      </div>
    </div>
  );
}
