import { useState } from "react";
import "./fonts.css";
import { getLesson } from "./content.ts";
import * as P from "./progress.ts";
import Home from "./Home.tsx";
import Lesson from "./Lesson.tsx";

type View = { type: "home" } | { type: "lesson"; id: number };

export default function App() {
  const [view, setView] = useState<View>({ type: "home" });
  const [progress, setProgress] = useState<P.Progress>(() => P.load());
  const [allowTouch, setAllowTouch] = useState(false);

  const openLesson = (id: number) => {
    setProgress((p) => P.markVisited(p, id));
    setView({ type: "lesson", id });
  };

  const lesson = view.type === "lesson" ? getLesson(view.id) : undefined;

  return (
    <>
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          padding: "0.6rem 1rem",
          borderBottom: "1px solid var(--rule-strong)",
        }}
      >
        <button
          onClick={() => setView({ type: "home" })}
          style={{ border: "none", background: "none", padding: 0, cursor: "pointer" }}
        >
          <strong>Shavian Practice</strong>
        </button>
        {lesson && (
          <span style={{ color: "#999" }}>› {lesson.title}</span>
        )}
        <span style={{ flex: 1 }} />
        <label style={{ fontSize: "0.85rem", display: "flex", gap: "0.35rem", alignItems: "center" }}>
          <input
            type="checkbox"
            checked={allowTouch}
            onChange={(e) => setAllowTouch(e.target.checked)}
          />
          finger
        </label>
      </header>

      {view.type === "home" || !lesson ? (
        <Home progress={progress} onOpen={openLesson} />
      ) : (
        <Lesson
          lesson={lesson}
          allowTouch={allowTouch}
          onTraced={() => setProgress((p) => P.markTraced(p, lesson.id))}
          onRecall={(got) =>
            setProgress((p) => P.recordRecall(p, lesson.id, got))
          }
        />
      )}
    </>
  );
}
