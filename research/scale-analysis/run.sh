#!/bin/sh
# Bundle and run the scale-analysis referee harness (research copy).
# The harness imports src/lib/* directly, but src/lib/settings.js reads
# import.meta.env (a Vite-only global), so plain node cannot load the engine.
# esbuild replaces that read with a constant and bundles everything else.
#
# Usage:
#   sh research/scale-analysis/run.sh [section]
#   section: all (default), corpus, follow, shuffle, repeat, safe, steady,
#            dominant, phrase, options, gates
#   SEEDS=5 sh research/scale-analysis/run.sh follow
set -eu
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
TMPDIR="${TMPDIR:-/tmp}/okj-research-scale-analysis"
mkdir -p "$TMPDIR"
cd "$ROOT"
export OKJ_ROOT="$ROOT"
ENTRY="research/scale-analysis/harness.mjs"
BUNDLE="$TMPDIR/harness.bundle.mjs"
npx --no-install esbuild "$ENTRY" --bundle --platform=node --format=esm \
  --define:import.meta.env.PROD=false --outfile="$BUNDLE" --log-level=warning
node "$BUNDLE" "${1:-all}"
