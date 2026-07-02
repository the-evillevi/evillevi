import * as d3 from "d3";

interface ContentDetails {
  slug: string;
  title: string;
  tags: string[];
  links: string[];
  collection: "blog" | "docs";
}

interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  title: string;
  group: string;
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  source: string | GraphNode;
  target: string | GraphNode;
}

type ContentIndex = Record<string, ContentDetails>;

async function loadIndex() {
  const response = await fetch("/contentIndex.json");
  if (!response.ok) throw new Error("Failed to load content index");
  return (await response.json()) as ContentIndex;
}

function buildGraph(data: ContentIndex, currentSlug?: string | null, global = false) {
  const nodes = new Map<string, GraphNode>();
  const links: GraphLink[] = [];
  const include = new Set<string>();

  if (!global && currentSlug && data[currentSlug]) {
    include.add(currentSlug);
    data[currentSlug].links.forEach((link) => include.add(link.replace(/^\/+/, "")));
    Object.values(data).forEach((item) => {
      if (item.links.map((link) => link.replace(/^\/+/, "")).includes(currentSlug))
        include.add(item.slug);
    });
  }

  for (const item of Object.values(data)) {
    if (!global && include.size && !include.has(item.slug)) continue;
    nodes.set(item.slug, { id: item.slug, title: item.title, group: item.collection });
    for (const tag of item.tags) {
      const tagId = `tags/${tag}`;
      nodes.set(tagId, { id: tagId, title: `#${tag}`, group: "tag" });
      links.push({ source: item.slug, target: tagId });
    }
  }

  for (const item of Object.values(data)) {
    if (!nodes.has(item.slug)) continue;
    for (const link of item.links) {
      const target = link.replace(/^\/+/, "");
      if (nodes.has(target)) links.push({ source: item.slug, target });
    }
  }

  return { nodes: [...nodes.values()], links };
}

function renderGraph(root: HTMLElement, data: ContentIndex, global = false) {
  const canvas = root.querySelector<HTMLElement>("[data-graph-canvas]");
  if (!canvas) return;
  canvas.replaceChildren();

  const currentSlug = root.dataset.currentSlug;
  const { nodes, links } = buildGraph(data, currentSlug, global);
  const width = canvas.clientWidth || 320;
  const height = canvas.clientHeight || 224;
  const color = (group: string) =>
    group === "docs" ? "var(--nb-teal)" : group === "tag" ? "var(--nb-yellow)" : "var(--nb-peach)";

  const svg = d3
    .select(canvas)
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("width", "100%")
    .attr("height", "100%");

  const simulation = d3
    .forceSimulation(nodes)
    .force(
      "link",
      d3
        .forceLink<GraphNode, GraphLink>(links)
        .id((node) => node.id)
        .distance(70),
    )
    .force("charge", d3.forceManyBody().strength(-180))
    // In local mode the radius reserves room for the label row under each node.
    .force("collide", d3.forceCollide<GraphNode>().radius(global ? 12 : 26))
    .force("center", d3.forceCenter(width / 2, height / 2));

  const link = svg
    .append("g")
    .selectAll("line")
    .data(links)
    .join("line")
    .attr("stroke", "var(--nb-ink)")
    .attr("stroke-width", 2);

  const node = svg
    .append("g")
    .selectAll("g")
    .data(nodes)
    .join("g")
    .style("cursor", "pointer")
    .on("click", (_, datum) => {
      if (!datum.id.startsWith("tags/")) window.location.href = `/${datum.id}`;
      else window.location.href = `/${datum.id}`;
    })
    .call(
      d3
        .drag<SVGGElement, GraphNode>()
        .on("start", (event, datum) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          datum.fx = datum.x;
          datum.fy = datum.y;
        })
        .on("drag", (event, datum) => {
          datum.fx = event.x;
          datum.fy = event.y;
        })
        .on("end", (event, datum) => {
          if (!event.active) simulation.alphaTarget(0);
          datum.fx = null;
          datum.fy = null;
        }) as any,
    );

  node
    .append("circle")
    .attr("r", (datum) => (datum.id === currentSlug ? 9 : 6))
    .attr("fill", (datum) => color(datum.group))
    .attr("stroke", "var(--nb-ink)")
    .attr("stroke-width", 3);

  // Labels only in local mode — the global graph is too dense for a 288px
  // panel; its native <title> tooltips still expose every title on hover.
  if (!global) {
    node
      .append("text")
      .text((datum) => {
        const label = datum.title.toUpperCase();
        return label.length > 18 ? `${label.slice(0, 17)}…` : label;
      })
      .attr("dy", (datum) => (datum.id === currentSlug ? 21 : 18))
      .attr("text-anchor", "middle")
      .attr("fill", "var(--nb-text)")
      .attr("font-size", 9)
      .attr("font-weight", 900)
      .attr("paint-order", "stroke")
      .attr("stroke", "var(--nb-base)")
      .attr("stroke-width", 3)
      .attr("stroke-linejoin", "round")
      .style("pointer-events", "none");
  }

  node.append("title").text((datum) => datum.title);

  simulation.on("tick", () => {
    // Keep nodes (and dragged nodes) inside the viewBox; the larger bottom
    // inset in local mode reserves space for the label row.
    for (const datum of nodes) {
      datum.x = Math.max(14, Math.min(width - 14, datum.x ?? 0));
      datum.y = Math.max(14, Math.min(height - (global ? 14 : 28), datum.y ?? 0));
    }

    link
      .attr("x1", (datum) => (datum.source as GraphNode).x ?? 0)
      .attr("y1", (datum) => (datum.source as GraphNode).y ?? 0)
      .attr("x2", (datum) => (datum.target as GraphNode).x ?? 0)
      .attr("y2", (datum) => (datum.target as GraphNode).y ?? 0);

    node.attr("transform", (datum) => `translate(${datum.x ?? 0},${datum.y ?? 0})`);
  });
}

let cachedIndex: ContentIndex | null = null;

export async function initGraphViews() {
  const roots = document.querySelectorAll<HTMLElement>("[data-graph-view]");
  if (!roots.length) return;
  cachedIndex ??= await loadIndex();

  roots.forEach((root) => {
    renderGraph(root, cachedIndex!);
    const toggle = root.querySelector<HTMLButtonElement>("[data-graph-toggle]");
    if (!toggle || toggle.dataset.bound === "true") return;
    toggle.dataset.bound = "true";
    toggle.addEventListener("click", () => {
      const isGlobal = toggle.dataset.global !== "true";
      toggle.dataset.global = String(isGlobal);
      toggle.textContent = isGlobal ? "Local" : "Global";
      renderGraph(root, cachedIndex!, isGlobal);
    });
  });
}
