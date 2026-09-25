import { execFileSync } from "node:child_process";
export function localSupabase() {
  const output = execFileSync("supabase", ["status", "--output", "json"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  const config = JSON.parse(output.slice(output.indexOf("{"), output.lastIndexOf("}") + 1));
  if (config.API_URL !== "http://127.0.0.1:55431")
    throw new Error("Tests require the isolated local chess stack on port 55431.");
  return config;
}
