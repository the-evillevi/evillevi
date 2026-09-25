import { test, expect, type Page } from "@playwright/test";
import { piece, position } from "../../src/lib/chess/fixtures";
import type { Ruleset } from "../../src/lib/chess/engine";
test("garden links, metadata, dark theme and existing Affogato route", async ({ page }, info) => {
  await page.goto("/");
  const card = page
    .locator("article")
    .filter({ has: page.getByRole("heading", { name: "3D Chess", exact: true }) });
  await expect(card).toHaveCount(1);
  await expect(card.getByRole("link", { name: "View Live Demo" })).toHaveAttribute(
    "href",
    "/projects/3d-chess",
  );
  await page.goto("/projects/");
  await expect(page.locator("#projects-deck a[href='/projects/3d-chess']")).toHaveCount(1);
  await page.goto("/projects/3d-chess/");
  await expect(page).toHaveTitle(/3D Chess/);
  await expect(page.locator("link[rel='canonical']")).toHaveAttribute(
    "href",
    /\/projects\/3d-chess\/?$/,
  );
  await page.getByRole("button", { name: "Toggle theme", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("button", { name: "Start local practice" }).click();
  await expect(page.locator(".chess-level-label")).toHaveCount(3);
  await page.screenshot({ path: info.outputPath("dark-board.png"), fullPage: true });
  await page.goto("/projects/affogato/");
  await expect(page).toHaveTitle(/Affogato/);
  await expect(page.locator("body > .nb-page")).toHaveCount(1);
  await expect(page.locator(".chess-shell")).toHaveCount(0);
  await page.getByRole("button", { name: "Start timer", exact: true }).click();
  await expect(page.getByRole("button", { name: "Pause timer", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Pause timer", exact: true }).click();
});
async function move(page: Page, from: string, to: string) {
  await page.getByLabel("Piece", { exact: true }).selectOption(from);
  const options = await page
    .getByLabel("Destination / promotion")
    .locator("option")
    .evaluateAll((nodes) =>
      nodes.map((n) => ({ value: (n as HTMLOptionElement).value, text: n.textContent })),
    );
  const candidate = options.find((o) => o.value && JSON.parse(o.value).to === to);
  expect(candidate, `Legal move ${from} → ${to}`).toBeDefined();
  await page.getByLabel("Destination / promotion").selectOption(candidate!.value);
  await page.getByRole("button", { name: "Confirm move", exact: true }).click();
}
test("local Strato, restored history, Chess³ and 3D rendering", async ({ page }, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/projects/3d-chess/");
  await expect(page.getByRole("button", { name: "Start local practice" })).toBeEnabled();
  await page.getByRole("button", { name: "Start local practice" }).click();
  await expect(page.locator(".chess-level-label")).toHaveCount(3);
  await page.screenshot({ path: info.outputPath("three-level-board.png"), fullPage: true });
  await move(page, "1e2", "2e3");
  await expect(page.locator(".chess-status")).toHaveText("Black to move");
  await page.reload();
  await expect(page.locator(".chess-history li")).toHaveCount(1);
  await move(page, "3e7", "2e6");
  await expect(page.locator(".chess-history li")).toHaveCount(2);
  await page.getByRole("button", { name: "Resign", exact: true }).click();
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(page.locator(".chess-status")).toContainText("Black wins");
  await page.getByRole("link", { name: "Back to games" }).click();
  await page.getByLabel("Ruleset", { exact: true }).selectOption("chess3");
  await page.getByRole("button", { name: "Black", exact: true }).click();
  await page.getByRole("button", { name: "Start local practice" }).click();
  await expect(page.locator(".chess-status")).toHaveText("White to move");
  await move(page, "1e2", "1e4");
  await move(page, "3e7", "3e5");
  await page.getByRole("button", { name: "Agree draw", exact: true }).click();
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(page.locator(".chess-status")).toContainText("Draw · agreement");
  expect(errors).toEqual([]);
});
test("mobile, reduced motion, light theme, rules and WebGL fallback", async ({ browser }, info) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    reducedMotion: "reduce",
    colorScheme: "light",
  });
  const page = await context.newPage();
  await page.goto("/projects/3d-chess/");
  await expect(page.getByRole("button", { name: "Start local practice" })).toBeEnabled();
  await page.getByRole("button", { name: "Start local practice" }).click();
  await expect(page.locator(".chess-level-label")).toHaveCount(3);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const canvas = await page.locator(".chess-canvas").boundingBox();
  for (const label of await page.locator(".chess-level-label").all()) {
    const box = await label.boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(canvas!.x);
    expect(box!.x + box!.width).toBeLessThanOrEqual(canvas!.x + canvas!.width);
  }
  await page.screenshot({ path: info.outputPath("mobile-board.png"), fullPage: true });
  await move(page, "1e2", "2e3");
  await expect(page.locator(".chess-history li")).toHaveCount(1);
  await page.getByRole("link", { name: "How to play" }).click();
  await expect(page.getByRole("heading", { name: "Resolved ambiguities" })).toBeVisible();
  await context.close();
  const fallback = await browser.newContext();
  await fallback.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      type: string,
      ...args: unknown[]
    ) {
      if (type.startsWith("webgl")) return null;
      return original.apply(this, [type, ...args] as never);
    } as typeof original;
  });
  const without = await fallback.newPage();
  await without.goto("/projects/3d-chess/");
  await without.getByRole("button", { name: "Start local practice" }).click();
  await expect(without.getByText("3D graphics are unavailable", { exact: false })).toBeVisible();
  await move(without, "1e2", "2e3");
  await expect(without.locator(".chess-history li")).toHaveCount(1);
  await fallback.close();
});
for (const variant of ["strato", "chess3"])
  test(`two private sessions: ${variant}, creator Black`, async ({ browser }) => {
    test.skip(
      process.env.CHESS_ONLINE_TESTS !== "1",
      "Requires the local Supabase stack and public env configuration.",
    );
    const a = await browser.newContext({ viewport: { width: 1366, height: 768 } }),
      b = await browser.newContext({ viewport: { width: 1366, height: 768 } });
    const creator = await a.newPage(),
      friend = await b.newPage();
    await creator.goto("/projects/3d-chess/");
    await creator.getByLabel("Ruleset", { exact: true }).selectOption(variant);
    await creator.getByRole("button", { name: "Black", exact: true }).click();
    await creator.getByRole("button", { name: "Play with a friend" }).click();
    await creator.getByRole("button", { name: "Create invitation" }).click();
    await expect(creator.locator(".chess-status")).toHaveText("Waiting for a friend");
    const invite = creator.url();
    await friend.goto(invite);
    await friend.getByRole("button", { name: "Join game", exact: true }).click();
    await expect(friend.locator(".chess-status")).toContainText("Waiting for both");
    await friend.getByRole("button", { name: "Ready", exact: true }).click();
    await creator.getByRole("button", { name: "Ready", exact: true }).click();
    await expect(friend.locator(".chess-status")).toHaveText("White to move");
    expect(await friend.evaluate(() => document.documentElement.scrollHeight <= innerHeight)).toBe(
      true,
    );
    await expect(creator.getByLabel("Piece", { exact: true })).toBeDisabled();
    await move(friend, "1e2", variant === "strato" ? "2e3" : "1e4");
    await expect(creator.locator(".chess-history li")).toHaveCount(1);
    await move(creator, "3e7", variant === "strato" ? "2e6" : "3e5");
    await expect(friend.locator(".chess-history li")).toHaveCount(2);
    await creator.getByRole("link", { name: "Back to games" }).click();
    await expect(
      creator
        .getByRole("heading", { name: "Opponent’s turn", exact: true })
        .locator("..")
        .getByRole("link"),
    ).toHaveCount(1);
    await expect(creator.getByText(/1 move/)).toBeVisible();
    await creator.goBack();
    await expect(creator.locator(".chess-history li")).toHaveCount(2);
    const clockBefore = await friend.getByLabel("White clock", { exact: true }).innerText();
    await b.setOffline(true);
    await expect(friend.getByText("Offline ·", { exact: false })).toBeVisible();
    await expect
      .poll(() => friend.getByLabel("White clock", { exact: true }).innerText())
      .not.toBe(clockBefore);
    await b.setOffline(false);
    await friend.reload();
    await expect(friend.locator(".chess-history li")).toHaveCount(2);
    await creator.reload();
    await expect(creator.locator(".chess-history li")).toHaveCount(2);
    // UI-only positions exercise rare promotion/capture/check states; engine legality is tested separately.
    let fixture = position(variant as Ruleset, [
      piece("pawn", "2e7"),
      piece("rook", "2a4"),
      piece("pawn", "2d4", "black"),
    ]);
    await friend.route("**/rest/v1/rpc/chess_snapshot", async (route) => {
      const response = await route.fetch();
      const raw = await response.json();
      await route.fulfill({
        json: {
          ...raw,
          game: {
            ...raw.game,
            position: fixture,
            turn: fixture.turn,
            version: raw.game.version + 100,
          },
          moves: [],
        },
      });
    });
    await friend.getByRole("button", { name: "Reconnect / refresh" }).click();
    await friend.getByRole("button", { name: "2D", exact: true }).click();
    await friend.getByRole("button", { name: /^All levels/ }).click();
    await friend.locator('[data-square="2a4"]').click();
    await expect(friend.locator('[data-square="2d4"] .chess-capture')).toHaveCount(1);
    await expect(friend.locator('[data-square="2b4"] .chess-dot')).toHaveCount(1);
    await friend.locator('[data-square="2e7"]').click();
    await friend.locator('[data-square="2e8"]').click();
    await expect(friend.getByRole("button", { name: "Confirm move", exact: true })).toBeDisabled();
    expect(await friend.evaluate(() => document.documentElement.scrollHeight <= innerHeight)).toBe(
      true,
    );
    for (const type of ["Queen", "Rook", "Bishop", "Knight"]) {
      await friend.getByRole("radio", { name: new RegExp(type) }).check();
      await expect(friend.getByRole("button", { name: "Confirm move", exact: true })).toBeEnabled();
    }
    fixture = position(variant as Ruleset, [piece("rook", "1h4", "black")]);
    await friend.getByRole("button", { name: "Reconnect / refresh" }).click();
    await expect(friend.locator('[data-square="1h1"]')).toHaveAttribute("data-check", "true");
    await expect(friend.getByLabel("Piece", { exact: true })).toHaveValue("");
    await friend.unroute("**/rest/v1/rpc/chess_snapshot");
    await friend.reload();
    await expect(friend.locator(".chess-history li")).toHaveCount(2);
    await friend.getByRole("button", { name: "Offer draw", exact: true }).click();
    await friend.getByRole("button", { name: "Confirm", exact: true }).click();
    await creator.getByRole("button", { name: "Accept draw", exact: true }).click();
    await expect(friend.locator(".chess-status")).toHaveText("Draw · agreement");
    await expect(creator.locator(".chess-status")).toHaveText("Draw · agreement");
    await creator.reload();
    await expect(creator.locator(".chess-status")).toHaveText("Draw · agreement");
    await a.close();
    await b.close();
  });

