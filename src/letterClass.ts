// Shavian letter height-classes (the real "tall / deep / short" jargon).
//
// Tall  = voiceless consonants (+ Yea, Hung) — rise above the x-height.
// Deep  = voiced consonants (+ Haha) — drop below the baseline.
// Short = vowels, liquids (l, r) and nasals (m, n) — sit on the baseline.
// Source: https://en.wikipedia.org/wiki/Shavian_alphabet

export type LetterClass = "tall" | "deep" | "short" | "other";

const TALL = new Set([
  "𐑐", "𐑑", "𐑒", "𐑓", "𐑔", "𐑕", "𐑖", "𐑗", "𐑘", "𐑙",
]);
const DEEP = new Set([
  "𐑚", "𐑛", "𐑜", "𐑝", "𐑞", "𐑟", "𐑠", "𐑡", "𐑢", "𐑣",
]);
const SHORT = new Set([
  // vowels
  "𐑦", "𐑰", "𐑧", "𐑱", "𐑨", "𐑲", "𐑩", "𐑪", "𐑳", "𐑴",
  "𐑵", "𐑫", "𐑬", "𐑶", "𐑭", "𐑷", "𐑸", "𐑹", "𐑺", "𐑻",
  "𐑼", "𐑽", "𐑾", "𐑿",
  // liquids + nasals
  "𐑤", "𐑮", "𐑥", "𐑯",
]);

export function classOf(glyph: string): LetterClass {
  if (TALL.has(glyph)) return "tall";
  if (DEEP.has(glyph)) return "deep";
  if (SHORT.has(glyph)) return "short";
  return "other";
}

export const CLASS_COLOR: Record<LetterClass, string> = {
  tall: "#2f6db5", // blue — rises
  deep: "#c2533b", // terracotta — drops
  short: "#3f8f5e", // green — sits
  other: "#555555",
};

export const CLASS_LABEL: Record<LetterClass, string> = {
  tall: "tall",
  deep: "deep",
  short: "short",
  other: "",
};
