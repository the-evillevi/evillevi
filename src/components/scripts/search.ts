import uFuzzy from "@leeoniya/ufuzzy";

interface ContentDetails {
  slug: string;
  title: string;
  content: string;
  tags: string[];
  links: string[];
  collection: "blog" | "docs";
  publishDate?: string;
}

type ContentIndex = Record<string, ContentDetails>;

interface SearchItem extends ContentDetails {
  id: number;
}

interface FieldHit {
  rank: number;
  ranges: number[];
}

interface ItemMatch {
  item: SearchItem;
  score: number;
  titleRanges: number[];
  contentRanges: number[];
}

// uFuzzy's documented unicode preset, so accented characters match.
const unicodeOpts = {
  unicode: true,
  interSplit: "[^\\p{L}\\d']+",
  intraSplit: "\\p{Ll}\\p{Lu}",
  intraBound: "\\p{L}\\d|\\d\\p{L}|\\p{Ll}\\p{Lu}",
  intraChars: "[\\p{L}\\d']",
  intraContr: "'\\p{L}{1,2}\\b",
} as const;

// Tiered matchers: plain substring for short terms, single-error typo
// tolerance ("grpah" -> "graph"), then fzf-style subsequence ("gdn" -> "garden").
const ufExact = new uFuzzy({ ...unicodeOpts });
const ufTypo = new uFuzzy({
  ...unicodeOpts,
  intraMode: 1,
  intraSub: 1,
  intraTrn: 1,
  intraDel: 1,
  intraIns: 1,
});
const ufSub = new uFuzzy({ ...unicodeOpts, intraMode: 0, intraIns: 4 });

const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]!,
  );

const MARK_OPEN = '<mark class="bg-[var(--nb-yellow)] px-0.5 text-[var(--nb-button-text)]">';

/** Escape while wrapping the given flat [start,end,...] ranges in marks.
 *  Ranges index the RAW string — slice first, escape each segment after. */
function highlightRanges(value: string, ranges: number[]): string {
  if (!ranges.length) return escapeHtml(value);
  let html = "";
  let pos = 0;
  for (let i = 0; i < ranges.length; i += 2) {
    const start = ranges[i]!;
    const end = ranges[i + 1]!;
    if (start < pos) continue;
    html += `${escapeHtml(value.slice(pos, start))}${MARK_OPEN}${escapeHtml(value.slice(start, end))}</mark>`;
    pos = end;
  }
  return html + escapeHtml(value.slice(pos));
}

/** ~220-char window centered on the first match, with re-based highlights. */
function excerptWithRanges(content: string, ranges: number[]): string {
  if (!ranges.length) return escapeHtml(content.slice(0, 180));
  const start = Math.max(0, ranges[0]! - 90);
  const end = Math.min(content.length, start + 220);
  const local: number[] = [];
  for (let i = 0; i < ranges.length; i += 2) {
    const s = Math.max(ranges[i]!, start);
    const e = Math.min(ranges[i + 1]!, end);
    if (s < e) local.push(s - start, e - start);
  }
  return `${start > 0 ? "..." : ""}${highlightRanges(content.slice(start, end), local)}${
    end < content.length ? "..." : ""
  }`;
}

/** Coalesce overlapping flat range pairs accumulated across terms. */
function mergeRanges(flat: number[]): number[] {
  if (flat.length <= 2) return flat;
  const pairs: [number, number][] = [];
  for (let i = 0; i < flat.length; i += 2) pairs.push([flat[i]!, flat[i + 1]!]);
  pairs.sort((a, b) => a[0] - b[0]);
  const merged = [pairs[0]!];
  for (const [start, end] of pairs.slice(1)) {
    const last = merged[merged.length - 1]!;
    if (start <= last[1]) last[1] = Math.max(last[1], end);
    else merged.push([start, end]);
  }
  return merged.flat();
}

