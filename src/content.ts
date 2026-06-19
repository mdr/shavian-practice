// Typed access to the build-time-generated content bundle.
import data from "./content/lessons.json";

export interface Letter {
  glyph: string;
  keyword: string;
  lesson: number;
}

export interface NewLetter {
  glyph: string;
  keyword: string;
  mnemonic: string;
}

export interface Word {
  english: string;
  shavian: string;
}

export interface Lesson {
  id: number;
  title: string;
  newLetters: NewLetter[];
  unlockedGlyphs: string[];
  curatedWords: Word[];
  generatedWords: Word[];
}

export interface Content {
  letters: Letter[];
  lessons: Lesson[];
}

export const content = data as Content;
export const lessons = content.lessons;

export function getLesson(id: number): Lesson | undefined {
  return lessons.find((l) => l.id === id);
}

/** Curated seeds first (hand-vetted), then frequency-ranked generated words. */
export function practiceWords(lesson: Lesson): Word[] {
  return [...lesson.curatedWords, ...lesson.generatedWords];
}
