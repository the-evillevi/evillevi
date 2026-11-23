#!/usr/bin/env bash
# Start an isolated Astro dev server for verification and wait until the home page renders.
# Usage: launch.sh [port]        (default 4471; never 4321, which is the user's own dev server)
# Ready means the home page renders and a browser warm-up triggered no Vite dependency re-optimization.
# Writes .verify/instance-<port>/{pid,server.log}. Prints "ready <url> pid <pid>" on success.
set -euo pipefail
ROOT=$(git rev-parse --show-toplevel)
PORT=${1:-4471}
STATE="$ROOT/.verify/instance-$PORT"
if lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "port $PORT is already in use. Run doctor.sh $PORT if it is ours, else pick another port."
  exit 1
fi
mkdir -p "$STATE"
cd "$ROOT"
[ -d node_modules ] || pnpm install --frozen-lockfile
# CHESS_BROWSER_TEST=1 hides the Astro dev toolbar so it doesn't cover screenshots.
CHESS_BROWSER_TEST=1 nohup ./node_modules/.bin/astro dev --host 127.0.0.1 --port "$PORT" \
  >"$STATE/server.log" 2>&1 &
echo $! >"$STATE/pid"
# Ready means usable: the first request compiles the home page, so wait for its real content.
if ! curl -fsS --retry 90 --retry-delay 1 --retry-connrefused --retry-all-errors \
  "http://127.0.0.1:$PORT/" 2>/dev/null | grep -qi "Featured projects"; then
  echo "not ready after 90s. Last server log lines:"
  tail -20 "$STATE/server.log"
  exit 1
fi
# With a cold Vite cache, the first browser visit makes Vite optimize new dependencies and reload the page,
# which breaks a journey mid-step. Warm up in a browser until a pass triggers no new optimization.
for pass in 1 2 3; do
  before=$(grep -c "optimized dependencies changed" "$STATE/server.log" || true)
  node "$ROOT/.claude/skills/verify-evillevi/scripts/drive.mjs" warm --port "$PORT" --out "$STATE/warm" >/dev/null 2>&1 || true
  after=$(grep -c "optimized dependencies changed" "$STATE/server.log" || true)
  [ "$after" = "$before" ] && break
done
if [ "$after" != "$before" ]; then
  echo "Vite was still optimizing dependencies after 3 warm-up passes. Last server log lines:"
  tail -20 "$STATE/server.log"
  exit 1
fi
echo "ready http://127.0.0.1:$PORT pid $(cat "$STATE/pid")"
