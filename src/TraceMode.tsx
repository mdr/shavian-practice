import { useMemo, useState } from "react";
import WritingSheet from "./WritingSheet.tsx";
import ShavianText from "./ShavianText.tsx";
import type { Lesson } from "./content.ts";
import { practiceWords } from "./content.ts";

interface TraceModeProps {
  lesson: Lesson;
  allowTouch: boolean;
  onDone: () => void;
}

interface Item {
  ghost: string;
  label: string;
  keyword?: string;
  name?: string;
}

export default function TraceMode({
  lesson,
  allowTouch,
  onDone,
}: TraceModeProps) {
  // New letters first (build the shapes), then a handful of words.
  const items = useMemo<Item[]>(() => {
    const letters: Item[] = lesson.newLetters.map((l) => ({
      ghost: l.glyph,
      label: l.glyph,
      keyword: l.keyword,
      name: l.name,
    }));
    const pool = [...practiceWords(lesson)];
    for (let k = pool.length - 1; k > 0; k--) {
      const j = Math.floor(Math.random() * (k + 1));
      [pool[k], pool[j]] = [pool[j], pool[k]];
    }
    const words: Item[] = pool
      .slice(0, 6)
      .map((w) => ({ ghost: w.shavian, label: w.english }));
    return [...letters, ...words];
  }, [lesson]);

  const [i, setI] = useState(0);
  const item = items[i];
  // A single letter gets several rows to drill; a word gets fewer, wider reps.
  const isLetter = item.label === item.ghost;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.6rem", padding: "0.75rem", minHeight: 0 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: "1rem" }}>
        <ShavianText text={item.ghost} style={{ fontSize: "2rem" }} />
        <span style={{ color: "#555" }}>
          {item.keyword ? (
            <>
              <strong>{item.name}</strong> · as in <strong>{item.keyword}</strong>
            </>
          ) : (
            <>
              write: <strong>{item.label}</strong>
            </>
          )}
        </span>
        <span style={{ marginLeft: "auto", color: "#999", fontSize: "0.85rem" }}>
          {i + 1} / {items.length}
        </span>
      </div>

      <WritingSheet
        allowTouch={allowTouch}
        rows={isLetter ? 6 : 4}
        ghost={item.ghost}
        ghostRepeat
        resetKey={i}
        actions={
          <>
            <button onClick={() => setI((n) => Math.max(0, n - 1))} disabled={i === 0}>
              ‹ Prev
            </button>
            {i < items.length - 1 ? (
              <button onClick={() => setI((n) => n + 1)}>Next ›</button>
            ) : (
              <button onClick={onDone} style={{ borderColor: "var(--accent)" }}>
                Done
              </button>
            )}
          </>
        }
      />
    </div>
  );
}
