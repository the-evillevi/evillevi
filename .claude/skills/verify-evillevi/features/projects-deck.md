# Projects deck

`/projects` is a reveal.js 2D deck. The first slide is the "Selected Work" intro. Left and right move between projects, one column per entry in the `projects` collection, down opens that project's deep dive (its MDX body), and Escape shows the overview grid.

## Sub-features

- `deck-intro` opens on the "Selected Work" slide with the navigation hints.
- `deck-horizontal` moves to the next or previous project with the arrow keys or the on-screen controls.
- `deck-deep-dive` moves down into the current project's case study, so the slide number reads `N / 2`.
- `deck-overview` toggles the bird's-eye overview with Escape.
- `deck-theme` restyles the reveal controls for `html[data-theme="dark"]`. Not automated: run with `--theme dark` and check the screenshots.

## How to get to it (user POV)

- Choose "Projects" in the header, or open `/projects/`.
- Use the arrow keys after clicking inside the deck, the on-screen arrows at the bottom right, or swipe on touch screens.

## Driving it with drive.mjs

Preconditions:

- The instance is healthy, and `#projects-deck.reveal.ready` exists, which reveal adds once it initializes.

- **Intro.** Open `/projects/`. The present slide's heading is "Selected Work".
- **Focus.** Click an empty corner of `#projects-deck` (position 20,20). The keyboard does nothing before this.
- **Right.** Press ArrowRight. The heading changes to the first project's title, and `.slide-number` reads `2 / 1`.
- **Walk to the project.** Keep pressing ArrowRight until the heading is the `--project` title (default `gg³`, which has real copy). Affogato comes first and its deep dive is still placeholder text (EVL-137).
- **Down.** Press ArrowDown. `.slide-number` reads `N / 2`, the deep dive card is visible, and its text has no `[UPPER_CASE]` placeholder tokens.
- **Overview.** Press Escape. `#projects-deck` gains the `overview` class.
- **Proof.** Run `node .claude/skills/verify-evillevi/scripts/drive.mjs projects-deck`. There are five screenshots, from `01-deck-intro.png` to `05-deck-overview.png`. Add `--project <title>` to open another project's deep dive.

## Gotchas

- `keyboardCondition: "focused"` ignores `element.focus()`. Only a pointer press inside the deck enables the keys.
- Slide transitions emit no event Playwright can await, so the journey waits 900 ms after each key.
- Project order follows the `order` field in the collection. Walk to a project by title; never hardcode its position.
- reveal.js CSS is unlayered and beats Tailwind utilities, so deck style overrides live in ID-scoped global rules.
