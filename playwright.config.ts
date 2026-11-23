import { defineConfig } from "@playwright/test";
export default defineConfig({
  projects: [
    { name: "chess", testDir: "./tests/chess" },
    // Screenshot baselines for the portfolio POCs the Evil Labs revamp must not change.
    { name: "legacy", testDir: "./tests/legacy", use: { viewport: { width: 1280, height: 900 } } },
  ],
  timeout: 90000,
  expect: { timeout: 15000 },
  workers: 1,
  use: {
    baseURL: process.env.CHESS_TEST_URL ?? "http://127.0.0.1:4321",
    viewport: { width: 1440, height: 1050 },
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    launchOptions: {
      args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
    },
    channel: process.env.CI ? undefined : "chrome",
  },
  webServer: process.env.CHESS_TEST_URL
    ? undefined
    : {
        command: "pnpm dev --host 127.0.0.1",
        env: { CHESS_BROWSER_TEST: "1" },
        url: "http://127.0.0.1:4321",
        reuseExistingServer: !process.env.CI,
        timeout: 60000,
      },
});
