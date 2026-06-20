import { useMemo, useState } from "react";
import ShavianText from "./ShavianText.tsx";
import type { Lesson, Word } from "./content.ts";
import { practiceWords } from "./content.ts";

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

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "1rem", padding: "0.75rem", minHeight: 0 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: "1rem" }}>
        <span style={{ color: "#777" }}>read this:</span>
        <span style={{ marginLeft: "auto", color: "#999", fontSize: "0.85rem" }}>
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
          <div style={{ fontSize: "1.6rem", color: "var(--ink)" }}>
            {answers.join(" / ")}
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
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
