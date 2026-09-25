import { writeFile, readFile } from "node:fs/promises";
import { localSupabase } from "./local-supabase.mjs";
const config = localSupabase();
let existing = "";
try {
  existing = await readFile(".env.local", "utf8");
} catch {}
const kept = existing
  .split("\n")
  .filter((l) => !/^PUBLIC_SUPABASE_(URL|PUBLISHABLE_KEY)=/.test(l))
  .join("\n");
await writeFile(
  ".env.local",
  `${kept.trim()}\nPUBLIC_SUPABASE_URL=${config.API_URL}\nPUBLIC_SUPABASE_PUBLISHABLE_KEY=${config.PUBLISHABLE_KEY ?? config.ANON_KEY}\n`,
);
await writeFile(
  ".env.chess-test.local",
  "CHESS_TEST_MODE=true\nCHESS_ALLOWED_ORIGINS=http://127.0.0.1:4321,http://localhost:4321\n",
);
console.log(
  "Local public browser configuration and local-only function test flag written. No service key was written.",
);
