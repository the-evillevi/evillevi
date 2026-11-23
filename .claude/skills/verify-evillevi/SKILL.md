---
name: verify-evillevi
description: Drive the evillevi digital garden (Astro site at evillevi.pages.dev) in a real headless Chrome to prove a change works the way a visitor sees it, with screenshots, console logs and pass/fail checks. Use after changing any page, layout, style, theme, search, the /projects reveal.js deck, or the gg³ chess app, before claiming a UI change is done, or when a swarm worker needs per-route evidence (layout overflow, console errors, failed requests).
---

# Verify evillevi

The site is an Astro 6 static site with React islands, Tailwind v4 and the Evil Labs visual system (the Karma and gg³ POCs keep the legacy `--nb-*` theme). A visitor reads pages, picks a color mode, searches from the header, steps through the `/projects` deck, and plays gg³ at `/projects/3d-chess/`. This skill runs the real dev server on its own port and drives it with Playwright in system Chrome. All commands run from the repository root.

## Launch

```sh
.claude/skills/verify-evillevi/scripts/launch.sh [port]   # default 4471
```

It refuses a busy port, so two agents can run side by side on different ports. Never use 4321, which is the user's own `pnpm dev`. It installs dependencies only if `node_modules` is missing. It starts `astro dev --host 127.0.0.1 --port <port>` with `CHESS_BROWSER_TEST=1`, which hides the Astro dev toolbar from screenshots. It waits until the home page HTML contains "Featured projects", since the first request compiles the page. Then it visits the main pages in a headless browser, repeating until Vite stops optimizing new dependencies. With a cold Vite cache, Vite reloads the page the first time it sees a dependency such as the search library, and that reload would break a journey mid-step. Ready prints `ready http://127.0.0.1:<port> pid <pid>`. The pid and `server.log` live in `.verify/instance-<port>/`.

Every journey below runs without a `.env`. Online gg³ matches need the isolated local Supabase stack from `docs/chess-deployment.md` ("Local stack"): Docker, the Supabase CLI, `supabase start`, `supabase migration up --local`, `node scripts/chess-local-env.mjs` (writes the ignored `.env.local`) and `supabase functions serve --env-file .env.chess-test.local`. Start the stack before `launch.sh`, because the public variables are read when the dev server starts.

## Doctor

```sh
.claude/skills/verify-evillevi/scripts/doctor.sh [port]
```

It's read-only. It checks that our pid is alive, that the port's listener is our process, which commit and branch are served and how many paths are uncommitted, that the home page renders, and that `/contentIndex.json` (the search index) has entries. It warns on errors in `server.log`. Run it first whenever a journey fails strangely. Astro hot-reloads edits, so the served build is always the working tree.

## Drive

```sh
node .claude/skills/verify-evillevi/scripts/drive.mjs <journey> [--port 4471] [--width 1440] [--theme light|dark] [--route /path/] [--out dir]
```

| Journey          | Proves                                                                                                                                                                                                                                                                                             |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `home-theme`     | Home renders its project cards. The header's "Color mode" control (System, Light, Dark) sets `html[data-evil-mode]`, stores `evil-mode`, survives a reload, and bridges to the legacy `nb-theme` so Karma opens in the same mode.                                                                  |
| `search`         | "Open search" opens the sheet. Typing fetches `/contentIndex.json` and returns highlighted results, and the first result navigates to its page.                                                                                                                                                    |
| `projects-deck`  | The reveal.js deck opens on "Selected Work". Right arrow goes to the first project, down goes to its deep dive (`N / 2`), and Escape opens the overview.                                                                                                                                           |
| `chess-practice` | The gg³ lobby loads, and "Start local practice" mounts the WebGL board with three level labels.                                                                                                                                                                                                    |
| `evil-showcase`  | The Evil Labs showcase at `/design-system/evil-labs/` renders its component cards in Montserrat. The System/Light/Dark control sets `html[data-evil-mode]` and `.dark`, stores `evil-mode` and survives a reload. The dialog and sheet open with the card frame, and the three voxel friends draw. |
| `page`           | Any `--route` at any `--width`. It checks for a 200, no console errors, no horizontal page scroll, and no failed same-origin requests. Use it for layout sweeps, e.g. `--width 375` for phones.                                                                                                    |

Each check prints `PASS` or `FAIL`, and the last line is `result: PASS|FAIL <evidence dir>`. The exit code is 1 on failure, and the journey stops at its first failed check. The feature map in `features/` has the selectors and the user path for each journey. Add a journey to `drive.mjs` when you map a new feature.

The browser is headless system Chrome with SwiftShader WebGL. It falls back to Playwright's Chromium if Chrome is missing. `drive.mjs` waits for the page to reach 20 frames/s before every screenshot, because the home page's three.js canvases stall rendering for a few seconds after load.

## Evidence

Each run writes to `.verify/runs/<UTC timestamp>-<journey>/`:

- numbered step screenshots (`01-home-light.png`, ...), plus `NN-failure.png` on failure
- `console.json`, holding every console message, page errors, and responses with status 400 or higher
- `result.json`, holding the journey, the options, the git SHA, each check with its detail, and `ok`

`.verify/` is gitignored. Cite the evidence dir and the SHA in a report. A proof follows the real visitor path: clicks, keys and typing on real controls. It never calls internal functions or sets state directly. It captures the action and the resulting state, and checks side effects too (the localStorage write, the index fetch). Open the screenshots and look at them, since a passing selector can still sit on a broken-looking page.

## Cleanup

```sh
.claude/skills/verify-evillevi/scripts/cleanup.sh [port]
```

It kills only the recorded pid and its children, never by name. It removes `.verify/instance-<port>/`, confirms the port is free, and keeps `.verify/runs/`. Run it after every session, including failed ones. To clear old evidence, delete `.verify/runs/` by hand once nobody needs it.

## Gotchas

- The `/projects` deck uses reveal.js `keyboardCondition: "focused"`, so keys work only after a pointer press inside the deck. `element.focus()` does not count.
- reveal.js styles are unlayered and beat Tailwind utilities. A deck style bug is usually that cascade, not the journey. See the repo's design notes.
- `tests/chess/play.spec.ts` (`pnpm test:e2e`) is the deeper gg³ regression suite. It starts its own server on 4321 unless `CHESS_TEST_URL` is set. Point it at this instance with `CHESS_TEST_URL=http://127.0.0.1:4471 pnpm test:e2e`.
- Playwright test runs clear `test-results/`. Evidence lives in `.verify/` so they never delete it.
