import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    include: [
      "src/lib/chess/**/*.test.ts",
      "src/lib/supabase/**/*.test.ts",
      "scripts/chess-*.test.mjs",
    ],
    environment: "node",
  },
});
