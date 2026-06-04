export const siteConfig = {
  title: "Evillevi Notes",
  author: "Evillevi",
  description: "A personal blog and knowledge base for notes, experiments, and connected ideas.",
  locale: "en-US",
  blogPageSize: 8,
  nav: [
    { title: "Blog", href: "/blog" },
    { title: "Docs", href: "/docs" },
    { title: "Tags", href: "/tags" },
    { title: "Archives", href: "/archives" },
    { title: "Search", href: "/search" },
  ],
  social: {
    github: "https://github.com/evillevi",
  },
  giscus: {
    enabled: false,
    repo: "",
    repoId: "",
    category: "",
    categoryId: "",
  },
} as const;

export type SiteConfig = typeof siteConfig;