test("lobby history, modal focus, defaults and custom paired inputs", async ({ page }) => {
  await page.goto("/projects/3d-chess/");
  await expect(page.getByRole("heading", { name: "Your turn", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Resume local practice" })).toHaveCount(0);
  await page.getByLabel("Guest name").fill("Ada");
  const launch = page.getByRole("button", { name: "Play with a friend" });
  await launch.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "30 min", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await dialog.getByRole("button", { name: "10+5", exact: true }).click();
  await expect(page).not.toHaveURL(/game=/);
  await dialog.getByRole("button", { name: "Custom", exact: true }).click();
  await expect(page.getByLabel("Initial minutes", { exact: true })).toHaveValue("10");
  await expect(page.getByLabel("Increment seconds", { exact: true })).toHaveValue("0");
  await page.getByLabel("Initial minutes", { exact: true }).fill("120");
  await expect(page.getByLabel("Initial minutes slider")).toHaveValue("120");
  await page.getByLabel("Increment seconds", { exact: true }).fill("61");
  await expect(page.getByRole("button", { name: "Create invitation" })).toBeDisabled();
  await page.getByLabel("Increment seconds", { exact: true }).fill("60");
  await expect(page.getByRole("button", { name: "Create invitation" })).toBeEnabled();
  await dialog.getByRole("button", { name: "Cancel", exact: true }).focus();
  await page.keyboard.press("Tab");
  expect(await page.evaluate(() => Boolean(document.activeElement?.closest("dialog")))).toBe(true);
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(launch).toBeFocused();
  await page.getByRole("button", { name: "Start local practice" }).click();
  await expect(page).toHaveURL(/practice=1/);
  await page.getByRole("link", { name: "Back to games" }).click();
  await expect(page.getByRole("button", { name: "Resume local practice" })).toBeVisible();
  await page.goBack();
  await expect(page.locator(".chess-status")).toHaveText("White to move");
  await page.goForward();
  await expect(page.getByLabel("Guest name")).toHaveValue("Ada");
});

test("unified board feedback, cross-level selection, keyboard, reset and desktop fit", async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto("/projects/3d-chess/");
  await page.getByRole("button", { name: "White", exact: true }).click();
  await page.getByRole("button", { name: "Start local practice" }).click();
  await expect(page.locator(".chess-level-label")).toHaveCount(3);
  expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight)).toBe(
    true,
  );
  await page.getByRole("button", { name: "2D", exact: true }).click();
  await expect(page.locator(".chess-flat-level")).toHaveCount(3);
  const source = page.locator('[data-square="1e2"]');
  await source.click();
  await expect(source).toHaveAttribute("data-selected", "true");
  await page.getByRole("button", { name: /^Level 2/ }).click();
  await expect(page.getByLabel("Piece", { exact: true })).toHaveValue("1e2");
  const dest = page.locator('[data-square="2e3"]');
  await dest.click();
  await expect(dest).toHaveAttribute("data-pending", "true");
  await page.getByRole("button", { name: "3D", exact: true }).click();
  await expect(page.getByRole("button", { name: "3D", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.locator(".chess-level-label")).toHaveCount(1);
  await expect(page.getByLabel("Piece", { exact: true })).toHaveValue("1e2");
  await page.getByRole("button", { name: "2D", exact: true }).click();
  await expect(page.getByRole("button", { name: "3D", exact: true })).toBeEnabled();
  await expect(dest).toHaveAttribute("data-pending", "true");
  await page.getByRole("button", { name: /^All levels/ }).click();
  await expect(source).toHaveAttribute("data-selected", "true");
  await page.getByRole("button", { name: "Confirm move", exact: true }).click();
  await expect(source).toHaveAttribute("data-last", "true");
  await expect(dest).toHaveAttribute("data-last", "true");
  await expect(page.locator('[data-selected="true"]')).toHaveCount(0);
  await page.locator('[data-square="3e7"]').focus();
  await page.keyboard.press("Enter");
  await expect(page.getByLabel("Piece", { exact: true })).toHaveValue("3e7");
  await page.keyboard.press("ArrowLeft");
  await expect(page.locator('[data-square="3d7"]')).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByLabel("Piece", { exact: true })).toHaveValue("");
  await page.getByRole("button", { name: "Flip", exact: true }).click();
  await page.getByRole("button", { name: "Reset view", exact: true }).click();
  await expect(page.locator(".chess-text-board button").first()).toHaveAttribute(
    "data-square",
    "1a8",
  );
  expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight)).toBe(
    true,
  );
  await page.screenshot({ path: info.outputPath("desktop-1366.png"), fullPage: true });
  await page.reload();
  await expect(page.getByRole("button", { name: "2D", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await expect(page.locator(".chess-flat-level")).toHaveCount(1);
  await page.getByRole("button", { name: /^All levels/ }).click();
  await expect(page.locator(".chess-flat-level")).toHaveCount(3);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath("mobile-2d.png"), fullPage: true });
});
