# shavian-practice

Learn to **write** the [Shavian alphabet](https://en.wikipedia.org/wiki/Shavian_alphabet)
by hand on an iPad with the Apple Pencil. Follows the
[shavian.school](http://shavian.school) syllabus, oriented around producing the glyphs.

See [DESIGN.md](./DESIGN.md) for the full design and decisions.

## Dev

The toolchain is provided by a Nix flake (Node 22 + pnpm):

```sh
nix develop          # enter dev shell (or `direnv allow` with the bundled .envrc)
pnpm install
pnpm dev             # vite dev server (--host, so reachable from the iPad on your LAN)
```

To try it on the iPad, run `pnpm dev` and open the `Network:` URL Vite prints
(e.g. `http://192.168.x.x:5173/shavian-practice/`) in iPad Safari.

## Build & deploy

```sh
pnpm build           # static site → dist/
pnpm preview         # serve the production build locally
```

Pushes to `main` deploy to GitHub Pages via `.github/workflows/deploy.yml`
(served at `https://mdr.github.io/shavian-practice/`). Enable Pages → Source:
"GitHub Actions" in the repo settings once first pushed.

## Status

Walking skeleton: ruled pencil canvas (Pointer Events + coalesced sampling,
pen-only palm rejection with a finger toggle, pressure ink via `perfect-freehand`,
undo/clear). Content (lessons, tracing rows, recall cards, readlex pipeline) to follow.
