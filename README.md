# bored game

An arrow-key stim toy for the browser. You are a cube on an endless grid. Every
press does something satisfying, and certain sequences are secretly named combos
— press `→ ↑ ← ↓` quickly and you land the **Dinkie Lance**.

There is no win condition. The loop is: mash arrows, watch the chain climb, and
discover the 18 named moves hiding in the input space.

## Controls

| Key | Does |
| --- | --- |
| Arrow keys | Move |
| `Tab` / `?` | Combo collection (undiscovered moves show as `???`) |
| `Esc` | Close the collection |
| `M` | Mute |

## Running it

```sh
npm install
npm run dev      # http://localhost:5173
npm run build    # static site in dist/
npm run preview
```

No runtime dependencies — Vite and TypeScript are dev-only. Sound is synthesized
with WebAudio, so there are no asset files.

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

### Adding a combo

```ts
{ id: 'my-move', name: 'My Move', seq: ['left', 'up', 'up'], windowMs: 450, tier: 2 }
```

`windowMs` is the maximum gap allowed between consecutive presses. `tier` (1–3)
scales the shake, flash, particle count and chord. A combo whose sequence starts
with a shorter combo still works — both fire, the short one first, which is how
The Spin rolls into Windmill.
