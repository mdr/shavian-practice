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

// STT often returns numerals for number words ("six" -> "6"). Canonicalise both
// to the digit form so they match either way.
const NUM: Record<string, string> = {
  zero: "0", one: "1", two: "2", three: "3", four: "4", five: "5", six: "6",
  seven: "7", eight: "8", nine: "9", ten: "10", eleven: "11", twelve: "12",
  thirteen: "13", fourteen: "14", fifteen: "15", sixteen: "16", seventeen: "17",
  eighteen: "18", nineteen: "19", twenty: "20", thirty: "30", forty: "40",
  fifty: "50", sixty: "60", seventy: "70", eighty: "80", ninety: "90",
  hundred: "100", thousand: "1000",
};
const numCanon = (t: string) => NUM[t] ?? t;

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
  const consumedRef = useRef(0); // final results (utterances) already scored
  const pendingSkipRef = useRef(0); // results to skip (interim-✓'d utterances)
  const busyRef = useRef(false); // showing a flash
  const listeningRef = useRef(false);
  const recRef = useRef<{ start: () => void; stop: () => void; abort: () => void } | null>(null);

  const answersOf = (w: Word) => homophones.get(w.shavian) ?? [w.english];
  // Accept the word itself, its in-lesson homophones, and any lexicon homophone
  // (same Shavian spelling) — the recogniser may return any of them.
  const acceptable = (w: Word) =>
    new Set(
      [w.english, ...answersOf(w), ...(w.homophones ?? [])].map((x) =>
        numCanon(normalize(x)),
      ),
    );

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

  // Both hit and miss freeze on the *current* word while the flash shows, then
  // advance — so the next word never appears under the flash.
  const flashAndAdvance = (fb: Feedback, ms: number) => {
    busyRef.current = true;
    setFeedback(fb);
    setTranscript("");
    window.setTimeout(() => {
      setFeedback(null);
      setTranscript("");
      busyRef.current = false;
      advance();
    }, ms);
  };

  const flashHit = (heard: string) => {
    setTally((t) => ({ correct: t.correct + 1, total: t.total + 1 }));
    flashAndAdvance({ kind: "hit", heard }, 1100);
  };

  const missDwell = (heard: string) => {
    const w = deckRef.current[iRef.current];
    const shown = heard.split(" ").slice(0, 6).join(" "); // cap a run-on sentence
    setTally((t) => ({ correct: t.correct, total: t.total + 1 }));
    flashAndAdvance({ kind: "miss", heard: shown, answer: answersOf(w).join(" / ") }, 1500);
  };

  const handleResult = (event: { results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => {
    const finals: string[] = []; // one entry per finalised utterance
    let interim = "";
    for (let k = 0; k < event.results.length; k++) {
      const r = event.results[k];
      if (r.isFinal) finals.push(r[0].transcript);
      else interim += " " + r[0].transcript;
    }
    if (busyRef.current) return; // finals just accumulate; consumed once the flash ends

    const interimToks = normalize(interim).split(" ").filter(Boolean);
    // Hide the live transcript while a previous utterance is still finalising.
    setTranscript(pendingSkipRef.current > 0 ? "" : interim.trim());

    // Each finalised utterance is ONE attempt for the current word — a whole
    // sentence is consumed at once, never queued across later words.
    while (consumedRef.current < finals.length) {
      if (pendingSkipRef.current > 0) {
        pendingSkipRef.current--;
        consumedRef.current++;
        continue;
      }
      const utter = finals[consumedRef.current];
      consumedRef.current++;
      const toks = normalize(utter).split(" ").filter(Boolean);
      const A = acceptable(deckRef.current[iRef.current]);
      const matched = toks.find((t) => A.has(numCanon(t)));
      if (matched) flashHit(matched);
      else missDwell(normalize(utter));
      return;
    }

    // Otherwise ✓ instantly the moment the live interim matches; mark the whole
    // utterance to be skipped when it finalises.
    const A = acceptable(deckRef.current[iRef.current]);
    const match = interimToks.find((t) => A.has(numCanon(t)));
    if (match) {
      pendingSkipRef.current++;
      flashHit(match);
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
