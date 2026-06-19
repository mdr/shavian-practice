import { Fragment, useState } from "react";
import type { Lesson as LessonData } from "./content.ts";
import TraceMode from "./TraceMode.tsx";
import RecallMode from "./RecallMode.tsx";
import ShavianText from "./ShavianText.tsx";
import { CLASS_COLOR } from "./letterClass.ts";

function ClassLegend() {
  const items: [string, "tall" | "deep" | "short"][] = [
    ["tall (voiceless)", "tall"],
    ["deep (voiced)", "deep"],
    ["short (vowels, l/r, m/n)", "short"],
  ];
  return (
    <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", margin: "0.25rem 0 1rem", fontSize: "0.8rem", color: "#666" }}>
      {items.map(([label, cls]) => (
        <span key={cls} style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
          <span style={{ width: 12, height: 12, borderRadius: 3, background: CLASS_COLOR[cls] }} />
          {label}
        </span>
      ))}
    </div>
  );
}

interface LessonProps {
  lesson: LessonData;
  allowTouch: boolean;
  onTraced: () => void;
  onRecall: (got: boolean) => void;
}

type Sub = "intro" | "trace" | "recall";

/** Render *emphasis* in the hand-written mnemonics without a markdown dep. */
function Mnemonic({ text }: { text: string }) {
  return (
    <>
      {text.split("*").map((part, idx) =>
        idx % 2 === 1 ? (
          <em key={idx}>{part}</em>
        ) : (
          <Fragment key={idx}>{part}</Fragment>
        ),
      )}
    </>
  );
}

export default function Lesson({
  lesson,
  allowTouch,
  onTraced,
  onRecall,
}: LessonProps) {
  const [sub, setSub] = useState<Sub>("intro");

  if (sub === "trace") {
    return (
      <TraceMode
        lesson={lesson}
        allowTouch={allowTouch}
        onDone={() => {
          onTraced();
          setSub("intro");
        }}
      />
    );
  }

  if (sub === "recall") {
    return (
      <RecallMode
        lesson={lesson}
        allowTouch={allowTouch}
        onRecord={onRecall}
        onDone={() => setSub("intro")}
      />
    );
  }

  return (
    <main style={{ flex: 1, overflow: "auto", padding: "1rem" }}>
      <h2 style={{ marginTop: 0, marginBottom: "0.5rem" }}>{lesson.title}</h2>
      <ClassLegend />

      <div
        style={{
          display: "grid",
          gap: "0.75rem",
          gridTemplateColumns: "repeat(auto-fill, minmax(16rem, 1fr))",
          maxWidth: "60rem",
        }}
      >
        {lesson.newLetters.map((l) => (
          <div
            key={l.glyph}
            style={{
              display: "flex",
              gap: "0.9rem",
              alignItems: "center",
              padding: "0.85rem 1rem",
              background: "#fff",
              border: "1px solid var(--rule)",
              borderRadius: 12,
            }}
          >
            <ShavianText
              text={l.glyph}
              style={{ fontSize: "3rem", lineHeight: 1 }}
            />
            <span style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
              <span>
                <strong>{l.name}</strong>
                <span style={{ color: "#888" }}> · as in “{l.keyword}”</span>
              </span>
              <span style={{ fontSize: "0.9rem", color: "#555" }}>
                <Mnemonic text={l.mnemonic} />
              </span>
            </span>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.5rem" }}>
        <button
          onClick={() => setSub("trace")}
          style={{ borderColor: "var(--accent)" }}
        >
          ✏️ Trace the shapes
        </button>
        <button
          onClick={() => setSub("recall")}
          style={{ borderColor: "var(--accent)" }}
        >
          🧠 Practice words
        </button>
      </div>
    </main>
  );
}
