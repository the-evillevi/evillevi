# Home page and color mode

The home page (`/`) shows the hero with the Spaag ring, garden stats, a horizontal row of featured project cards (the Affogato card has the Spaag cat), recent posts and tags. Every garden page shares the header's "Color mode" control: System, Light or Dark. System follows the OS.

## Sub-features

- `home-render` shows the "Featured projects" heading and one card per project, each with a "View live demo" link.
- `mode-control` is the radiogroup "Color mode" in the "Primary navigation". Light and Dark set `html[data-evil-mode]`; System removes it. `.dark` follows the resolved mode.
- `mode-persist` stores the choice as `evil-mode` in localStorage and restores it on the next load.
- `mode-bridge` writes the resolved mode to the legacy `nb-theme` key, so the Karma and chess POCs open in the same mode.
- `mode-default` follows the OS when nothing is stored.

## How to get to it (user POV)

- Open `/`.
- Use the System / Light / Dark control at the right of the header, on any garden page.

## Driving it with drive.mjs

Preconditions:

- The instance is healthy, and the browser context starts with empty localStorage.

- **Render.** Open `/`. The heading "Featured projects" is visible, and `article` elements with a "View live demo" link are counted.
- **Default.** No `data-evil-mode`, and `.dark` matches `--theme`.
- **Dark.** Choose "Dark". `data-evil-mode` is `dark`, `.dark` is set, `evil-mode` and `nb-theme` are both `dark`. Reload, and dark persists.
- **Bridge.** Open `/projects/karma/`. Its legacy `html[data-theme]` reads `dark`.
- **Light, System.** Back on `/`, choose "Light", then "System". The attribute follows.
- **Proof.** Run `node .claude/skills/verify-evillevi/scripts/drive.mjs home-theme`, and again with `--theme dark`.

## Gotchas

- The gg³ pages use `ChessLayout` and Karma uses the legacy `SiteLayout`, each with the old "Toggle theme" button and the `nb-theme` key. They are frozen POCs; `pnpm test:legacy` guards their look.
- The home page's three.js canvases (the Spaag ring and cat) stall frames for a few seconds after load. `drive.mjs` waits for 20 frames/s before each screenshot. Don't remove that wait.
- Affogato and the garden cards still show placeholder copy (Linear EVL-137). That's content, not a failure of this journey.
