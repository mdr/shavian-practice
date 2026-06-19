# Shavian Writing Practice — Design

A web app for learning to **write** Shavian by hand on an iPad with the Apple Pencil,
following the [shavian.school](http://shavian.school) syllabus but oriented around
*producing* the glyphs rather than reading them.

## Goals & constraints

- **Primary device:** iPad Safari + Apple Pencil.
- **Deployment:** static site on GitHub Pages (no backend).
- **Dev environment:** managed as a Nix flake.
- **Pedagogy:** follow shavian.school's letter-introduction order; practice is *writing*.

## Locked decisions

| # | Decision | Choice |
|---|----------|--------|
| 1 | Core "did I write it right?" mechanic | Tracing (ghost overlay) + free-recall with **self-assessment**. **Automated handwriting recognition is out of scope.** |
| 2 | Glyph representation | **Shavian webfont, shape only.** No directional/stroke guidance — there is *no authoritative Shavian stroke-order data* (letters are single-stroke by design), so we won't invent one. |
| 3 | Tracing scoring | **None.** Free tracing against a ghost. The app has **zero pixel-comparison logic** anywhere. |
| 4 | Frontend framework | **React + Vite + TypeScript.** (Familiarity tiebreaker.) |
| 5 | Recall prompt | **Whole English word → draw the Shavian spelling.** User understands Shavian is phonemic. |
| 6 | Word selection per lesson | **Letter-gated** (only glyphs unlocked so far) + **frequency-ranked** (BNC). Auto-generated. |
| 7 | Word sources | **Curated seed (shavian.school) + readlex expansion.** Homographs **skipped** in generated practice (curated seed kept verbatim). |
| 8 | Persistence / SRS | **Simple localStorage progress now**; data model built so **spaced repetition can be added later**. Single-device, best-effort. |
| 9 | Practice surface | **Split by mode:** tracing = ruled **worksheet row** (repeat across the line); recall = single-shot **card**. Shared ruled-guideline canvas. |
| 10 | Teaching in-app | **Minimal intro card** per lesson: new glyph(s) + keyword + **freshly-written** one-line mnemonic (not copied from shavian.school). |
| 11 | Pencil input + ink | Pointer Events (`pen`) + `getCoalescedEvents()`; **pen-only palm rejection** (finger toggle, off by default); **pressure ink via `perfect-freehand`** on **Canvas 2D**; undo/clear. |
| 12 | Lesson navigation | **Free-roam** + suggested-next + per-lesson progress markers. No hard gating. |
| 13 | Build order | **Walking skeleton first** (de-risk pencil-on-iPad before building content). |

## Data sources

- **Read Lexicon** — [Shavian-info/readlex](https://github.com/Shavian-info/readlex), **MIT licensed**.
  Fields per entry: Latin spelling, Shavian spelling, part-of-speech (C5 tagset),
  RP/IPA pronunciation, BNC word frequency. Bundle as a static asset; drives gating + ranking.
- **shavian.school lessons** — [Shavian-School/Shavian-School.github.io](https://github.com/Shavian-School/Shavian-School.github.io),
  `lessons/0..12.md`. Parseable: new letters via `<mark>𐑕</mark>` + `<strong>`/`**bold**` keyword;
  curated practice words via `<details><summary>SHAVIAN</summary><p>english</p></details>`.
  - Extracted: **47 letters in introduction order** (Lessons 1–10) + **131 curated words**.
  - Glyph→keyword mappings are facts (used freely); their prose mnemonics are theirs (not copied).

## v1 scope

**In:** Nix flake + Vite/React/TS scaffold + GH Pages Actions deploy; ruled pencil canvas;
readlex bundled + parsed; lesson order + curated seed words as content data; free-roam lesson
list with localStorage progress; per-lesson intro cards; tracing worksheet rows; recall cards
(English → draw → reveal Shavian → self-assess) with letter-gated + frequency-ranked readlex
expansion (homographs skipped).

**Deferred (explicitly out of v1):** spaced repetition; Lesson 11 extras (namer-dot,
punctuation, ligatures, 48th letter 𐑙); finger-draw toggle; cross-device sync / export-import;
audio.

## First milestone (walking skeleton)

Minimum that gets real ink on the iPad, deployed:
Nix flake + Vite + React + TS, GitHub Pages Actions deploy, and the ruled-canvas component
with pen input + `perfect-freehand` + undo/clear — and nothing else. Test on the iPad day one,
then layer content on a validated surface.
