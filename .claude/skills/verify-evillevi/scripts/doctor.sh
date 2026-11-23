#!/usr/bin/env bash
# Read-only check: is the instance on <port> ours, alive, on this checkout, and serving real pages?
# Usage: doctor.sh [port]   Prints one line per check and "doctor ok" or "doctor failed".
set -uo pipefail
ROOT=$(git rev-parse --show-toplevel)
PORT=${1:-4471}
STATE="$ROOT/.verify/instance-$PORT"
URL="http://127.0.0.1:$PORT"
fail=0
say() { echo "$1: $2"; [ "$1" = ok ] || fail=1; }
PID=$(cat "$STATE/pid" 2>/dev/null || true)
if [ -n "$PID" ] && kill -0 "$PID" 2>/dev/null; then say ok "server pid $PID alive"; else say FAIL "no live server recorded in $STATE (run launch.sh $PORT)"; fi
LISTENER=$(lsof -nP -t -iTCP:"$PORT" -sTCP:LISTEN 2>/dev/null | head -1)
if [ -n "$LISTENER" ] && { [ "$LISTENER" = "$PID" ] || pgrep -P "$PID" 2>/dev/null | grep -qx "$LISTENER"; }; then
  say ok "port $PORT owned by our process ($LISTENER)"
else
  say FAIL "port $PORT listener is '${LISTENER:-none}', not our pid ${PID:-none}"
fi
say ok "checkout $(git -C "$ROOT" rev-parse --short HEAD) on $(git -C "$ROOT" branch --show-current), $(git -C "$ROOT" status --porcelain | wc -l | tr -d ' ') uncommitted paths"
if curl -fsS "$URL/" 2>/dev/null | grep -qi "Featured projects"; then say ok "home page renders"; else say FAIL "home page missing 'Featured projects'"; fi
if curl -fsS "$URL/contentIndex.json" 2>/dev/null | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const n=Object.keys(JSON.parse(s)).length;if(!n)process.exit(1);console.log(n)})' >/dev/null 2>&1; then
  say ok "search index /contentIndex.json is valid JSON with entries"
else
  say FAIL "search index /contentIndex.json missing or empty"
fi
if grep -qiE '\[ERROR\]|error ' "$STATE/server.log" 2>/dev/null; then
  say WARN "server.log has errors:"; grep -iE '\[ERROR\]|error ' "$STATE/server.log" | tail -5
fi
[ $fail = 0 ] && echo "doctor ok" || { echo "doctor failed"; exit 1; }
