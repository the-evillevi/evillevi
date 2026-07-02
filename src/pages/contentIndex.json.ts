import type { APIRoute } from "astro";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { visit } from "unist-util-visit";
import type { Root } from "mdast";
import { stripWikilinks } from "@/plugins/remark-wikilinks";
import { getBlogPosts, getDocsEntries, type ContentEntry } from "@/utils/content";
import { extractInternalLinks } from "@/utils/links";

function extractText(tree: Root) {
  const parts: string[] = [];
  visit(tree, (node) => {
    if (node.type === "text" || node.type === "code") parts.push(node.value);
  });
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

function toIndexEntry(entry: ContentEntry) {
  const tree = unified()
    .use(remarkParse)
    .parse(entry.body ?? "") as Root;
  const slug = `${entry.collection}/${entry.id}`;
  const publishDate = entry.collection === "blog" ? entry.data.publishDate : entry.data.publishDate;

  return [
    slug,
    {
      slug,
      title: entry.data.title,
      content: stripWikilinks(extractText(tree)),
      tags: entry.data.tags,
      links: extractInternalLinks(entry.body, entry.collection),
      collection: entry.collection,
      publishDate: publishDate?.toISOString(),
    },
  ] as const;
}

export const GET: APIRoute = async () => {
  const entries = [...(await getBlogPosts()), ...(await getDocsEntries())];
  return new Response(JSON.stringify(Object.fromEntries(entries.map(toIndexEntry))), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600",
    },
  });
};
