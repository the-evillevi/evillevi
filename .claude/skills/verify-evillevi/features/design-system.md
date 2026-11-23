# Evil Labs showcase

`/design-system/evil-labs/` shows the Evil Labs v1 visual system on the garden's own Starwind and shadcn components, plus three Spaag-style voxel friends (cat, bee, fox). The page shows the override approach: Starwind restyled from a page-scoped stylesheet. The rest of the garden is built on Evil Labs directly (`src/styles/garden.css`, `GardenLayout`), and `/design-system/neobrutalism` keeps the legacy Catppuccin `--nb-*` system.

## Sub-features

- `showcase-render` shows 16 component cards (`#components article.evil-card[id]`) in Montserrat.
- `mode-control` is the shared `components/evil/ModeControl.astro` radiogroup "Color mode" with System, Light and Dark, driven by `ThemeScript.astro`. System removes `html[data-evil-mode]` and follows the OS. Light and Dark set it, and `.dark` follows.
- `mode-persist` stores the choice as `evil-mode` in localStorage. A separate key, so it never touches the garden's `nb-theme`.
- `family-select` is the navbar "Color family" select. It sets `html[data-evil-theme]` and stores `evil-family`. Not automated.
- `overlays`: the Starwind dialog and sheet, and the React dialog and sonner toasts, wear the card frame. The journey checks the Starwind dialog and sheet only.
- `voxel-friends`: three `SpaagFriend` islands (`client:visible`) in `#voxel-friends`. Each card has `data-evil-theme` for its family, and its "<Name> color family" select rescopes the card and recolors the animal live.
- `modes-panels`: `#modes` nests a forced-light and a forced-dark panel. Not automated beyond the screenshot.

## How to get to it (user POV)

- Open `/design-system/evil-labs/`. The garden footer links to it ("Visual system: Evil Labs").
- Use the Color mode control and the family select at the right of the sticky header.
- Scroll to "Voxel friends", hover an animal (it waves), and change its family select.

## Driving it with drive.mjs

Preconditions:

- The instance is healthy. The context starts with empty localStorage, so the page starts on System and follows `--theme`.

- **Render.** Open the page. At least 15 component cards render, and `document.fonts.check("16px Montserrat")` is true.
- **Mode.** The page starts on System, with `.dark` matching `--theme`. Choose Dark: `data-evil-mode` is `dark`, `#card` has a `0px 0px` shadow, and localStorage `evil-mode` is `dark`. Reload, and dark persists. Choose Light: `data-evil-mode` is `light`, with a `4px 4px` shadow.
- **Overlays.** Choose "Open dialog". The open `dialog-content` has a 2px border. Escape. Choose "Open sheet", and the sheet opens.
- **Friends.** Scroll `#voxel-friends` into view and wait for 3 canvases. Each stage's screenshot must differ from the same stage with its canvas hidden, which proves the canvas drew something. Change the cat's family to Menta, and the card's `data-evil-theme` reads `menta`.
- **Proof.** Run `node .claude/skills/verify-evillevi/scripts/drive.mjs evil-showcase --width 1280 --theme light`, then repeat with `--theme dark` and `--width 390`. The screenshots are the full page, the dialog, the sheet and the friends.

## Gotchas

- A full-page screenshot taken before scrolling shows the friend stages empty, because the islands hydrate on `client:visible`. The journey scrolls them in first.
- The Starwind dialog keeps its 4/4 ink shadow in light mode, but over the dark backdrop of a dark-OS browser it is nearly invisible. Read the computed `box-shadow` rather than judging from the screenshot.
- `useEvilTokens` resolves colors through a probe element, because `getPropertyValue("--evil-color-…")` returns the unresolved `light-dark(...)` string.
- Sonner's toast classes are `!important` inside Tailwind's utilities layer. The page overrides them from `@layer base`, because an important declaration in an earlier layer wins. An unlayered `!important` would lose.
- Console warnings `THREE.Clock: This module has been deprecated` come from react-three-fiber internals, not page code. They are not errors.
