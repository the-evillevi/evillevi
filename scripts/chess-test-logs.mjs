import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { localSupabase } from "./local-supabase.mjs";

export function sanitizeLog(log, secrets = []) {
  for (const secret of secrets.filter((value) => typeof value === "string" && value.length >= 8)) {
    log = log.split(secret).join("[REDACTED]");
  }
  return log
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, "[REDACTED JWT]")
    .replace(/\bsb_(?:secret|publishable)_[A-Za-z0-9_-]+\b/g, "[REDACTED KEY]")
    .replace(/\b(postgres(?:ql)?:\/\/)[^\s/@]+(?::[^\s/@]+)?@/gi, "$1[REDACTED]@")
    .replace(
      /((?:authorization|api[-_ ]?key|anon[-_ ]?key|service[-_ ]?role|secret|password|token|access[-_ ]?key)[^\r\n:=│]*[:=│][ \t]*)[^\r\n]+/gi,
      "$1[REDACTED]",
    );
}

function saveLogs() {
  const secrets = Object.entries(process.env)
    .filter(([name]) => /key|secret|password|token/i.test(name))
    .map(([, value]) => value);
  try {
    // Supabase startup output includes local credentials, even on success.
    secrets.push(...Object.values(localSupabase()));
  } catch {
    // Startup may have failed before status is available; pattern redaction still applies.
  }
  const directory = "test-results/backend";
  mkdirSync(directory, { recursive: true });
  for (const name of ["chess-start", "chess-functions"]) {
    let log;
    try {
      log = readFileSync(`/tmp/${name}.log`, "utf8");
    } catch {
      log = "Log not available (step may not have started).\n";
    }
    writeFileSync(`${directory}/${name}.log`, sanitizeLog(log, secrets));
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) saveLogs();
