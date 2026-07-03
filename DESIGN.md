---
version: alpha
name: Neobrutalism + Catppuccin
description: >-
  Tactile neobrutalist design system on Catppuccin palettes — thick ink
  borders, hard offset shadows, sharp corners, and loud typography.
colors:
  # Light theme = Catppuccin Latte; the "-dark" twin = Catppuccin Mocha.
  # In code always consume the CSS variables (var(--nb-*)) — they flip with
  # html[data-theme]; these literals document the resolved values.
  base: "#eff1f5"
  base-dark: "#1e1e2e"
  surface: "#ccd0da"
  surface-dark: "#313244"
  text: "#4c4f69"
  text-dark: "#cdd6f4"
  muted: "#6c6f85"
  muted-dark: "#a6adc8"
  peach: "#fe640b"
  peach-dark: "#fab387"
  pink: "#ea76cb"
  pink-dark: "#f5c2e7"
  red: "#d20f39"
  red-dark: "#f38ba8"
  yellow: "#df8e1d"
  yellow-dark: "#f9e2af"
  green: "#40a02b"
  green-dark: "#a6e3a1"
  teal: "#179299"
  teal-dark: "#94e2d5"
  blue: "#1e66f5"
  blue-dark: "#89b4fa"
  lavender: "#7287fd"
  lavender-dark: "#b4befe"
  ink: "#11111b"
  button-text: "#11111b"
  title-shadow: "#fe640b"
  title-shadow-dark: "#11111b"
typography:
  display:
    fontFamily: Geist Variable
    fontSize: 96px
    fontWeight: 900
    lineHeight: 0.95
  heading:
    fontFamily: Geist Variable
    fontSize: 36px
    fontWeight: 900
    lineHeight: 1.05
  body:
    fontFamily: Geist Variable
    fontSize: 16px
    fontWeight: 600
    lineHeight: 1.75
  label:
    fontFamily: Geist Variable
    fontSize: 12px
    fontWeight: 900
    letterSpacing: 0.02em
rounded:
  none: 0px
spacing:
  xs: 8px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 48px
components:
  button-primary:
    backgroundColor: "{colors.peach}"
    textColor: "{colors.button-text}"
    rounded: "{rounded.none}"
    padding: 16px
  button-primary-hover:
    backgroundColor: "{colors.peach}"
  button-secondary:
    backgroundColor: "{colors.base}"
    textColor: "{colors.text}"
    rounded: "{rounded.none}"
  card:
    backgroundColor: "{colors.base}"
    textColor: "{colors.text}"
    rounded: "{rounded.none}"
    padding: 20px
  panel:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.none}"
    padding: 16px
  badge:
    backgroundColor: "{colors.yellow}"
    textColor: "{colors.button-text}"
    rounded: "{rounded.none}"
    typography: "{typography.label}"
  input:
    backgroundColor: "{colors.base}"
    textColor: "{colors.text}"
    rounded: "{rounded.none}"
    height: 48px
---

# Neobrutalism + Catppuccin

## Overview

This system pairs **neobrutalism** (thick borders, hard shadows, sharp
corners, loud uppercase type, physical press interactions) with the
**Catppuccin** palettes: Latte in light mode, Mocha in dark mode. Every
surface should feel like a movable, touchable object — a sticker or a stamped
card — never a soft floating sheet. Themes switch by setting
`html[data-theme="light" | "dark"]`; every color in the system flips
automatically through CSS custom properties.

The living reference is the showcase page at `/design-system/neobrutalism`.
When in doubt, build it there first and compare against neighbors.

## Colors

- **Always consume tokens via CSS variables** — `var(--nb-peach)`, never raw
  hex. The variables resolve per theme (frontmatter lists both resolutions as
  `token` / `token-dark` pairs).