/** Search one haystack for one term through the tiered passes; first pass to
 *  hit an index wins, later passes rank strictly below earlier ones. */
function searchHaystack(haystack: string[], term: string): Map<number, FieldHit> {
  const passes = term.length < 3 ? [ufExact] : [ufTypo, ufSub];
  const hits = new Map<number, FieldHit>();
  let rankBase = 0;
  for (const uf of passes) {
    const [idxs, info, order] = uf.search(haystack, term, 0);
    if (info && order) {
      for (let r = 0; r < order.length; r++) {
        const j = order[r]!;
        const idx = info.idx[j]!;
        if (!hits.has(idx)) hits.set(idx, { rank: rankBase + r, ranges: info.ranges[j] ?? [] });
      }
    } else if (idxs) {
      idxs.forEach((idx, r) => {
        if (!hits.has(idx)) hits.set(idx, { rank: rankBase + r, ranges: [] });
      });
    }
    rankBase += 1000;
  }
  return hits;
}

async function loadIndex() {
  const response = await fetch("/contentIndex.json");
  if (!response.ok) throw new Error("Failed to load content index");
  return (await response.json()) as ContentIndex;
}

function renderResult(match: ItemMatch) {
  const { item } = match;
  const result = document.createElement("a");
  result.href = `/${item.slug}`;
  result.className =
    "block border-4 border-[var(--nb-ink)] bg-[var(--nb-base)] p-4 font-bold transition hover:-translate-y-1";
  result.dataset.slug = item.slug;
  result.innerHTML = `
    <span class="mb-2 inline-flex border-2 border-[var(--nb-ink)] bg-[var(--nb-pink)] px-2 py-1 text-xs font-black uppercase text-[var(--nb-button-text)]">${escapeHtml(item.collection)}</span>
    <h2 class="text-xl font-black uppercase">${highlightRanges(item.title, match.titleRanges)}</h2>
    <p class="mt-2 text-sm text-[var(--nb-muted)]">${excerptWithRanges(item.content, match.contentRanges)}</p>
  `;
  return result;
}

function renderGroupHeader(label: string) {
  const heading = document.createElement("p");
  heading.className =
    "border-b-4 border-[var(--nb-ink)] pb-1 text-xs font-black uppercase text-[var(--nb-muted)]";
  heading.textContent = label;
  return heading;
}

function renderTagRow(hits: { tag: string; ranges: number[] }[]) {
  const row = document.createElement("div");
  row.className = "flex flex-wrap gap-2";
  row.innerHTML = hits
    .map(
      ({ tag, ranges }) =>
        `<a class="border-2 border-[var(--nb-ink)] bg-[var(--nb-yellow)] px-2 py-1 text-xs font-black text-[var(--nb-button-text)] uppercase transition hover:-translate-y-0.5" href="/tags/${encodeURIComponent(tag)}">#${highlightRanges(tag, ranges)}</a>`,
    )
    .join("");
  return row;
}

