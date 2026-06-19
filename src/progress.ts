// Best-effort progress, persisted to localStorage (single-device, per Q8).
// The shape is intentionally simple but leaves room for spaced repetition later.

import { lessons } from "./content.ts";

const KEY = "shavian-practice.progress.v1";

export interface LessonProgress {
  visited: boolean;
  tracedAt?: number;
  recalledAt?: number;
  got: number;
  missed: number;
}

export interface Progress {
  lastLessonId?: number;
  lessons: Record<number, LessonProgress>;
}

function empty(): Progress {
  return { lessons: {} };
}

export function load(): Progress {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty();
    const parsed = JSON.parse(raw) as Partial<Progress>;
    return { lastLessonId: parsed.lastLessonId, lessons: parsed.lessons ?? {} };
  } catch {
    return empty();
  }
}

export function save(p: Progress): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    // storage may be unavailable / evicted — progress is best-effort.
  }
}

function lessonOf(p: Progress, id: number): LessonProgress {
  return (p.lessons[id] ??= { visited: false, got: 0, missed: 0 });
}

export function markVisited(p: Progress, id: number): Progress {
  lessonOf(p, id).visited = true;
  p.lastLessonId = id;
  save(p);
  return { ...p };
}

export function markTraced(p: Progress, id: number): Progress {
  lessonOf(p, id).tracedAt = Date.now();
  save(p);
  return { ...p };
}

export function recordRecall(p: Progress, id: number, got: boolean): Progress {
  const l = lessonOf(p, id);
  l.recalledAt = Date.now();
  if (got) l.got += 1;
  else l.missed += 1;
  save(p);
  return { ...p };
}

/** First lesson the learner hasn't visited yet (their recommended next step). */
export function suggestedNextId(p: Progress): number {
  const next = lessons.find((l) => !p.lessons[l.id]?.visited);
  return (next ?? lessons[lessons.length - 1]).id;
}
