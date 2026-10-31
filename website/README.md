# SuperTux Remastered — website

The project landing page for SuperTux Remastered. React + TypeScript + Vite,
hand-written CSS, no component framework. The screenshots are captured from the
actual game build, not mockups.

## Develop

```sh
cd website
npm install
npm run dev
```

Vite serves the site at <http://localhost:5173>. The installer download points at
`public/downloads/supertux-remastered-setup-linux-x86_64`; if you rebuild the
installer, copy the new binary there and refresh `public/downloads/SHA256SUMS`.

## Build

```sh
npm run build
npm run preview
```

Output goes to `dist/`. For a project GitHub Pages deployment at
`https://<user>.github.io/supertux-remastered/`, build with:

```sh
VITE_BASE=/supertux-remastered/ npm run build
```

The included GitHub Actions workflow does this automatically.

## Content and assets

- `public/shots/*.webp` — gameplay screenshots captured from the rolling Linux
  test build at 1920×1080, with the game's magnification set to 2×.
- `public/brand/*` — official SuperTux logo and Tux sprite, plus the world
  illustrations from the game data.
- Colors and type: Bricolage Grotesque / Inter / JetBrains Mono via Fontsource.

SuperTux artwork, music and levels are © 2003–2026 The SuperTux Team and are
CC-BY-SA. The site copy and layout are part of this fork. See
[`../ATTRIBUTION.md`](../ATTRIBUTION.md) and [`../AI_DISCLOSURE.md`](../AI_DISCLOSURE.md).

## Installer

The Linux GUI installer source lives in [`../installer`](../installer). It is a
single Rust binary that downloads the rolling release, verifies the GitHub
SHA-256 digest, extracts the portable build, bundles SDL3_image/SDL3_ttf, adds a
desktop shortcut and writes an uninstaller. The website's "prefer the command
line?" panel still documents the portable tarball path.
