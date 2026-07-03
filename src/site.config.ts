export const siteConfig = {
  title: "Evillevi Notes",
  author: "Evillevi",
  description: "A personal blog and knowledge base for notes, experiments, and connected ideas.",
  locale: "en-US",
  blogPageSize: 8,
  nav: [
    { title: "Blog", href: "/blog" },
    { title: "Docs", href: "/docs" },
    { title: "Projects", href: "/projects" },
    { title: "Tags", href: "/tags" },
    { title: "Archives", href: "/archives" },
  ],
  repoUrl: "https://github.com/the-evillevi/evillevi",
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
