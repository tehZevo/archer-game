# The Archer

A vanilla-TypeScript, canvas-based vertical platformer (classic MMO-flavoured archer climbing a tower). No framework, no runtime deps: `esbuild` bundles `src/main.ts` to `dist/bundle.js`, served by `index.html`.

## Commands

- `npm run typecheck` — `tsc --noEmit`
- `npm run build` — typecheck + bundle to `dist/bundle.js`
- `npm test` — bundles and runs `test/smoke.ts` then `test/mechanics.ts` under Node (headless; `src/runtime.ts` supplies canvas/audio shims). Mechanics checks are seeded and short; keep the whole run to about a second, no long fuzzing.
- `npm run watch` — esbuild watch mode
- `npm start` — static server on :8000
- `npm run worktree -- <branch> [base]` — make a branch worktree in `../archer-game-wt/<branch>` with `node_modules` linked correctly
- `npm run bake` — write the skill effects' PNG sheets (`assets/fx`) and `src/fxbaked.ts` from their generators
- `npm run fxpreview -- [name...]` — render effects' frames, scaled up, to `.tmp/fxpreview.png` for reviewing the art

## Worktrees and node_modules

Do branch work in a worktree made by `npm run worktree`, not by hand. It links the worktree's `node_modules` to the main checkout's real install by absolute path. Hand-made relative links (`ln -s ../archer-game/node_modules`) get the depth wrong and end up broken or pointing at themselves. Never commit `node_modules` in any form, link or directory. If the main checkout's `node_modules` is ever a symlink, delete it and run `npm ci` there.

## Effect sheets

Skill effects ship as PNG sprite sheets in `assets/fx` (one strip per effect, facing right, drawn additively). They are baked from the procedural generators in `src/fxsprites.ts`, which stay in the tree as the authoring source. To add or change an effect, edit its generator, run `npm run bake`, and commit the PNG along with the generated `src/fxbaked.ts`. The smoke test fails if a sheet no longer matches its generator. An effect that isn't baked still runs its generator at runtime (see `src/fxsheets.ts`).

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
