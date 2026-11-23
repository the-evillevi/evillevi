# Home page and theme

The home page (`/`) shows the hero, garden stats, a horizontal row of featured project cards, recent posts and tags. Every page shares the header theme toggle, which switches the `--nb-*` palette between light and dark and remembers the choice.

## Sub-features

- `home-render` shows the "Featured Projects" heading and one card per project, each with a "View Live Demo" link.
- `theme-toggle` switches `html[data-theme]` between `light` and `dark` from the nav button.
- `theme-persist` stores the choice as `nb-theme` in localStorage and restores it on the next load.
- `theme-default` follows the OS color scheme when nothing is stored. Not automated: run any journey with `--theme dark` and check the first screenshot.

## How to get to it (user POV)

- Open `/`.
- Choose the sun/moon button labeled "Toggle theme" at the right of the header, on any page that uses the site layout.

## Driving it with drive.mjs

Preconditions:

- The instance is healthy, and the browser context starts with empty localStorage and `--theme light`.

- **Render.** Open `/`. The heading "Featured Projects" is visible, and `article` elements with a "View Live Demo" link are counted.
- **Toggle.** Choose "Toggle theme" inside the navigation named "Primary navigation". `html[data-theme]` reads `dark`.
- **Persist.** Read `localStorage.nb-theme`, which is `dark`, then reload. `html[data-theme]` is still `dark`.
- **Proof.** Run `node .claude/skills/verify-evillevi/scripts/drive.mjs home-theme`. The screenshots `01-home-light.png` and `02-home-dark-after-reload.png` show both palettes.

## Gotchas

- The gg³ pages use `ChessLayout`, which has its own "Toggle theme" button and the same `nb-theme` key. On those pages, scope the button to the page, not to "Primary navigation".
- The home page's three.js canvases (the torus accent and the voxel cat on the Affogato card) stall frames for a few seconds after load. `drive.mjs` waits for 20 frames/s before each screenshot. Don't remove that wait.
- The Affogato card's voxel cat (`VoxelPetVisual`, `client:visible`) shows as an empty panel in headless screenshots, even when the console shows no error. That was the state on 2026-11-22 (f768950). Don't report it as a regression unless a headed browser shows it blank too.
- Affogato and the garden cards still show placeholder copy (Linear EVL-137). That's content, not a failure of this journey.
