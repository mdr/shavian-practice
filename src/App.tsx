import { useEffect, useState } from "react";
import "./fonts.css";
import { getLesson, lessons } from "./content.ts";
import * as P from "./progress.ts";
import { useHashRoute } from "./route.ts";
import { useColour, setColour } from "./colour.ts";
import Home from "./Home.tsx";
import Lesson from "./Lesson.tsx";

export default function App() {
  const [route, navigate] = useHashRoute();
  const [progress, setProgress] = useState<P.Progress>(() => P.load());
  const [allowTouch, setAllowTouch] = useState(false);

  const lesson = route.name === "lesson" ? getLesson(route.id) : undefined;

  // Mark a lesson visited whenever we land on it (including via back/forward or
  // a deep link), not only when opened from the home list.
  useEffect(() => {
    if (lesson) setProgress((p) => P.markVisited(p, lesson.id));
  }, [lesson?.id]);

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
          onClick={() => navigate({ name: "home" })}
          style={{ border: "none", background: "none", padding: 0, cursor: "pointer" }}
        >
          <strong>Shavian Practice</strong>
        </button>
        {lesson && (
          <>
            <span style={{ color: "#999" }}>›</span>
            <select
              value={lesson.id}
              onChange={(e) =>
                navigate({
                  name: "lesson",
                  id: Number(e.target.value),
                  mode: route.name === "lesson" ? route.mode : "intro",
                })
              }
              style={{
                font: "inherit",
                padding: "0.25rem 0.4rem",
                border: "1px solid var(--rule-strong)",
                borderRadius: 6,
                background: "white",
                color: "var(--ink)",
              }}
            >
              {lessons.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.title}
                </option>
              ))}
            </select>
          </>
        )}
        <span style={{ flex: 1 }} />
        <label style={{ fontSize: "0.85rem", display: "flex", gap: "0.35rem", alignItems: "center" }}>
          <input
            type="checkbox"
            checked={useColour()}
            onChange={(e) => setColour(e.target.checked)}
          />
          colour
        </label>
        <label style={{ fontSize: "0.85rem", display: "flex", gap: "0.35rem", alignItems: "center" }}>
          <input
            type="checkbox"
            checked={allowTouch}
            onChange={(e) => setAllowTouch(e.target.checked)}
          />
          finger
        </label>
      </header>

      {route.name === "home" || !lesson ? (
        <Home
          progress={progress}
          onOpen={(id) => navigate({ name: "lesson", id, mode: "intro" })}
        />
      ) : (
        <Lesson
          lesson={lesson}
          allowTouch={allowTouch}
          mode={route.mode}
          onMode={(mode) => navigate({ name: "lesson", id: lesson.id, mode })}
          onTraced={() => setProgress((p) => P.markTraced(p, lesson.id))}
        />
      )}
    </>
  );
}
