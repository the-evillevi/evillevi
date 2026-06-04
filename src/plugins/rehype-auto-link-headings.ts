import { h } from "hastscript";
import type { Element, Root } from "hast";
import type { Plugin } from "unified";
import { visit } from "unist-util-visit";

interface Options {
  behavior?: "append" | "prepend";
  properties?: Record<string, unknown>;
  content?: { type: "text"; value: string };
}

const rehypeAutoLinkHeadings: Plugin<[Options?], Root> = function (options = {}) {
  const { behavior = "append", properties = {}, content = { type: "text", value: "#" } } = options;

  return function transformer(tree) {
    visit(tree, "element", (node: Element) => {
      if (!/^h[2-6]$/.test(node.tagName)) return;
      const id = node.properties?.id;
      if (typeof id !== "string" || !id) return;

      const anchor = h(
        "a",
        {
          href: `#${id}`,
          ariaHidden: "true",
          tabIndex: -1,
          ...properties,
        },
        [content],
      );

      if (behavior === "prepend") node.children.unshift(anchor);
      else node.children.push(anchor);
    });
  };
};

export default rehypeAutoLinkHeadings;
