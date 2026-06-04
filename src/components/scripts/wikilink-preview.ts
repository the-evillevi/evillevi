import tippy from "tippy.js";
import "tippy.js/dist/tippy.css";

interface ContentDetails {
  slug: string;
  title: string;
  content: string;
  tags: string[];
  collection: "blog" | "docs";
}

type ContentIndex = Record<string, ContentDetails>;

let contentIndex: ContentIndex | null = null;
const parser = new DOMParser();

async function loadIndex() {
  if (contentIndex) return contentIndex;
  const response = await fetch("/contentIndex.json");
  if (!response.ok) throw new Error("Failed to load content index");
  contentIndex = (await response.json()) as ContentIndex;
  return contentIndex;
}

function extractSlug(href: string) {
  let slug = href.replace(window.location.origin, "").replace(/^\/+|\/+$/g, "");
  if (!slug.startsWith("blog/") && !slug.startsWith("docs/")) slug = `blog/${slug}`;
  return slug;
}

function normalizeRelativeUrls(root: Element | Document, targetUrl: string) {
  const base = new URL(targetUrl);
  root
    .querySelectorAll("[href^='./'], [href^='../'], [src^='./'], [src^='../']")
    .forEach((node) => {
      const attr = node.hasAttribute("href") ? "href" : "src";
      const value = node.getAttribute(attr);
      if (!value) return;
      const rebased = new URL(value, base);
      node.setAttribute(attr, `${rebased.pathname}${rebased.hash}`);
    });
}

async function createPreview(slug: string) {
  const index = await loadIndex();
  const details = index[slug];
  const container = document.createElement("article");
  container.className = "max-h-[440px] w-[min(520px,calc(100vw-2rem))] overflow-auto p-4";

  const title = document.createElement("h2");
  title.className = "mb-3 text-xl font-black uppercase";
  title.textContent = details?.title ?? slug;
  container.appendChild(title);

  try {
    const url = `/${slug}`;
    const response = await fetch(url);
    const html = parser.parseFromString(await response.text(), "text/html");
    normalizeRelativeUrls(html, url);
    const content = html.querySelector("#content") ?? html.querySelector("main") ?? html.body;
    const clone = content.cloneNode(true) as HTMLElement;
    clone.querySelectorAll("aside, nav, script, style").forEach((node) => node.remove());
    clone.className = "nb-prose text-sm";
    container.appendChild(clone);
  } catch {
    const fallback = document.createElement("p");
    fallback.className = "font-bold";
    fallback.textContent = details?.content.slice(0, 500) ?? "Preview unavailable.";
    container.appendChild(fallback);
  }

  return container;
}

export function initWikilinkPreviews() {
  document.querySelectorAll<HTMLAnchorElement>("a.wikilink").forEach((link) => {
    if (link.dataset.previewBound === "true") return;
    link.dataset.previewBound = "true";
    const href = link.getAttribute("href");
    if (!href) return;
    const slug = extractSlug(href);

    tippy(link, {
      content: "Loading...",
      allowHTML: true,
      interactive: true,
      placement: "right-start",
      delay: [300, 100],
      maxWidth: "none",
      theme: "wikilink-preview",
      appendTo: () => document.body,
      onShow(instance) {
        createPreview(slug).then((content) => instance.setContent(content));
      },
    });
  });
}

if (typeof window !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initWikilinkPreviews);
  } else {
    initWikilinkPreviews();
  }
}