- Semantic roles: **peach** = primary action, **blue** = focus and
  navigation, **green** = success, **yellow** = warning/highlight chips,
  **red** = destructive only, **pink**/**lavender** = expressive highlights,
  **teal** = secondary accent.
- **ink** (`#11111b`) never changes between themes — it is every border and
  every hard shadow.
- **button-text** is always ink: colored surfaces (peach, yellow, green…)
  take dark ink text in BOTH themes, because dark-mode accent colors are
  pastels.
- Keep `base` and `surface` quiet; accents carry the meaning.

## Typography

- One family: **Geist Variable** (via `@fontsource-variable/geist`).
- Display and headings: `font-weight: 900`, `text-transform: uppercase`,
  tight line-height (0.95–1.05). Display sizes are responsive
  (`clamp`/breakpoint steps up to ~96px); heading ≈ 36px.
- Body text is deliberately bold for the system: weight 600, line-height
  1.75. Muted copy uses `var(--nb-muted)` and weight 700.
- Labels/chips: 12px, weight 900, uppercase.
- Prose content uses the `.nb-prose` class (uppercase headings, yellow
  inline code chips, ink-bordered blockquotes, dark code blocks).

## Layout

- Content column: `max-w-7xl` centered, `px-4 md:px-6`.
- Pages alternate **full-bleed bands** (sections with `border-y-4` ink rules
  and `base`/`surface` backgrounds) with contained grids — keep that rhythm.
- Spacing scale: 8 / 12 / 16 / 24 / 48px (Tailwind `gap-2/3/4/6/12`); cards
  pad 20px (`p-5`), panels 16px (`p-4`).
- Horizontal strips (project showcases) use flex + `overflow-x-auto` with
  `snap-x snap-mandatory`; items `shrink-0 snap-start`.

## Elevation & Depth

- Depth is expressed exclusively with **hard offset shadows — zero blur**:
  `8px 8px 0 0 var(--nb-ink)` (hero cards, `.nb-shadow`), `6px 6px`
  (panels/cards), `5px 5px` (buttons), `4px 4px` / `3px 3px` / `2px 2px`
  (chips, compact controls).
- Interaction is physical: hover lifts (`translateY(-2px)`), active
  **collapses the shadow to 0 and translates the element into its shadow's
  place** (`translate(4px, 4px) scale(0.98)`).
- No blur radii, no layered soft shadows, no opacity-based elevation, ever.

## Shapes

- `border-radius: 0` on **everything** — the `rounded.none` token is the
  only radius in the system.
- Standard frame: `border: 4px solid var(--nb-ink)`. Compact chips and row
  items use 2px. Emphasis rules (blockquote bars, section dividers) go up to
  8px.
- In 3D, the same language holds: cel-shaded fills with hard two-band
  terminators, thick inverted-hull ink outlines, no soft lighting.

## Components

Token mappings live in the frontmatter `components` block; implementations:

| Piece | Where |
| --- | --- |
| `.nb-action`, `.nb-card`, `.nb-panel`, `.nb-shadow(-sm)`, `.nb-prose` | `src/styles/starwind.css` (utility classes) |
| Astro UI kit (accordion, dialog, sheet, select, …) | `src/components/starwind/*` |
| React UI kit for islands (nb-skinned shadcn/Radix) | `src/components/shadcn/*` (site) and `src/components/affogato/ui/*` (Affogato boundary) |
| 3D decor primitives (cel shader, shapes, `Accent3D`) | `src/components/three/*` |
| Toasts | sonner via `shadcn/sonner` — type-colored nb toasts |

Component states follow the `-hover` / `-active` convention shown in the
frontmatter (`button-primary-hover`).

## Do's and Don'ts

**Do**

- Use `var(--nb-*)` tokens for every color; test both themes.
- Give every interactive element a visible focus state: `outline: 4px solid
  var(--nb-blue); outline-offset: 4px`.
- Keep shadows hard and borders thick; let layout do the expressive work.
- Uppercase + weight 900 for anything that names a thing.
- Respect `prefers-reduced-motion` (global 1ms overrides exist; 3D scenes
  drop to demand frameloops and static poses).

**Don't**

- No border-radius, no blur, no gradients-as-decoration (checkerboards and
  flat bands instead).
- No raw hex colors in components; no ink text on dark surfaces.
- No soft gray text — muted copy uses the `muted` token at weight 700.
- Don't stack many WebGL canvases; budget ~2 contexts per page.

---

## Using the design system (project guide)

This section extends the spec above with repo-specific practice.

### Source of truth

- **Tokens + utilities**: `src/styles/starwind.css` — the `:root` /
  `html[data-theme="dark"]` blocks define every `--nb-*` variable; the
  `.nb-*` utility classes follow. Change values there only.
- **Affogato portability shim**: `src/components/affogato/tokens.css`
  mirrors the subset Affogato uses. It is NOT imported in the site build;
  it exists so the app can be extracted into a standalone Vite project.
  Keep it in sync when token values change.

### The living showcase

`/design-system/neobrutalism` demonstrates everything with anchors:
`#components` (accordion, alert, breadcrumb, card, button, checkbox, input,
input-group, radio-group, select, dialog, image, progress, sheet, tooltip),
`#three-decor` (the five 3D accent shapes), `#react-overlays` (React
dialog + toasts), `#playground`, `#tokens`, `#docs`. Add a `ShowcaseCard`
there whenever you introduce a component.

### Choosing a component set

- **Astro pages** → use `src/components/starwind/*` (zero-JS, styled via
  `.nb-page [data-slot=…]` rules on the showcase page).
- **React islands** → use the nb-skinned shadcn set: `src/components/shadcn/*`
  on site pages, `src/components/affogato/ui/*` inside Affogato (the
  duplication is deliberate — the Affogato boundary must stay self-contained).
- **One-off markup** → compose the `.nb-card` / `.nb-panel` / `.nb-action`
  utilities with Tailwind arbitrary values referencing tokens, e.g.
  `border-4 border-[var(--nb-ink)] bg-[var(--nb-yellow)]
  text-[var(--nb-button-text)] shadow-[4px_4px_0_0_var(--nb-ink)]`.

### 3D decor

Drop a cel-shaded accent anywhere with
`<Accent3D shape="coin" color="peach" size="9rem" />`
(shapes: box | sphere | torus | cone | coin; colors: any token name). It
hydrates `client:visible`, pauses offscreen and under reduced motion, and
follows the theme live. Keep to a few per page — browsers cap WebGL
contexts (the timer scene + one preview is the working budget in Affogato).

### Theming contract

The site stores the choice in `localStorage["nb-theme"]` and reflects it as
`html[data-theme]` plus a `.dark` class. Islands that need the effective
theme resolve it in effects (never during render — SSR has no
`matchMedia`) and can watch `data-theme` mutations (see
`src/components/three/useNbPalette.ts`).

### Accessibility conventions

- 4px blue focus outline with 4px offset, everywhere.
- Programmatic names for every control (label htmlFor / aria-label —
  including Radix Slider thumbs, which need the label forwarded).
- Decorative canvases and icons: `aria-hidden`.
- Charts expose `role="img"` with a data-bearing `aria-label`.
