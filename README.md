# Bored Cube

An arrow-key stim toy for the browser. You are a cube on an endless grid. Every
press does something satisfying, and certain sequences are secretly named combos
— press `→ ↑ ← ↓` quickly and you land the **Dinkie Lance**.

There is no win condition. The loop is: mash arrows, watch the chain climb, and
discover the 19 named moves hiding in the input space.

> [!WARNING]
> **Photosensitivity.** This game uses fast flashing and rapidly cycling
> colours. Do not play if you are sensitive to that, or have epilepsy. The same
> warning is shown on the title card before play starts.

## Quick start

```sh
git clone https://github.com/lancePetrisko/bored-game.git
cd bored-game
npm install
npm run dev
```

Then open **http://localhost:5173** and start pressing arrows.

The repository, the npm package directory, and the `localStorage` key still use
the old `bored-game` spelling. The repo name is fixed on GitHub's side, and
renaming the storage key would wipe everyone's saved stats, so both stay put —
only the name people see says **Bored Cube**.

Requires Node 18 or newer (developed on Node 25). No other tooling needed.

## Commands

| Command | What it does |
| --- | --- |
| `npm install` | Installs Vite and TypeScript. One time, or after pulling changes to `package.json`. |
| `npm run dev` | Dev server with hot reload at http://localhost:5173. This is the one you want. |
| `npm run build` | Type-checks with `tsc`, then bundles a static site into `dist/`. |
| `npm run preview` | Serves the built `dist/` at http://localhost:4173, so you can check the production build. |
| `npx tsc --noEmit` | Type-check only, no build. |

Useful flags:

```sh
npm run dev -- --port 3000   # different port
npm run dev -- --host        # expose on your LAN, so you can play on your phone
npm run dev -- --open        # open the browser automatically
```

## Controls

| Key | Does |
| --- | --- |
| Arrow keys | Move |
| `Tab` or `?` | Combo collection (undiscovered moves show as `???`) |
| `Esc` | Close the collection, or pause the run when it is already closed |
| `M` | Mute / unmute |
| `C` | Cheats — reveals every combo in the collection (only while it is open) |

On a phone, swipe anywhere to move. One continuous swipe counts a press every
26px it travels, so a whole combo can be drawn without lifting your finger. Tap
`COMBOS`, `SOUND`, or `PAUSE` in the top right to toggle those, and tap anywhere
to close the collection or to resume from a pause.

The collection has a **SHOW ALL COMBOS (CHEAT)** button along the bottom. It
reveals the names and sequences you have not landed yet, but it does not mark
them discovered — the `1 of 19 found` count stays honest, and the setting
persists across reloads.

Sound starts on your first keypress — browsers refuse to make noise before you
interact with the page. If you hear nothing, press an arrow key first, then
check that the top right does not say `SOUND OFF`.

## Deploying

The build is a plain static site with no server component, so `dist/` drops onto
anything:

```sh
npm run build
npx serve dist            # or any static host
```

For GitHub Pages, Netlify, Vercel, or similar: build command `npm run build`,
publish directory `dist`. If you deploy to a subpath (like a project Pages site
at `/bored-game/`), set `base: '/bored-game/'` in a `vite.config.ts` first.

No runtime dependencies — Vite and TypeScript are dev-only. Sound is synthesized
with WebAudio, so there are no asset files to host.

Link previews use `public/og.png`, generated from `tools/og-card.html` (the
regeneration command is in a comment at the top of that file). The `og:` and
`twitter:` URLs in `index.html` are absolute and currently point at
`bored-game.pages.dev` — update them when the real domain is live, or shared
links will preview blank.

## Troubleshooting

- **Port 5173 already in use** — Vite picks the next free port and prints it, or
  pass `--port`. To kill whatever is holding it: `lsof -ti:5173 | xargs kill`.
- **The page scrolls when I press arrows** — it should not; the game calls
  `preventDefault()` on arrow keys. If it does, the canvas lost focus to another
  element. Click the page once.
- **Stats look wrong or I want a fresh start** — everything lives in one
  `localStorage` key. In the browser console:
  `localStorage.removeItem('bored-game.stats.v1')`, then reload.
- **Nothing renders, just black** — check the browser console. The game uses
  `ctx.roundRect`, which needs Safari 16+, Chrome 99+, or Firefox 112+.

## How it works

- `src/main.ts` — canvas sizing, DPI scaling, fixed-timestep loop at 120Hz.
- `src/game/state.ts` — game state, press handling, chain counter, combo payoffs.
- `src/game/combos.ts` — the combo table and the matcher. **This table is the
  content of the game**; adding a move means adding a row.
- `src/game/entity.ts` — cube tween, squash/stretch, trail.
- `src/game/grid.ts` — infinite grid math and the lagging camera.
- `src/game/juice.ts` — easing, screen shake, flash, slow motion, heat palette.
- `src/game/particles.ts` — fixed 600-particle pool, zero per-frame allocation.
- `src/game/render.ts` — everything drawn, HUD and overlays included.
- `src/game/audio.ts` — pentatonic blips and combo chord stabs.
- `src/game/stats.ts` — debounced `localStorage` persistence.

A press does three independent things: it moves the cube, it feeds the chain
counter (any press within 900ms of the last one extends the chain), and it goes
into a rolling input buffer that the combo matcher scans on every press. The
chain drives a single `heat` value from 0 to 1, and nearly every visual — cube
colour, trail length, particle count, grid brightness, step speed, audio pitch —
is interpolated off it.

### Adding a combo

```ts
{ id: 'my-move', name: 'My Move', seq: ['left', 'up', 'up'], windowMs: 450, tier: 2 }
```

`windowMs` is the maximum gap allowed between consecutive presses. `tier` (1–3)
scales the shake, flash, particle count and chord. A combo whose sequence starts
with a shorter combo still works — both fire, the short one first, which is how
The Spin rolls into Windmill.

## Credits

Developed and maintained by [Lance Petrisko](https://lancepetrisko.com).
