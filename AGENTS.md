# The Archer

A vanilla-TypeScript, canvas-based vertical platformer (classic MMO-flavoured archer climbing a tower). No framework, no runtime deps: `esbuild` bundles `src/main.ts` to `dist/bundle.js`, served by `index.html`.

## Commands

- `npm run typecheck` — `tsc --noEmit`
- `npm run build` — typecheck + bundle to `dist/bundle.js`
- `npm test` — bundles and runs `test/smoke.ts` then `test/mechanics.ts` under Node (headless; `src/runtime.ts` supplies canvas/audio shims). Mechanics checks are seeded and short; keep the whole run to about a second, no long fuzzing.
- `npm run watch` — esbuild watch mode
- `npm start` — static server on :8000

## Conventions

- All game state lives in the `game` / `player` singletons in `src/state.ts`; systems (`update`, `physics`, `combat`, …) mutate them.
- The world is tile based: geometry snaps to the 16px `TILE` grid (`src/config.ts`) and sprites are 16×16 drawn at integer coordinates.
- Tuning constants live in `src/config.ts` (`P`, `WORLD`, `SKILLS`, `MOB_TYPES`), not inline.
- Debug keys: `[` levels up, `]` warps to the next floor. Esc pauses.
- Types are declared in `src/types.ts` and imported with `import type`.

## Code style

- Prefer clean, concise, DRY code: factor out repetition into small, well-named helpers instead of copy-pasting.
- Avoid tricks: no clever one-liners, obscure language features, or hacks where a plain, readable version works.
- Don't continue complex patterns just because they exist: when touching convoluted code, simplify it rather than extending it.

## Specs

Design specs live in [`specs/`](specs/). Agents must not update the specs except by explicit user request. Organize them as follows:

- **Group by feature or concept** — each spec is one directory under `specs/` named for the feature it describes (e.g. `specs/platforms/`, `specs/skills/`).
- **One `spec.md` per directory** describing the *target behavior* — what the feature should do from the player's perspective, not how the code is structured.
- **Be concise.** A spec is a short statement of intent (a paragraph to a page): the rules, the invariants, the edge cases that matter. Skip implementation walkthroughs, code listings, exact tuning values, and history — the code is the reference for those.
