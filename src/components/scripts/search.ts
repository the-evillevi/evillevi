import FlexSearch from "flexsearch";

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

const encoder = (value: string): string[] => {
  const tokens: string[] = [];
  for (const part of value.toLowerCase().split(/\s+/).filter(Boolean)) {
    tokens.push(part);
    for (const char of part) {
      if (/[\u3040-\u30ff\u3400-\u9fff\uf900-\ufaff]/.test(char)) tokens.push(char);
    }
  }
  return tokens;
};

async function loadIndex() {
  const response = await fetch("/contentIndex.json");
  if (!response.ok) throw new Error("Failed to load content index");
  return (await response.json()) as ContentIndex;
}

function excerpt(content: string, term: string) {
  if (!term) return content.slice(0, 180);
  const lower = content.toLowerCase();
  const index = lower.indexOf(term.toLowerCase());
  const start = Math.max(0, index - 90);
  return `${start > 0 ? "..." : ""}${content.slice(start, start + 220)}${
    start + 220 < content.length ? "..." : ""
  }`;
}

function renderResult(item: SearchItem, term: string) {
  const result = document.createElement("a");
  result.href = `/${item.slug}`;
  result.className =
    "block border-4 border-[var(--nb-ink)] bg-[var(--nb-base)] p-4 font-bold transition hover:-translate-y-1";
  result.dataset.slug = item.slug;
  result.innerHTML = `
    <span class="mb-2 inline-flex border-2 border-[var(--nb-ink)] bg-[var(--nb-pink)] px-2 py-1 text-xs font-black uppercase text-[var(--nb-button-text)]">${item.collection}</span>
    <h2 class="text-xl font-black uppercase">${item.title}</h2>
    <p class="mt-2 text-sm text-[var(--nb-muted)]">${excerpt(item.content, term)}</p>
  `;
  return result;
}

function renderPreview(container: HTMLElement, item: SearchItem) {
  container.innerHTML = `
    <p class="mb-2 text-xs font-black uppercase text-[var(--nb-muted)]">${item.collection}</p>
    <h2 class="text-2xl font-black uppercase">${item.title}</h2>
    <p class="mt-3 font-bold">${item.content.slice(0, 700)}</p>
    <div class="mt-4 flex flex-wrap gap-2">${item.tags
      .map(
        (tag) =>
          `<span class="border-2 border-[var(--nb-ink)] bg-[var(--nb-yellow)] px-2 py-1 text-xs font-black text-[var(--nb-button-text)]">#${tag}</span>`,
      )
      .join("")}</div>
  `;
}

export async function initSearch() {
  const roots = document.querySelectorAll<HTMLElement>("[data-search-root]");
  if (!roots.length) return;

  const data = await loadIndex();
  const items = Object.values(data).map((item, id) => ({ ...item, id }));
  const byId = new Map(items.map((item) => [item.id, item]));
  const index = new FlexSearch.Document({
    encode: encoder,
    document: {
      id: "id",
      index: ["title", "content", "tags"],
      tag: "collection",
    },
  });

  for (const item of items) index.add(item);

  for (const root of roots) {
    const input = root.querySelector<HTMLInputElement>("[data-search-input]");
    const type = root.querySelector<HTMLSelectElement>("[data-search-type]");
    const results = root.querySelector<HTMLElement>("[data-search-results]");
    const preview = root.querySelector<HTMLElement>("[data-search-preview]");
    if (!input || !type || !results) continue;

    const run = () => {
      const term = input.value.trim();
      const collection = type.value;
      const ids = new Set<number>();
      if (term) {
        for (const group of index.search(term, { limit: 20 })) {
          for (const id of group.result) ids.add(Number(id));
        }
      } else {
        items.forEach((item) => ids.add(item.id));
      }

      const matches = [...ids]
        .map((id) => byId.get(id))
        .filter((item): item is SearchItem => Boolean(item))
        .filter((item) => collection === "all" || item.collection === collection)
        .slice(0, 12);

      results.replaceChildren(...matches.map((item) => renderResult(item, term)));
      if (preview) {
        if (matches[0]) renderPreview(preview, matches[0]);
        else
          preview.innerHTML =
            '<p class="font-black uppercase text-[var(--nb-muted)]">No results</p>';
      }
    };

    input.addEventListener("input", run);
    type.addEventListener("change", run);
    run();
  }
}
