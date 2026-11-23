# Header search

The "Search" button in the header opens a right-side sheet. Typing fuzzy-searches blog posts and docs from `/contentIndex.json`, with typo and subsequence matching, highlights the matches, and links to each result and its tags.

## Sub-features

- `search-open` opens the sheet from the header button, with focus in the searchbox.
- `search-index` fetches `/contentIndex.json` once on first use.
- `search-match` returns results with `<mark>` highlights for a title or body match.
- `search-open-result` navigates to the result's page.
- `search-filter` narrows results with the "Filter by type" select (All, Blog, Docs). Not automated yet.
- `search-typo` matches a misspelled query such as `grpah` to "Graph Garden". Not automated yet.

## How to get to it (user POV)

- Choose "Search" (accessible name "Open search") in the header on any site-layout page.

## Driving it with drive.mjs

Preconditions:

- The instance is healthy, and the posts "Graph Garden" and "Field Notes for a Connected Blog" exist in `src/content/blog/`.

- **Open.** Choose the button named "Open search". The searchbox named "Search" appears.
- **Query.** Fill the searchbox with `garden`. A request to `/contentIndex.json` returns 200, and `[data-search-results] > a` holds at least one result with at least one `mark`.
- **Open result.** Choose the first result. The URL path equals the result's `href`, for example `/blog/graph-garden`.
- **Proof.** Run `node .claude/skills/verify-evillevi/scripts/drive.mjs search`. The screenshot `01-search-results.png` shows the sheet with highlighted results, and `02-search-result-page.png` shows the opened post.
- **Filter, by hand.** After the query step, select `Docs` in "Filter by type". Only results whose links start with `/docs/` remain.

## Gotchas

- The index is fetched lazily, so the response wait has to be armed before typing, or it misses the request.
- The tag chips inside each result are links too. Select results with `[data-search-results] > a`, not every link in the sheet.
- The content and the index come from `src/content/`. If you renamed a post, check the expected `href` against `/contentIndex.json` first.
