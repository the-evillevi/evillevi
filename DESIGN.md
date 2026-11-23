---
version: 1.1.0
name: Evil Labs
description: >-
  The Evil Labs visual system under the evillevi name: crema, tinta and
  naranja, Montserrat, 2px ink borders, 8px corners and a hard 4/4 shadow
  that goes flat in the dark. Light and dark follow the OS.
colors:
  # Principal family. Light / "-dark" twin. In code always use the tokens
  # (Tailwind names or var(--evil-color-*)); they resolve with light-dark().
  background: "#FEF1EF"
  background-dark: "#1E1E2E"
  surface: "#FFFFFF"
  surface-dark: "#313244"
  text: "#1A1A1A"
  text-dark: "#FEF1EF"
  border: "#1A1A1A"
  border-dark: "#FEF1EF"
  accent: "#F74813"
  accent-dark: "#F74813"
  on-accent: "#1A1A1A"
  success: "#40A02B"
  success-dark: "#A6E3A1"
  warning: "#DF8E1D"
  warning-dark: "#F9E2AF"
  error: "#D20F39"
  error-dark: "#F38BA8"
  info: "#1E66F5"
  info-dark: "#89B4FA"
typography:
  display:
    fontFamily: Montserrat
    fontSize: 72px
    fontWeight: 800
    lineHeight: 1.02
  h1:
    fontFamily: Montserrat
    fontSize: 48px
    fontWeight: 800
    lineHeight: 1.08
  h2:
    fontFamily: Montserrat
    fontSize: 32px
    fontWeight: 800
    lineHeight: 1.19
  body:
    fontFamily: Montserrat
    fontSize: 16px
    fontWeight: 500
    lineHeight: 1.5
  label:
    fontFamily: Montserrat
    fontSize: 14px
    fontWeight: 600
    letterSpacing: 0.06em
rounded:
  control: 8px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 48px
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
    rounded: "{rounded.control}"
    typography: "{typography.label}"
  button:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.control}"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.control}"
    padding: 24px
  panel:
    backgroundColor: "{colors.background}"
    textColor: "{colors.text}"
    rounded: "{rounded.control}"
    padding: 16px
  tag:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.control}"
    typography: "{typography.label}"
---

# Evil Labs

## Overview

The garden wears **Evil Labs**, the visual system of Levi's solopreneur brand,
under the evillevi name. It keeps neobrutalism's honesty (visible borders,
hard shadows, physical presses) but calms it down: sentence-case Montserrat,
2px borders, 8px corners, one accent per page. Light and dark mode follow the
OS; a System / Light / Dark control in the header overrides it.

The design system itself lives outside this repo
(`~/Repositories/evil-labs-design-system`, v1.1.0). `pnpm evil:sync` copies
its build into `src/styles/evil-labs/`; never edit those copies, change the
source and sync. `pnpm evil:sync:check` fails if they drift.

The living reference is `/design-system/evil-labs`.

**Legacy POCs.** Karma, gg³ chess and `/design-system/neobrutalism` keep the
old Neobrutalism + Catppuccin system on purpose (see
`DESIGN.neobrutalism.md`). `pnpm test:legacy` compares them against
screenshots, so a leak into them fails.

## Colors

- **Never raw hex in components.** Use the Tailwind names from
  `src/styles/garden.css` (`bg-background`, `bg-surface`, `text-foreground`,
  `text-muted-foreground`, `border-border`, `bg-primary`,
  `text-primary-foreground`) or `var(--evil-color-*)`. They are `light-dark()`
  pairs, so they flip with the mode.
- **One accent.** Decoration uses the family accent (`primary`). Don't
  introduce extra decorative colors.
- **Families.** `data-evil-theme` (principal, terracota, melocoton, malva,
  lavanda, menta, rosa, azul) recolors the accent of everything inside it.
  Posts pick one with the `family` frontmatter field.
- **Status** (`success`, `warning`, `error`, `info`, each with
  `*-foreground`) comes from Catppuccin Latte and Mocha. Always pair a status
  color with text; warning and success are faint on the light background.
- **Data series** (`chart-1` to `chart-5`) are only for color that carries
  meaning: graph node types, chart series. They don't change with the family.
