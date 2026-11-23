#!/usr/bin/env node
// Drive the evillevi site in a real browser and write evidence.
// Usage: node .claude/skills/verify-evillevi/scripts/drive.mjs <journey> [options]
//   journeys: home-theme | search | projects-deck | chess-practice | evil-showcase | page | warm (launch.sh runs warm)
//   --port 4471        dev server launched by launch.sh
//   --route /blog/     page journey only: the route to check
//   --width 1440       viewport width (height follows: 1050, or 844 below 600px wide)
//   --theme light      light | dark, the color scheme the browser reports
//   --project gg³      projects-deck only: the project title whose deep dive to open
//   --out <dir>        evidence dir (default .verify/runs/<timestamp>-<journey>)
// Writes step screenshots, console.json and result.json to the evidence dir.
// Prints PASS or FAIL per check, then "result: PASS|FAIL <dir>". Exit code 1 on FAIL.
import { chromium } from "@playwright/test";
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const [journey, ...rest] = process.argv.slice(2);
const opt = { port: "4471", route: "/", width: "1440", theme: "light", project: "gg³" };
for (let i = 0; i < rest.length; i += 2) opt[rest[i].replace(/^--/, "")] = rest[i + 1];
const base = `http://127.0.0.1:${opt.port}`;
const width = Number(opt.width);
const root = execSync("git rev-parse --show-toplevel").toString().trim();
const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const out = opt.out ?? join(root, ".verify/runs", `${stamp}-${journey}`);
mkdirSync(out, { recursive: true });

const checks = [];
const consoleLog = [];
const failedRequests = [];
let step = 0;

