#!/usr/bin/env bash
# Usage: run-interleaved.sh <mobile|desktop>
# Each round runs every variant once, so all variants see the same machine load (fair comparison on
# a shared/noisy host). Needs the dev server and target/proxy.mjs. Output: $MARTECH_OUT/perf/iv-*/
# Then: node summarize.mjs iv-normal-3s iv-normal-2s iv-client iv-off iv-server
set -u
FORM="$1"
DIR="$(cd "$(dirname "$0")" && pwd)"
OUT="${MARTECH_OUT:-$DIR/../out}/perf"
P="${PROXY_URL:-http://localhost:3100}"
[ -n "${CHROME_PATH:-}" ] && export CHROME_PATH
FLAGS=(--quiet --output=json --only-categories=performance,best-practices --chrome-flags="--headless=new --no-sandbox --disable-gpu --disable-dev-shm-usage")
[ "$FORM" = desktop ] && FLAGS+=(--preset=desktop)
declare -A V=(
  [iv-normal-3s]="$P/en/home"
  [iv-normal-2s]="$P/en/home?timer=2000"
  [iv-client]="$P/en/home?tgt=1&a4t=client"
  [iv-off]="$P/en/home?tgt=1&a4t=0"
  [iv-server]="$P/en/home?tgt=1&a4t=true"
)
for i in 1 2 3; do
  for label in iv-normal-3s iv-normal-2s iv-client iv-off iv-server; do
    mkdir -p "$OUT/$label"
    npx -y lighthouse@12 "${V[$label]}" "${FLAGS[@]}" --output-path="$OUT/$label/std-$FORM-$i.json"
  done
done
echo "done: $FORM"
