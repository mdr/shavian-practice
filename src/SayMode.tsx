import { useEffect, useMemo, useRef, useState } from "react";
import ShavianText from "./ShavianText.tsx";
import type { Lesson, Word } from "./content.ts";
import { practiceWords } from "./content.ts";

interface SayModeProps {
  lesson: Lesson;
  onDone: () => void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SRClass: any =
  typeof window !== "undefined"
    ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    : undefined;

function shuffle(a: Word[]): Word[] {
  const r = [...a];
  for (let k = r.length - 1; k > 0; k--) {
    const j = Math.floor(Math.random() * (k + 1));
    [r[k], r[j]] = [r[j], r[k]];
  }
  return r;
}

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

type Feedback =
  | { kind: "hit"; heard: string }
  | { kind: "miss"; heard: string; answer: string };

export default function SayMode({ lesson, onDone }: SayModeProps) {
  const pool = useMemo(() => practiceWords(lesson), [lesson]);
  const homophones = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const w of pool) {
      const list = m.get(w.shavian) ?? [];
      if (!list.includes(w.english)) list.push(w.english);
      m.set(w.shavian, list);
    }
    return m;
  }, [pool]);

  const supported = !!SRClass;

  const [deck, setDeck] = useState<Word[]>(() => shuffle(pool));
  const [i, setI] = useState(0);
  const [tally, setTally] = useState({ correct: 0, total: 0 });
  const [transcript, setTranscript] = useState("");
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [started, setStarted] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState("");

  // Mutable state the recognition handler reads/writes (it's wired up once).
  const deckRef = useRef(deck);
  deckRef.current = deck;
  const iRef = useRef(0);
  const cursorRef = useRef(0); // committed final tokens already scored
  const creditedInterimRef = useRef(false); // current utterance already ✓'d via interim — skip its finalisation
  const liveFinalCountRef = useRef(0); // final-token count seen (tracked even while dwelling)
  const busyRef = useRef(false); // dwelling on a miss
  const listeningRef = useRef(false);
  const recRef = useRef<{ start: () => void; stop: () => void; abort: () => void } | null>(null);

  const answersOf = (w: Word) => homophones.get(w.shavian) ?? [w.english];
  const acceptable = (w: Word) => new Set(answersOf(w).map(normalize));

  const advance = () => {
    const ni = iRef.current + 1;
    if (ni < deckRef.current.length) {
      iRef.current = ni;
      setI(ni);
    } else {
      const nd = shuffle(pool);
      deckRef.current = nd;
      iRef.current = 0;
      setDeck(nd);
      setI(0);
    }
  };

  const flashHit = (heard: string) => {
    setFeedback({ kind: "hit", heard });
    setTally((t) => ({ correct: t.correct + 1, total: t.total + 1 }));
    setTranscript("");
    window.setTimeout(() => setFeedback((f) => (f?.kind === "hit" ? null : f)), 500);
    advance();
  };

  const missDwell = (heard: string) => {
    const w = deckRef.current[iRef.current];
    busyRef.current = true; // freeze scoring while the answer is shown
    setTally((t) => ({ correct: t.correct, total: t.total + 1 }));
    setFeedback({ kind: "miss", heard, answer: answersOf(w).join(" / ") });
    window.setTimeout(() => {
      setFeedback(null);
      setTranscript("");
      cursorRef.current = liveFinalCountRef.current; // discard anything said during the dwell
      creditedInterimRef.current = false;
      busyRef.current = false;
      advance();
    }, 1500);
  };

  const handleResult = (event: { results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => {
    const finalToks: string[] = [];
    let interim = "";
    for (let k = 0; k < event.results.length; k++) {
      const r = event.results[k];
      if (r.isFinal) {
        for (const t of normalize(r[0].transcript).split(" ")) if (t) finalToks.push(t);
      } else {
        interim += " " + r[0].transcript;
      }
    }
    liveFinalCountRef.current = finalToks.length; // track even while dwelling
    if (busyRef.current) return;

    const interimToks = normalize(interim).split(" ").filter(Boolean);
    // While a credited utterance is still finalising, its interim belongs to the
    // *previous* word — don't show it on the new card.
    setTranscript(
      creditedInterimRef.current
        ? ""
        : [...finalToks.slice(cursorRef.current), ...interimToks].join(" "),
    );

    // Score each committed final token in order — one per word.
    while (cursorRef.current < finalToks.length) {
      if (creditedInterimRef.current) {
        // this utterance was already ✓'d on its interim — consume its finalisation
        creditedInterimRef.current = false;
        cursorRef.current++;
        continue;
      }
      const tok = finalToks[cursorRef.current];
      cursorRef.current++;
      if (acceptable(deckRef.current[iRef.current]).has(tok)) {
        flashHit(tok);
      } else {
        missDwell(tok); // begins the reveal; stop processing this event
        return;
      }
    }

    // Instant ✓ on the live interim, then skip that utterance when it finalises.
    if (!creditedInterimRef.current) {
      const A = acceptable(deckRef.current[iRef.current]);
      const match = interimToks.find((t) => A.has(t));
      if (match) {
        flashHit(match);
        creditedInterimRef.current = true;
      }
    }
  };

  const start = () => {
    if (!supported) return;
    setStarted(true);
    setError("");
    listeningRef.current = true;
    setListening(true);
    const rec = new SRClass();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-GB";
    rec.maxAlternatives = 1;
    rec.onresult = handleResult;
    rec.onerror = (e: { error: string }) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        setError("Microphone permission denied.");
        listeningRef.current = false;
        setListening(false);
      }
    };
    rec.onend = () => {
      if (listeningRef.current) {
        try {
          rec.start();
        } catch {
          /* already starting */
        }
      }
    };
    recRef.current = rec;
    try {
      rec.start();
    } catch {
      /* ignore */
    }
  };

  const pause = () => {
    listeningRef.current = false;
    setListening(false);
    recRef.current?.stop();
  };

  // Stop recognition when leaving the mode.
  useEffect(() => {
    return () => {
      listeningRef.current = false;
      recRef.current?.abort();
    };
  }, []);

  if (!supported) {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1rem", padding: "2rem", textAlign: "center" }}>
        <p style={{ maxWidth: "28rem", color: "#555" }}>
          Speaking practice needs the Web Speech API, which this browser doesn't
          support. Try it in <strong>desktop Chrome</strong>.
        </p>
        <button onClick={onDone} style={{ borderColor: "var(--accent)" }}>
          Back to lesson
        </button>
      </div>
    );
  }

  const word = deck[i];
  const accuracy = tally.total ? Math.round((tally.correct / tally.total) * 100) : 0;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "1rem", padding: "0.75rem", minHeight: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <span style={{ color: "#777" }}>say this word:</span>
        <span style={{ flex: 1 }} />
        {listening && (
          <span style={{ fontSize: "0.8rem", color: "#3f8f5e", display: "flex", alignItems: "center", gap: "0.35rem" }}>
            <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#3f8f5e", display: "inline-block" }} />
            listening
          </span>
        )}
        {tally.total > 0 && (
          <span style={{ color: "#999", fontSize: "0.85rem" }}>
            {tally.correct}/{tally.total} · {accuracy}%
          </span>
        )}
      </div>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1.25rem",
          background: feedback?.kind === "hit" ? "#eaf6ee" : feedback?.kind === "miss" ? "#fbece8" : "#fff",
          border: "1px solid var(--rule)",
          borderRadius: 12,
          padding: "1rem",
          transition: "background 0.15s",
        }}
      >
        <ShavianText text={word.shavian} style={{ fontSize: "4rem", lineHeight: 1 }} />

        <span style={{ minHeight: "1.5rem", color: "#999", fontSize: "1rem" }}>
          {transcript ? `“${transcript}”` : started && listening ? "…" : ""}
        </span>

        {/* Feedback is absolutely positioned so it never shifts the word. */}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: "0.9rem",
            padding: "0 1rem",
            textAlign: "center",
            pointerEvents: "none",
          }}
        >
          {feedback?.kind === "hit" && (
            <span style={{ fontSize: "1.4rem", color: "#3f8f5e" }}>
              ✓ “{feedback.heard}”
            </span>
          )}
          {feedback?.kind === "miss" && (
            <span style={{ fontSize: "1.1rem", color: "#c2533b" }}>
              ✗ heard “{feedback.heard}” · answer: <strong>{feedback.answer}</strong>
            </span>
          )}
          {error && <span style={{ color: "#c2533b", fontSize: "0.85rem" }}>{error}</span>}
        </div>
      </div>

      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
        <button onClick={onDone}>Done</button>
        <span style={{ flex: 1 }} />
        {!started ? (
          <span style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <span style={{ fontSize: "0.78rem", color: "#888" }}>
              read each word aloud — hands-free
            </span>
            <button onClick={start} style={{ borderColor: "var(--accent)" }}>
              🎤 Start
            </button>
          </span>
        ) : listening ? (
          <button onClick={pause}>Pause</button>
        ) : (
          <button onClick={start} style={{ borderColor: "var(--accent)" }}>
            Resume
          </button>
        )}
      </div>
    </div>
  );
}
