import type { ContentEntry } from "@/utils/content";
import { entryHref } from "@/utils/content";

const WIKILINK_REGEX = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;
const MARKDOWN_LINK_REGEX = /\[([^\]]+)\]\(([^)]+)\)/g;

export interface ContentLink {
  id: string;
  title: string;
  url: string;
  collection: "blog" | "docs";
  date?: Date;
}

export interface Backlink extends ContentLink {
  context?: string;
}

export function normalizeContentId(id: string, _currentCollection: "blog" | "docs" = "blog") {
  let slug = id
    .trim()
    .toLowerCase()
    .replace(/\.(md|mdx)$/, "")
    .replace(/\s+/g, "-")
    .replace(/[^\w\-/]/g, "")
    .replace(/^\/+|\/+$/g, "")
    .replace(/\/index$/, "");

  if (slug.startsWith("./")) slug = slug.slice(2);
  if (slug.startsWith("blog/") || slug.startsWith("docs/")) return slug;
  return `blog/${slug}`;
}

export function extractInternalLinks(
  content = "",
  currentCollection: "blog" | "docs" = "blog",
): string[] {
  const links: string[] = [];

  for (const match of content.matchAll(WIKILINK_REGEX)) {
    links.push(normalizeContentId(match[1], currentCollection));
  }

  for (const match of content.matchAll(MARKDOWN_LINK_REGEX)) {
    const url = match[2].trim();
    if (url.startsWith("http") || url.startsWith("#") || url.startsWith("mailto:")) continue;
    if (url.startsWith("./")) links.push(normalizeContentId(url.slice(2), currentCollection));
    else if (url.startsWith("/blog/")) links.push(normalizeContentId(url.replace(/^\/+/, "")));
    else if (url.startsWith("/docs/")) links.push(normalizeContentId(url.replace(/^\/+/, "")));
  }

  return [...new Set(links)];
}

function getEntryKey(entry: ContentEntry) {
  return `${entry.collection}/${entry.id}`;
}

function toContentLink(entry: ContentEntry): ContentLink {
  return {
    id: getEntryKey(entry),
    title: entry.data.title,
    url: entryHref(entry),
    collection: entry.collection,
    date: entry.collection === "blog" ? entry.data.publishDate : entry.data.publishDate,
  };
}

function contextSnippet(content: string, target: string) {
  const shortTarget = target.replace(/^(blog|docs)\//, "");
  const patterns = [
    new RegExp(`\\[\\[${escapeRegExp(shortTarget)}(?:\\|[^\\]]+)?\\]\\]`, "i"),
    new RegExp(`\\((?:\\./|/)${escapeRegExp(shortTarget)}\\)`, "i"),
  ];
  const match = patterns.map((pattern) => pattern.exec(content)).find(Boolean);
  if (!match) return undefined;
  const start = Math.max(0, match.index - 70);
  const end = Math.min(content.length, match.index + match[0].length + 70);
  return `${start > 0 ? "..." : ""}${content.slice(start, end).replace(/\s+/g, " ").trim()}${
    end < content.length ? "..." : ""
  }`;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function getOutgoingLinks(entry: ContentEntry, entries: ContentEntry[]) {
  const entryMap = new Map(entries.map((item) => [getEntryKey(item), item]));
  return extractInternalLinks(entry.body, entry.collection)
    .map((target) => entryMap.get(target))
    .filter((target): target is ContentEntry => Boolean(target))
    .map(toContentLink);
}

export function getBacklinks(entry: ContentEntry, entries: ContentEntry[]) {
  const targetKey = getEntryKey(entry);
  const backlinks: Backlink[] = [];

  for (const candidate of entries) {
    if (getEntryKey(candidate) === targetKey) continue;
    const links = extractInternalLinks(candidate.body, candidate.collection);
    if (!links.includes(targetKey)) continue;
    backlinks.push({
      ...toContentLink(candidate),
      context: contextSnippet(candidate.body ?? "", targetKey),
    });
  }

  return backlinks;
}
