# Vendored data sources

## `readlex.tsv` — the Read Lexicon

A spelling dictionary for the Shavian alphabet (rhotic RP).
Source: <https://github.com/Shavian-info/readlex>, **MIT licensed**.
Columns: `latin ⇥ shavian ⇥ part-of-speech (C5) ⇥ IPA ⇥ BNC frequency`.

Used at build time only (`scripts/build-content.mjs`) to generate small,
letter-gated, frequency-ranked per-lesson word lists. The full lexicon is **not**
shipped to the browser.

## `lessons/*.md` — shavian.school lessons

Source: <https://github.com/Shavian-School/Shavian-School.github.io>.
Used at build time only, to extract two kinds of *facts* (not copyrightable):
the letter-introduction order (glyph + keyword) and the curated practice word
pairs. shavian.school's lesson prose and mnemonics are **not** reproduced — the
in-app mnemonics in `data/mnemonics.json` are written fresh for this project.
