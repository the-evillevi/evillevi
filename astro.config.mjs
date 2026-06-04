import tailwindcss from "@tailwindcss/vite";
// @ts-check
import { rehypeHeadingIds } from "@astrojs/markdown-remark";
import mdx from "@astrojs/mdx";
import { defineConfig } from "astro/config";

import react from "@astrojs/react";
import mermaid from "astro-mermaid";
import rehypeKatex from "rehype-katex";
import remarkMath from "remark-math";

import rehypeAutoLinkHeadings from "./src/plugins/rehype-auto-link-headings.ts";
import remarkWikilinks from "./src/plugins/remark-wikilinks.ts";

// https://astro.build/config
export default defineConfig({
  vite: {
    plugins: [tailwindcss()],
  },

  markdown: {
    remarkPlugins: [remarkMath, [remarkWikilinks, { basePath: "/blog" }]],
    rehypePlugins: [
      rehypeKatex,
      rehypeHeadingIds,
      [
        rehypeAutoLinkHeadings,
        {
          behavior: "append",
          properties: { className: ["heading-anchor"] },
          content: { type: "text", value: "#" },
        },
      ],
    ],
  },

  integrations: [react(), mdx(), mermaid()],
});
