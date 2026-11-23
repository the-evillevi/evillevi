# gg³ local practice

`/projects/3d-chess/` is gg³ (Strato & Chess³), a three-level chess variant. The lobby offers online play, which needs the local Supabase stack, and local practice, which runs fully in the browser and mounts a WebGL board with three labeled levels.

## Sub-features

- `chess-lobby` shows the "gg³" heading, guest name field, ruleset choice and "Start local practice".
- `chess-local` starts a local game and renders the three-level board in a canvas.
- `chess-rules` links to `/projects/3d-chess/rules`. It's covered by `tests/chess/play.spec.ts`.
- `chess-online` covers a private match with a friend. It needs the local Supabase stack (see `docs/chess-deployment.md`, "Local stack") running before `launch.sh`. No journey drives it yet; `pnpm test:chess:integration` and `tests/chess/play.spec.ts` cover it. Without the stack, report it as not covered and say why.

## How to get to it (user POV)

- Open `/projects/3d-chess/`, or choose "View Live Demo" on the gg³ card on the home page.

## Driving it with drive.mjs

Preconditions:

- The instance is healthy. The browser runs WebGL through SwiftShader, which `drive.mjs` sets.

- **Lobby.** Open `/projects/3d-chess/`. The heading "gg³" (exact) is visible.
- **Start.** Choose "Start local practice". Three `.chess-level-label` elements and a `canvas` appear.
- **Proof.** Run `node .claude/skills/verify-evillevi/scripts/drive.mjs chess-practice`. The screenshots are `01-chess-lobby.png` and `02-chess-board.png`.
- **Deeper.** Moves, the theme colors and the rules page are covered by `CHESS_TEST_URL=http://127.0.0.1:<port> pnpm test:e2e`.

## Gotchas

- Headless Chrome without the SwiftShader flags renders no board. Keep the launch args in `drive.mjs` and in `playwright.config.ts` in sync.
- The chess layout has its own theme toggle. "Toggle theme" here is not the site header's button.
