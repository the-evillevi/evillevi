// Karma, gg³ chess and the neobrutalism showcase are portfolio POCs. They keep
// the garden's legacy Catppuccin system on purpose, and the Evil Labs revamp
// must not change how they look. These screenshots were recorded before the
// revamp started. If one fails, the revamp leaked into a frozen page.
// Canvases (3D scenes) are masked: they animate and are not part of the frozen
// chrome. Update baselines only on purpose: `pnpm test:legacy --update-snapshots`.
import { test, expect } from "@playwright/test";

const routes = [
  { name: "karma", path: "/projects/karma/" },
  { name: "karma-comanda", path: "/projects/karma/comanda/" },
  { name: "chess", path: "/projects/3d-chess/" },
  { name: "chess-rules", path: "/projects/3d-chess/rules/" },
  { name: "neobrutalism", path: "/design-system/neobrutalism/" },
];

for (const scheme of ["light", "dark"] as const) {
  for (const route of routes) {
    test(`${route.name} looks the same (${scheme})`, async ({ page }) => {
      await page.clock.setFixedTime(new Date("2026-01-15T10:00:00"));
      await page.emulateMedia({ colorScheme: scheme, reducedMotion: "reduce" });
      await page.goto(route.path, { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts.ready);
      await expect(page).toHaveScreenshot(`${route.name}-${scheme}.png`, {
        fullPage: true,
        mask: [page.locator("canvas")],
        maxDiffPixelRatio: 0.001,
      });
    });
  }
}
