import rss from "@astrojs/rss";
import type { APIRoute } from "astro";
import { siteConfig } from "@/site.config";
import { entryHref, getBlogPosts } from "@/utils/content";

export const GET: APIRoute = async (context) => {
  const posts = await getBlogPosts();
  return rss({
    title: siteConfig.title,
    description: siteConfig.description,
    site: context.site ?? new URL(context.url.origin),
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.publishDate,
      link: entryHref(post),
    })),
  });
};