- Borders are tinta in light and crema in dark. The card shadow is always
  tinta, and it disappears in dark.

## Typography

- One family: **Montserrat** (local woff2, from the design system).
  Lobster is the brand script; it is reserved for the wordmark.
- Headings are sentence case, weight 800: `.evil-display` for page titles,
  then the h1/h2/h3 token sizes.
- Body is weight 500, line-height 1.5; long-form uses `.evil-prose`.
- Labels, chips and buttons are the only uppercase text (`.evil-label`,
  weight 600, 0.06em tracking).

## Layout

- Content column: `max-w-7xl`, `px-4 md:px-6`.
- Sections are separated by 2px `border-border` rules; alternate
  `bg-background` and `bg-surface` bands.
- Spacing follows the token scale (4, 8, 12, 16, 24, 32, 48, 64px). Cards pad
  24px, panels 16px.

## Elevation & Depth

- One shadow: `shadow-card` (`--evil-shadow-card`), 4/4 tinta with no blur
  in light and none in dark. No soft shadows.
- Buttons lift 2px on hover and press into their shadow on active.

## Shapes

- `rounded-control` (8px) on controls, cards and panels. Chips use the same.
- Borders are 2px.
- In 3D (the Spaag style): flat unlit fills in the accent, ink lines on hard
  edges, and an ink slab copy behind the object as its hard shadow, which
  follows `--evil-shadow-card`. The mascot is never redrawn, outlined or made
  3D.

## Components

| Piece                                                                                                                                                                       | Where                                                                    |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Tokens and Tailwind mapping, `.evil-*` classes, prose, wikilinks                                                                                                            | `src/styles/garden.css`                                                  |
| Layout (header, search, mode control, footer)                                                                                                                               | `src/layouts/GardenLayout.astro`, `src/components/evil/*`                |
| Page title block                                                                                                                                                            | `src/components/garden/PageHeader.astro`                                 |
| Classes: `.evil-card`, `.evil-panel`, `.evil-button` (`.evil-primary`, `.evil-ghost`, `.evil-sm`), `.evil-tag`, `.evil-label`, `.evil-meta`, `.evil-display`, `.evil-prose` | `src/styles/garden.css` (`@layer components`, so utilities can override) |
| Astro UI kit                                                                                                                                                                | `src/components/starwind/*`, colored by the token mapping                |
| 3D: voxel friends and extruded shapes                                                                                                                                       | `src/components/three/{SpaagFriend,SpaagShape,spaag}.tsx`                |

## Do's and Don'ts

**Do**

- Use the tokens and `.evil-*` classes; check light and dark.
- Keep the focus ring: `--evil-focus-width` in `--evil-color-focus`.
- Respect `prefers-reduced-motion` (global overrides exist; 3D scenes drop to
  static poses).

**Don't**

- No raw hex, no extra accent colors, no uppercase headings.
- No `--nb-*` tokens or `.nb-*` classes in garden code. They belong to the
  legacy POCs.
- Don't edit `src/styles/evil-labs/` or the Starwind components to restyle
  the garden.
- Don't stack many WebGL canvases; budget about two per page.

---

## Using the design system (project guide)

### Theming contract

`src/components/evil/ThemeScript.astro` runs before paint. It reads
`localStorage["evil-mode"]` (`system`, `light` or `dark`), sets
`html[data-evil-mode]` for light or dark, and keeps the `.dark` class in step
for Starwind's and shadcn's `dark:` utilities. It also writes the resolved
mode to the legacy `nb-theme` key, so the POCs open in the same mode.
`window.__evilSetMode(mode)` changes it and fires an `evil:mode` event
(Affogato listens to it).

3D islands read colors with `src/components/three/useEvilTokens.ts`, which
resolves `light-dark()` through a probe element inside their scope, so a
nested family or mode recolors them too.

### Accessibility conventions

- Focus: 3px outline in the focus color, 3px offset, everywhere.
- Every control has a programmatic name.
- Decorative canvases are `aria-hidden`; meaningful ones get `role="img"`
  and a label.
- Color never carries meaning alone: the graph view has a legend, statuses
  have text.
