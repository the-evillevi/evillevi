import type { CollectionEntry } from "astro:content";
import { getCollection } from "astro:content";

export type ContentEntry = CollectionEntry<"blog"> | CollectionEntry<"docs">;

export function isPublished<T extends ContentEntry>(entry: T) {
  return import.meta.env.PROD ? !entry.data.draft : true;
}

export async function getBlogPosts() {
  const posts = await getCollection("blog", isPublished);
  return posts.sort((a, b) => b.data.publishDate.getTime() - a.data.publishDate.getTime());
}

export async function getDocsEntries() {
  const docs = await getCollection("docs", isPublished);
  return docs.sort((a, b) => {
    const orderDelta = a.data.order - b.data.order;
    return orderDelta || a.data.title.localeCompare(b.data.title);
  });
}

export function entryHref(entry: ContentEntry) {
  return `/${entry.collection}/${entry.id}`;
}

export function formatDate(date?: Date) {
  if (!date) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function getAllTags(entries: ContentEntry[]) {
  const counts = new Map<string, number>();
  for (const entry of entries) {
    for (const tag of entry.data.tags ?? []) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}
