import { useEffect, useMemo, useRef, useState } from "react";
import InkCanvas, { type InkCanvasHandle } from "./InkCanvas.tsx";
import ShavianText from "./ShavianText.tsx";
import type { Lesson, Word } from "./content.ts";
import { practiceWords } from "./content.ts";

interface RecallModeProps {
  lesson: Lesson;
  allowTouch: boolean;
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

export default function RecallMode({
  lesson,
  allowTouch,
  onDone,
}: RecallModeProps) {
  const canvasRef = useRef<InkCanvasHandle>(null);
  const pool = useMemo(() => practiceWords(lesson), [lesson]);

  // An endlessly-cycling shuffled deck of the whole gated pool: reshuffle and
  // keep going when it runs out, so practice is open-ended.
  const [deck, setDeck] = useState<Word[]>(() => shuffle(pool));
  const [i, setI] = useState(0);
  const [count, setCount] = useState(1);
  const [revealed, setRevealed] = useState(false);

  const word = deck[i];

  const next = () => {
    canvasRef.current?.clear();
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
  spaceAction.current = () => (revealed ? next() : setRevealed(true));
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

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.6rem", padding: "0.75rem", minHeight: 0 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: "1rem" }}>
        <span style={{ color: "#777" }}>write in Shavian:</span>
        <strong style={{ fontSize: "1.8rem" }}>{word.english}</strong>
        <span style={{ marginLeft: "auto", color: "#999", fontSize: "0.85rem" }}>
          #{count}
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
        <InkCanvas key={count} ref={canvasRef} allowTouch={allowTouch} />
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
        <button
          onClick={() => canvasRef.current?.undo()}
          title="Undo last stroke (or two-finger tap)"
        >
          Undo
        </button>
        <button onClick={() => canvasRef.current?.clear()}>Clear</button>
        <button onClick={onDone}>Done</button>
        <span style={{ flex: 1 }} />
        {!revealed ? (
          <button
            onClick={() => setRevealed(true)}
            style={{ borderColor: "var(--accent)" }}
          >
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
