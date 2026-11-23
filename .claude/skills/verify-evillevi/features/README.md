# evillevi verification map

This directory is the maintained source for verifying what a visitor sees on the evillevi site. Read this index before driving the site, then use the matching feature file as the recipe.

| Feature                        | File                                   | Journey in `drive.mjs` |
| ------------------------------ | -------------------------------------- | ---------------------- |
| Home page and light/dark theme | [home-theme.md](home-theme.md)         | `home-theme`           |
| Header search                  | [search.md](search.md)                 | `search`               |
| Projects deck (`/projects`)    | [projects-deck.md](projects-deck.md)   | `projects-deck`        |
| gg³ chess local practice       | [chess-practice.md](chess-practice.md) | `chess-practice`       |

Not mapped yet: blog posts with wikilinks, KaTeX and mermaid; tags and archives; docs; the Karma, Affogato, AlphaDrop and SC2 bot project pages; RSS. Use the `page` journey for a basic per-route check until they are mapped.

## Baseline preconditions

- `launch.sh <port>` started the instance, and `doctor.sh <port>` prints `doctor ok`.
- Content comes from the working tree's `src/content/`. Nothing needs seeding, and no `.env` is needed except for online chess (see chess-practice.md).
- Every journey starts a fresh browser context: empty localStorage, so the theme follows `--theme`.
- Never drive an instance this run did not start, and never use port 4321.

## Driving conventions

- Prefer ARIA roles and accessible names (`Toggle theme`, `Open search`, `Primary navigation`) over CSS selectors. Use `data-*` hooks (`data-search-results`, `data-theme-toggle`) where no accessible name exists.
- Act the way a visitor does: click, press keys, type. Never call page functions or set state with `evaluate`, except to read state.
- Wait for elements or responses, not fixed sleeps. The fixed waits in `projects-deck` cover reveal.js slide transitions, which raise no event Playwright can await.

## Proof and skip reporting

- Report the evidence dir, the git SHA from `result.json`, and each check line.
- Look at the screenshots. A check can pass on a page that looks broken.
- A sub-feature without a journey is not verified by a nearby journey. Report it as not covered, or drive it by hand with the steps in its file and say so.
- If a precondition is missing (for example the local Supabase stack for online chess), report the failure and the reason. Never weaken a journey to make it pass.

## Feature entry contract

Each feature file starts with an H1 and one paragraph on the visible behavior, then exactly four H2s in this order: `Sub-features`, `How to get to it (user POV)`, `Driving it with drive.mjs`, and `Gotchas`.