export async function initSearch() {
  const roots = document.querySelectorAll<HTMLElement>("[data-search-root]");
  if (!roots.length) return;

  const data = await loadIndex();
  const items: SearchItem[] = Object.values(data).map((item, id) => ({ ...item, id }));

  // Field haystacks share the items' index order.
  const titles = items.map((item) => item.title);
  const contents = items.map((item) => item.content);
  const tagStrs = items.map((item) => item.tags.join(" "));

  const allTags = [...new Set(items.flatMap((item) => item.tags))].sort();
  const tagCollections = new Map<string, Set<string>>();
  for (const item of items) {
    for (const tag of item.tags) {
      if (!tagCollections.has(tag)) tagCollections.set(tag, new Set());
      tagCollections.get(tag)!.add(item.collection);
    }
  }

  const FIELD_WEIGHT = { title: 0, tags: 1, content: 2 } as const;

  function searchQuery(query: string): ItemMatch[] {
    const terms = query.split(/\s+/).filter(Boolean);
    const perTerm = terms.map((term) => ({
      title: searchHaystack(titles, term),
      tags: searchHaystack(tagStrs, term),
      content: searchHaystack(contents, term),
    }));

    const results: ItemMatch[] = [];
    for (let idx = 0; idx < items.length; idx++) {
      let score = 0;
      const titleRanges: number[] = [];
      const contentRanges: number[] = [];
      let allTermsHit = true;
      for (const fields of perTerm) {
        let best = Infinity;
        for (const field of ["title", "tags", "content"] as const) {
          const hit = fields[field].get(idx);
          if (!hit) continue;
          best = Math.min(best, FIELD_WEIGHT[field] * 10000 + hit.rank);
          if (field === "title") titleRanges.push(...hit.ranges);
          if (field === "content") contentRanges.push(...hit.ranges);
        }
        if (best === Infinity) {
          // Every term must hit somewhere on the item.
          allTermsHit = false;
          break;
        }
        score += best;
      }
      if (allTermsHit) {
        results.push({
          item: items[idx]!,
          score,
          titleRanges: mergeRanges(titleRanges),
          contentRanges: mergeRanges(contentRanges),
        });
      }
    }
    return results.sort((a, b) => a.score - b.score);
  }

  function searchTags(query: string): { tag: string; ranges: number[]; rank: number }[] {
    // OR semantics: a short chip rarely contains every term of a long query.
    const terms = query.split(/\s+/).filter(Boolean);
    const best = new Map<number, FieldHit>();
    for (const term of terms) {
      for (const [idx, hit] of searchHaystack(allTags, term)) {
        const prior = best.get(idx);
        if (!prior) {
          best.set(idx, { rank: hit.rank, ranges: hit.ranges });
        } else {
          prior.rank = Math.min(prior.rank, hit.rank);
          prior.ranges = mergeRanges([...prior.ranges, ...hit.ranges]);
        }
      }
    }
    return [...best.entries()]
      .map(([idx, hit]) => ({ tag: allTags[idx]!, ranges: hit.ranges, rank: hit.rank }))
      .sort((a, b) => a.rank - b.rank);
  }

  for (const root of roots) {
    if (root.dataset.searchBound === "true") continue;
    root.dataset.searchBound = "true";
    const input = root.querySelector<HTMLInputElement>("[data-search-input]");
    const type = root.querySelector<HTMLSelectElement>("[data-search-type]");
    const results = root.querySelector<HTMLElement>("[data-search-results]");
    if (!input || !type || !results) continue;

    const run = () => {
      const term = input.value.trim();
      const collection = type.value;

      const matches = (
        term
          ? searchQuery(term)
          : items.map((item) => ({ item, score: 0, titleRanges: [], contentRanges: [] }))
      )
        .filter(({ item }) => collection === "all" || item.collection === collection)
        .slice(0, 12);

      // Grouped output, LessWrong-style: posts, then docs, then matching tags.
      const children: HTMLElement[] = [];
      for (const [group, label] of [
        ["blog", "Blog"],
        ["docs", "Docs"],
      ] as const) {
        const groupMatches = matches.filter(({ item }) => item.collection === group);
        if (!groupMatches.length) continue;
        children.push(renderGroupHeader(label));
        children.push(...groupMatches.map(renderResult));
      }
      if (term) {
        const tagHits = searchTags(term).filter(
          ({ tag }) => collection === "all" || tagCollections.get(tag)?.has(collection),
        );
        if (tagHits.length) {
          children.push(renderGroupHeader("Tags"));
          children.push(renderTagRow(tagHits));
        }
      }
      if (!children.length) {
        const empty = document.createElement("p");
        empty.className = "font-black uppercase text-[var(--nb-muted)]";
        empty.textContent = "No results";
        children.push(empty);
      }
      results.replaceChildren(...children);
    };

    input.addEventListener("input", run);
    type.addEventListener("change", run);
    run();
  }
}
