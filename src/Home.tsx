import { lessons } from "./content.ts";
import type { Progress } from "./progress.ts";
import { suggestedNextId } from "./progress.ts";

interface HomeProps {
  progress: Progress;
  onOpen: (lessonId: number) => void;
}

export default function Home({ progress, onOpen }: HomeProps) {
  const nextId = suggestedNextId(progress);

  return (
    <main style={{ flex: 1, overflow: "auto", padding: "1rem" }}>
      <p style={{ color: "#555", maxWidth: "40rem" }}>
        Practice <em>writing</em> Shavian with the Apple Pencil. Trace the shapes,
        then write whole words from memory. Pick up where you left off, or jump
        anywhere.
      </p>

      <ul
        style={{
          listStyle: "none",
          padding: 0,
          display: "grid",
          gap: "0.6rem",
          gridTemplateColumns: "repeat(auto-fill, minmax(15rem, 1fr))",
          maxWidth: "60rem",
        }}
      >
        {lessons.map((l) => {
          const p = progress.lessons[l.id];
          const isNext = l.id === nextId;
          return (
            <li key={l.id}>
              <button
                onClick={() => onOpen(l.id)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "0.85rem 1rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.35rem",
                  borderColor: isNext ? "var(--accent)" : "var(--rule)",
                  borderWidth: isNext ? 2 : 1,
                  background: p?.visited ? "#fff" : "#fbfaf6",
                }}
              >
                <span
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <strong>{l.title}</strong>
                  {isNext && (
                    <span style={{ color: "var(--accent)", fontSize: "0.8rem" }}>
                      next ›
                    </span>
                  )}
                </span>
                <span
                  className="shavian"
                  style={{ fontSize: "1.5rem", letterSpacing: "0.1em" }}
                >
                  {l.newLetters.map((n) => n.glyph).join("")}
                </span>
                <span style={{ fontSize: "0.78rem", color: "#777" }}>
                  {l.newLetters.length} letters
                  {p?.visited ? " · visited" : ""}
                  {p && p.got + p.missed > 0
                    ? ` · ${p.got}✓ / ${p.missed}✗`
                    : ""}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
