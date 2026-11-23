#!/usr/bin/env bash
# Stop the dev server launch.sh started on <port>. Kills only the recorded pid and its children,
# never by process name. Evidence under .verify/runs/ is kept.
# Usage: cleanup.sh [port]
set -uo pipefail
ROOT=$(git rev-parse --show-toplevel)
PORT=${1:-4471}
STATE="$ROOT/.verify/instance-$PORT"
PID=$(cat "$STATE/pid" 2>/dev/null || true)
if [ -z "$PID" ]; then echo "nothing recorded for port $PORT"; exit 0; fi
KIDS=$(pgrep -P "$PID" 2>/dev/null || true)
kill $PID $KIDS 2>/dev/null || true
for _ in $(seq 1 50); do
  kill -0 $PID $KIDS 2>/dev/null || break
  perl -e 'select(undef,undef,undef,0.2)'
done
kill -9 $PID $KIDS 2>/dev/null || true
rm -rf "$STATE"
if lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "port $PORT still has a listener we did not start: $(lsof -nP -iTCP:"$PORT" -sTCP:LISTEN | tail -1)"; exit 1
fi
echo "stopped pid $PID; port $PORT free; evidence kept in $ROOT/.verify/runs/"