function record(name, ok, detail = "") {
  checks.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` (${detail})` : ""}`);
  if (!ok) throw new Error(`check failed: ${name}`);
}
// The home page's three.js canvases block frames for a few seconds after load while
// SwiftShader compiles shaders, and a screenshot needs a frame. Wait for >= 20 frames/s first.
async function settle(page, timeoutMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const fps = await page.evaluate(
      () =>
        new Promise((r) => {
          let n = 0;
          const s = performance.now();
          const f = () => (++n, performance.now() - s < 500 ? requestAnimationFrame(f) : r(n * 2));
          requestAnimationFrame(f);
        }),
    );
    if (fps >= 20) return fps;
  }
  throw new Error(`page never settled to 20 frames/s within ${timeoutMs}ms`);
}
async function shot(page, label, fullPage = true) {
  await settle(page);
  const file = join(out, `${String(++step).padStart(2, "0")}-${label}.png`);
  await page.screenshot({ path: file, fullPage });
  return file;
}
const theme = (page) => page.evaluate(() => document.documentElement.dataset.theme);

const journeys = {
  // Home renders, theme toggle switches light to dark, the choice persists across a reload.
  async "home-theme"(page) {
    const res = await page.goto(`${base}/`);
    record("home responds 200", res.status() === 200, String(res.status()));
    await page.getByRole("heading", { name: "Featured Projects" }).waitFor();
    const cards = await page
      .locator("article", { has: page.getByRole("link", { name: "View Live Demo" }) })
      .count();
    record("home shows project cards", cards > 0, `${cards} cards`);
    record("starts in light theme", (await theme(page)) === "light", await theme(page));
    await shot(page, "home-light");
    await page
      .getByRole("navigation", { name: "Primary navigation" })
      .getByRole("button", { name: "Toggle theme" })
      .click();
    record("toggle switches to dark", (await theme(page)) === "dark", await theme(page));
    const saved = await page.evaluate(() => localStorage.getItem("nb-theme"));
    record("choice saved to localStorage nb-theme", saved === "dark", String(saved));
    await page.reload();
    record("dark theme survives reload", (await theme(page)) === "dark", await theme(page));
    await shot(page, "home-dark-after-reload");
  },

  // Header search opens, loads the content index, finds a post, and the result navigates.
  async search(page) {
    await page.goto(`${base}/`);
    const index = page.waitForResponse((r) => r.url().endsWith("/contentIndex.json"));
    await page.getByRole("button", { name: "Open search" }).click();
    const input = page.getByRole("searchbox", { name: "Search" });
    await input.waitFor();
    await input.fill("garden");
    const indexRes = await index;
    record(
      "search fetched /contentIndex.json",
      indexRes.status() === 200,
      String(indexRes.status()),
    );
    const results = page.locator("[data-search-results] > a");
    await results.first().waitFor();
    const n = await results.count();
    record("query 'garden' returns results", n > 0, `${n} results`);
    const marked = await page.locator("[data-search-results] mark").count();
    record("matches are highlighted", marked > 0, `${marked} marks`);
    await shot(page, "search-results", false);
    const href = await results.first().getAttribute("href");
    await results.first().click();
    await page.waitForURL((u) => u.pathname.replace(/\/$/, "") === href.replace(/\/$/, ""));
    record("first result opens its page", true, href);
    await shot(page, "search-result-page");
  },

  // reveal.js deck: right = next project, down = its deep dive, Escape = overview.
  // It walks right to --project (default gg³, a project with real copy) so the deep-dive proof isn't placeholder text.
  async "projects-deck"(page) {
    await page.goto(`${base}/projects/`);
    await page.locator("#projects-deck.reveal.ready").waitFor();
    const num = () => page.locator("#projects-deck .slide-number").innerText();
    const current = () =>
      page.evaluate(() => {
        const s =
          document.querySelector("#projects-deck .slides section.present section.present") ??
          document.querySelector("#projects-deck .slides > section.present");
        return s?.querySelector("h1, h2, h3")?.textContent?.trim() ?? "";
      });
    record("deck opens on intro", (await current()) === "Selected Work", await current());
    await shot(page, "deck-intro", false);
    // keyboardCondition is "focused": reveal only takes keys after a pointer press inside the deck.
    // .focus() is not enough. Click an empty corner, as a user would.
    await page.locator("#projects-deck").click({ position: { x: 20, y: 20 } });
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(900);
    const first = await current();
    record(
      "right arrow moves to the first project",
      first !== "Selected Work" && first !== "",
      `${first}, slide ${await num()}`,
    );
    await shot(page, "deck-project-1", false);
    for (let i = 0; i < 12 && (await current()) !== opt.project; i++) {
      await page.keyboard.press("ArrowRight");
      await page.waitForTimeout(900);
    }
    record(
      `right arrows reach ${opt.project}`,
      (await current()) === opt.project,
      `${await current()}, slide ${await num()}`,
    );
    await shot(page, "deck-project", false);
    await page.keyboard.press("ArrowDown");
    await page.waitForTimeout(900);
    const n = await num();
    record("down arrow opens the deep dive", /\d+\D+2$/.test(n.trim()), `slide ${n}`);
    const placeholders = await page.evaluate(() => {
      const s = document.querySelector("#projects-deck .slides section.present section.present");
      return [...new Set((s?.innerText ?? "").match(/\[[A-Z0-9_]{4,}[^\]]*\]/g) ?? [])].slice(0, 3);
    });
    record(
      "deep dive has no [PLACEHOLDER] copy",
      placeholders.length === 0,
      placeholders.join(" "),
    );
    await shot(page, "deck-deep-dive", false);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(900);
    const overview = await page.locator("#projects-deck.overview").count();
    record("escape opens the overview", overview === 1);
    await shot(page, "deck-overview", false);
  },

  // gg³ lobby loads and local practice renders the three-level board (WebGL via SwiftShader).
  async "chess-practice"(page) {
    await page.goto(`${base}/projects/3d-chess/`);
    await page.getByRole("heading", { name: "gg³", exact: true }).waitFor();
    await shot(page, "chess-lobby");
    await page.getByRole("button", { name: "Start local practice" }).click();
    const levels = page.locator(".chess-level-label");
    await levels.first().waitFor();
    record(
      "board shows three level labels",
      (await levels.count()) === 3,
      `${await levels.count()}`,
    );
    const canvas = await page.locator("canvas").count();
    record("a WebGL canvas is mounted", canvas > 0, `${canvas} canvas`);
    await page.waitForTimeout(1500);
    await shot(page, "chess-board");
  },

  // Visits the main pages and their lazy imports so Vite optimizes dependencies now, not mid-journey.
  // A cold Vite cache reloads the page the first time it sees a new dependency (e.g. the search library).
  async warm(page) {
    for (const route of ["/", "/projects/", "/blog/", "/projects/3d-chess/"]) {
      await page.goto(`${base}${route}`, { waitUntil: "networkidle" });
    }
    await page.getByRole("button", { name: "Start local practice" }).click();
    await page.locator(".chess-level-label").first().waitFor();
    await page.waitForLoadState("networkidle");
    record("warm-up visited the main pages", true);
  },

  // Evil Labs showcase: components render in the Evil Labs scope, the 3-way mode control
  // switches and persists, overlays wear the card frame, and the three voxel friends draw.
  async "evil-showcase"(page) {
    const res = await page.goto(`${base}/design-system/evil-labs/`, { waitUntil: "networkidle" });
    record("showcase responds 200", res.status() === 200, String(res.status()));
    const cards = await page.locator("#components article.evil-card[id]").count();
    record("component cards render", cards >= 15, `${cards} cards`);
    const font = await page.evaluate(() => document.fonts.check("16px Montserrat"));
    record("Montserrat is loaded", font);
    const html = () =>
      page.evaluate(() => ({
        mode: document.documentElement.dataset.evilMode ?? "system",
        dark: document.documentElement.classList.contains("dark"),
        shadow: getComputedStyle(document.querySelector("#card")).boxShadow,
      }));
    let state = await html();
    record(
      "starts on System, .dark follows the OS",
      state.mode === "system" && state.dark === (opt.theme === "dark"),
      JSON.stringify(state),
    );
    await shot(page, `showcase-system-${opt.theme}`);

    const modes = page.getByRole("radiogroup", { name: "Color mode" });
    await modes.getByRole("radio", { name: "Dark" }).click();
    state = await html();
    record("Dark forces dark mode", state.mode === "dark" && state.dark, JSON.stringify(state));
    record("dark cards lose the shadow offset", /0px 0px/.test(state.shadow), state.shadow);
    const saved = await page.evaluate(() => localStorage.getItem("evil-mode"));
    record("choice saved to localStorage evil-mode", saved === "dark", String(saved));
    await page.reload({ waitUntil: "networkidle" });
    state = await html();
    record("dark survives reload", state.mode === "dark" && state.dark, JSON.stringify(state));
    await modes.getByRole("radio", { name: "Light" }).click();
    state = await html();
    record("Light forces light mode", state.mode === "light" && !state.dark, JSON.stringify(state));
    record("light cards keep the 4/4 shadow", /4px 4px/.test(state.shadow), state.shadow);

    await page.getByRole("button", { name: "Open dialog" }).click();
    const dialog = page.locator('[data-slot="dialog-content"][open]');
    await dialog.waitFor();
    const border = await dialog.evaluate((d) => getComputedStyle(d).borderTopWidth);
    record("dialog opens with the 2px card frame", border === "2px", border);
    await shot(page, "dialog", false);
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Open sheet" }).click();
    await page.locator('[data-slot="sheet-content"][open]').waitFor();
    record("sheet opens", true);
    await shot(page, "sheet", false);
    await page.keyboard.press("Escape");

    // Friends hydrate on client:visible, so scroll them in, then prove each canvas drew
    // something: the stage must look different with its canvas hidden.
    await page.locator("#voxel-friends").scrollIntoViewIfNeeded();
    await page.waitForFunction(
      () => document.querySelectorAll("#voxel-friends canvas").length === 3,
      null,
      { timeout: 30000 },
    );
    await settle(page);
    await page.waitForTimeout(1500);
    const stages = page.locator("#voxel-friends .evil-friend-stage");
    const drawn = [];
    for (let i = 0; i < 3; i++) {
      const stage = stages.nth(i);
      const withCanvas = await stage.screenshot();
      await stage.locator("canvas").evaluate((c) => (c.style.visibility = "hidden"));
      const without = await stage.screenshot();
      await stage.locator("canvas").evaluate((c) => (c.style.visibility = ""));
      drawn.push(!withCanvas.equals(without));
    }
    record("all three friends draw", drawn.every(Boolean), drawn.join(","));
    await page
      .locator("#voxel-friends")
      .screenshot({ path: join(out, `${String(++step).padStart(2, "0")}-friends.png`) });

    const cat = page.locator('[data-friend="cat"]');
    await cat.getByLabel("Cat color family").selectOption("menta");
    const family = await cat.getAttribute("data-evil-theme");
    record("family select rescopes the card", family === "menta", String(family));

    const over = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    record("no horizontal page scroll", over <= 1, `${over}px at ${width}px wide`);
    const errors = consoleLog.filter((m) => m.type === "pageerror" || m.type === "error");
    record("no console errors", errors.length === 0, `${errors.length} errors`);
  },

  // Any route: 200, no uncaught errors, no horizontal page scroll, no failed same-origin requests.
  async page(page) {
    const res = await page.goto(`${base}${opt.route}`, { waitUntil: "networkidle" });
    record(`${opt.route} responds 200`, res.status() === 200, String(res.status()));
    const over = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    await shot(page, `page-${width}`);
    const errors = consoleLog.filter((m) => m.type === "pageerror" || m.type === "error");
    const bad = failedRequests.filter((r) => r.url.startsWith(base));
    const issues = [
      over > 1 && `horizontal overflow ${over}px at ${width}px wide`,
      errors.length && `${errors.length} console errors (see console.json)`,
      bad.length &&
        `${bad.length} failed same-origin requests: ${bad.map((r) => `${r.status} ${r.url.slice(base.length)}`).join(", ")}`,
    ].filter(Boolean);
    record("no layout, console or request problems", issues.length === 0, issues.join("; "));
  },
};

if (!journeys[journey]) {
  console.error(`unknown journey '${journey}'. Use one of: ${Object.keys(journeys).join(", ")}`);
  process.exit(2);
}

const launchOpts = {
  headless: true,
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
};
const browser = await chromium
  .launch({ ...launchOpts, channel: "chrome" })
  .catch(() => chromium.launch(launchOpts));
const context = await browser.newContext({
  viewport: { width, height: width < 600 ? 844 : 1050 },
  colorScheme: opt.theme,
});
const page = await context.newPage();
page.on("console", (m) => consoleLog.push({ type: m.type(), text: m.text(), url: page.url() }));
page.on("pageerror", (e) =>
  consoleLog.push({ type: "pageerror", text: e.message, url: page.url() }),
);
page.on(
  "response",
  (r) => r.status() >= 400 && failedRequests.push({ status: r.status(), url: r.url() }),
);

let ok = true;
let error = null;
try {
  await journeys[journey](page);
} catch (e) {
  ok = false;
  error = String(e.message ?? e);
  if (!checks.length || checks.at(-1).ok) console.log(`FAIL ${error.split("\n")[0]}`);
  await shot(page, "failure").catch(() => {});
}
const pageErrors = consoleLog.filter((m) => m.type === "pageerror");
writeFileSync(
  join(out, "console.json"),
  JSON.stringify({ console: consoleLog, failedRequests }, null, 2),
);
writeFileSync(
  join(out, "result.json"),
  JSON.stringify(
    {
      journey,
      ok,
      error,
      options: opt,
      sha: execSync("git rev-parse HEAD").toString().trim(),
      checks,
      pageErrors: pageErrors.length,
    },
    null,
    2,
  ),
);
await browser.close();
console.log(`result: ${ok ? "PASS" : "FAIL"} ${out}`);
process.exit(ok ? 0 : 1);
