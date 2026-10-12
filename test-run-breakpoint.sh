#!/usr/bin/env bash
#
# Breakpoint / capacity test runner for k6.
# Runs ratings.js at increasing request rates until k6 thresholds fail,
# then reports the last rate that passed.
#
# Usage:
#   ./run-breakpoint.sh                 # uses default rates
#   ./run-breakpoint.sh 50 100 200 400  # custom rates (req/s)
#
# Optional env overrides:
#   DURATION=1m ./run-breakpoint.sh     # test duration per rate (default 60s)
#   P95_MAX=500 ./run-breakpoint.sh     # p95 latency threshold in ms (default 500)

K6="${K6:-./k6.exe}"

set -u
 
# Rates to test (req/s). Use args if given, else defaults.
if [ $# -gt 0 ]; then
  RATES=("$@")
else
  RATES=(50 150 200 300)
fi
 
DURATION="${DURATION:-60s}"
P95_MAX="${P95_MAX:-500}"
SCRIPT="ratings.js"
 
# Raise open-file limit (ignored if not permitted; harmless on Git Bash).
ulimit -n 10240 2>/dev/null || true
 
mkdir -p results
 
LAST_PASS=0
for RPS in "${RATES[@]}"; do
  echo ""
  echo "=============== RPS=$RPS ==============="
 
  "$K6" run \
    -e RPS="$RPS" \
    -e VUS=$((RPS * 2)) \
    -e MAX_VUS=$((RPS * 4)) \
    -e DURATION="$DURATION" \
    -e P95_MAX="$P95_MAX" \
    --summary-export="results/rps-$RPS.json" \
    "$SCRIPT"
 
  # k6 exits non-zero when any threshold is crossed.
  if [ $? -ne 0 ]; then
    echo ""
    echo ">>> FAILED at $RPS req/s"
    echo ">>> Last passing rate: $LAST_PASS req/s"
    exit 0
  fi
 
  LAST_PASS=$RPS
done
 
echo ""
echo ">>> All rates passed. Max tested: $LAST_PASS req/s."
echo ">>> Add higher rates to keep searching for the breaking point."