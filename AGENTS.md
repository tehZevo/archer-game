# The Archer

A vanilla-TypeScript, canvas-based vertical platformer (classic MMO-flavoured archer climbing a tower). No framework, no runtime deps: `esbuild` bundles `src/main.ts` to `dist/bundle.js`, served by `index.html`.

## Commands

- `npm run typecheck` — `tsc --noEmit`
- `npm run build` — typecheck + bundle to `dist/bundle.js`
- `npm test` — bundles and runs `test/smoke.ts` then `test/mechanics.ts` under Node (headless; `src/runtime.ts` supplies canvas/audio shims). Mechanics checks are seeded and short; keep the whole run to about a second, no long fuzzing.
- `npm run watch` — esbuild watch mode
- `npm start` — static server on :8000
- `npm run worktree -- <branch> [base]` — make a branch worktree in `../archer-game-wt/<branch>` with `node_modules` linked correctly
- `npm run bake` — write the PNG sheets for skill effects (`assets/fx`) and enemies (`assets/mobs`) and tilesets (`assets/tiles`), plus their generated `src/*baked.ts` modules, from their generators
- `npm run fxpreview -- [name...]` — render effects' frames, scaled up, to `.tmp/fxpreview.png` for reviewing the art

## Worktrees and node_modules

Do branch work in a worktree made by `npm run worktree`, not by hand. It links the worktree's `node_modules` to the main checkout's real install by absolute path. Hand-made relative links (`ln -s ../archer-game/node_modules`) get the depth wrong and end up broken or pointing at themselves. Never commit `node_modules` in any form, link or directory. If the main checkout's `node_modules` is ever a symlink, delete it and run `npm ci` there.

## Baked sheets

The archer ships as PNG sheets in `assets/archer`, one per hair style × body type in the default look's colours (a row per pose); other looks swap colours at runtime (`lookColours`). Scenery (props, town decor per palette, backdrop layers, the portal) ships as one PNG per piece in `assets/art`, baked from `src/artsheets.ts`'s ART_GEN. Tilesets ship as PNG atlases in `assets/tiles` (each distinct piece once per piece size, with `src/tilebaked.ts` indexing every autotile/slope/decoration piece to its cell; baked from `src/tilebake.ts`). Enemies ship as PNG sheets in `assets/mobs` the same way (walk/flap frames then the hurt pose, baked from `src/sprites.ts` / `src/mobart.ts`; recoloured variants are derived from their base's sheet at runtime). Skill effects ship as PNG sprite sheets in `assets/fx` (one strip per effect, facing right, drawn additively). They are baked from the procedural generators in `src/fxsprites.ts`, which stay in the tree as the authoring source. To add or change an effect, edit its generator, run `npm run bake`, and commit the PNG along with the generated `src/fxbaked.ts`. The smoke test fails if a sheet no longer matches its generator. An effect that isn't baked still runs its generator at runtime (see `src/fxsheets.ts`).

## Tests

Keep the suite minimal and high-value; aim to shrink it as the game stabilizes.

- **One check per behavior.** Group the assertions that prove one behavior (a value, its effect, its timing) into a single `check` with a detail string, rather than a check per field.
- **Test the contract, not the implementation.** Assert the player-visible rule (the `linksInto` grammar, the damage, the cooldown), not every internal field that happens to exist today.
- **Representative over exhaustive.** Cover each source of a family (one launcher, one aerial, one finisher) rather than every pair in a matrix: the `SKILLS` table is the spec, the tests spot-check its rows.
- **Group tests logically.** Each numbered file in `test/` is one feature group: keep every check of that feature in its file (no `-2` sequels), group related checks into blocks that read like the feature's rules, and merge files whose features belong together.

## Planning

Work is tracked in GitHub issues (https://github.com/tehZevo/archer-game/issues), not a TODO file. Two labels call out items that need a human touch:

- **art** — best done by an art-capable model or a human eye (sprite, effect, animation work).
- **design** — needs human validation of a naming/feel call before implementation.

Check the labels before picking up an item; plain issues are straight-ahead engineering.

When an issue is picked up, link the PR to it (`Fixes #<n>` / `Closes #<n>` in the PR body, or `gh pr create --closes-issue <n>`) so the issue closes automatically when the PR merges. One PR per issue; if a PR only covers part of an issue, say so in the PR body and leave the issue open.

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
