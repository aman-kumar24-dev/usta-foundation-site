#!/usr/bin/env bash
# Usage: run.sh <label> [url] [--extended]
# Lighthouse 12, 3 runs each of mobile + desktop (performance, best-practices) → $MARTECH_OUT/perf/<label>/
# --extended adds runs that keep observing ~6 s after load, so the delayed phase (Tags at 3 s) is
# included (lh-extended-*.mjs). Run variants you compare in the same session; prefer
# run-interleaved.sh on a busy machine.
set -u
LABEL="$1"
URL="${2:-${BASE_URL:-http://localhost:3000}/en/home}"
DIR="$(cd "$(dirname "$0")" && pwd)"
OUT="${MARTECH_OUT:-$DIR/../out}/perf/$LABEL"
mkdir -p "$OUT"
[ -n "${CHROME_PATH:-}" ] && export CHROME_PATH
FLAGS=(--quiet --output=json --chrome-flags="--headless=new --no-sandbox --disable-gpu --disable-dev-shm-usage")
STD=(--only-categories=performance,best-practices)
for i in 1 2 3; do
  npx -y lighthouse@12 "$URL" "${FLAGS[@]}" "${STD[@]}" --output-path="$OUT/std-mobile-$i.json"
  npx -y lighthouse@12 "$URL" "${FLAGS[@]}" "${STD[@]}" --preset=desktop --output-path="$OUT/std-desktop-$i.json"
  if [[ " $* " == *" --extended "* ]]; then
    npx -y lighthouse@12 "$URL" "${FLAGS[@]}" --config-path="$DIR/lh-extended-mobile.mjs" --output-path="$OUT/ext-mobile-$i.json"
    npx -y lighthouse@12 "$URL" "${FLAGS[@]}" --config-path="$DIR/lh-extended-desktop.mjs" --output-path="$OUT/ext-desktop-$i.json"
  fi
done
echo "done: $OUT"
