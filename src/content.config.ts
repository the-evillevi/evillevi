import { glob } from "astro/loaders";
import { defineCollection, z } from "astro:content";

function normalizeTags(tags: string[]) {
  return [...new Set(tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean))];
}

const baseSchema = ({ image }: { image: () => any }) =>
  z.object({
    title: z.string().max(80),
    description: z.string().max(180),
    publishDate: z.coerce.date().optional(),
    updatedDate: z.coerce.date().optional(),
    heroImage: image().optional(),
    accentColor: z.string().optional(),
    tags: z.array(z.string()).default([]).transform(normalizeTags),
    draft: z.boolean().default(false),
    comment: z.boolean().default(true),
  });

const blog = defineCollection({
  loader: glob({ base: "./src/content/blog", pattern: "**/*.{md,mdx}" }),
  schema: (context) =>
    baseSchema(context).extend({
      publishDate: z.coerce.date(),
    }),
});

const docs = defineCollection({
  loader: glob({ base: "./src/content/docs", pattern: "**/*.{md,mdx}" }),
  schema: (context) =>
    baseSchema(context).extend({
      order: z.number().default(999),
    }),
});

export const collections = { blog, docs };
