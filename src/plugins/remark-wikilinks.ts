import type { Link, Root, Text } from "mdast";
import type { Plugin } from "unified";
import { visit } from "unist-util-visit";

interface WikilinkOptions {
  basePath?: string;
  validSlugs?: Set<string>;
}

const WIKILINK_REGEX = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;

function normalizeSlug(slug: string) {
  return slug
    .trim()
    .toLowerCase()
    .replace(/\.(md|mdx)$/, "")
    .replace(/\s+/g, "-")
    .replace(/[^\w\-/]/g, "")
    .replace(/^\/+|\/+$/g, "")
    .replace(/\/index$/, "");
}

function parseWikilink(value: string) {
  const match = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/.exec(value);
  if (!match) return null;
  const rawSlug = match[1].trim();
  const displayText = match[2]?.trim() || rawSlug;
  const slug = rawSlug.startsWith("./") ? rawSlug.slice(2) : rawSlug;
  return { slug: slug.replace(/\.(md|mdx)$/, ""), displayText };
}

/** Replace `[[target|display]]` tokens with their display text (plain-text contexts). */
export function stripWikilinks(value: string): string {
  return value.replace(WIKILINK_REGEX, (match) => parseWikilink(match)?.displayText ?? match);
}

const remarkWikilinks: Plugin<[WikilinkOptions?], Root> = function (options = {}) {
  const { basePath = "/blog", validSlugs } = options;

  return function transformer(tree) {
    visit(tree, "text", (node: Text, index, parent) => {
      if (!parent || index === undefined) return;

      const matches = [...node.value.matchAll(WIKILINK_REGEX)];
      if (!matches.length) return;

      const children: Array<Text | Link> = [];
      let lastIndex = 0;

      for (const match of matches) {
        const parsed = parseWikilink(match[0]);
        if (!parsed) continue;

        const start = match.index ?? 0;
        const end = start + match[0].length;
        if (start > lastIndex) {
          children.push({ type: "text", value: node.value.slice(lastIndex, start) });
        }

        const normalized = normalizeSlug(parsed.slug);
        const explicitCollection = normalized.startsWith("blog/") || normalized.startsWith("docs/");
        const url = parsed.slug.startsWith("../")
          ? parsed.slug
          : `/${explicitCollection ? normalized : `${basePath.replace(/^\//, "")}/${normalized}`}`;
        const isValid = !validSlugs || validSlugs.has(normalized);

        children.push({
          type: "link",
          url,
          title: isValid ? null : "This link may be invalid",
          children: [{ type: "text", value: parsed.displayText }],
          data: {
            hProperties: {
              class: isValid ? "wikilink" : "wikilink wikilink-broken",
              "data-wikilink": "true",
            },
          },
        });

        lastIndex = end;
      }

      if (lastIndex < node.value.length) {
        children.push({ type: "text", value: node.value.slice(lastIndex) });
      }

      parent.children.splice(index, 1, ...children);
    });
  };
};

export default remarkWikilinks;
