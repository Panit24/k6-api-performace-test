#!/usr/bin/env bash
# Usage: ./find-max-rps.sh <api_url> <token> [rates...]
# Example: ./find-max-rps.sh https://dev-api.../api/product/getAllProduct eyJ... 50 100 200 300
##############

##############
# set -u
# API_URL="$1"
# TOKEN="$2"
# shift 2
# RATES=("${@:-50 100 150 200 300 400}")
# [ $# -eq 0 ] && RATES=(50 100 150 200 300 400)

# ulimit -n 10240            # macOS default (256) is too low for load tests
# mkdir -p results

# LAST_PASS=0
# for RPS in "${RATES[@]}"; do
#   echo ""
#   echo "=============== RPS=$RPS ==============="
#   k6 run \
#     -e API_URL="$API_URL" \
#     -e TOKEN="$TOKEN" \
#     -e RPS="$RPS" \
#     -e VUS=$((RPS * 2)) \
#     -e MAX_VUS=$((RPS * 4)) \
#     -e DURATION="${DURATION:-3m}" \
#     --summary-export="results/rps-$RPS.json" \
#     getAllProduct.js

#   if [ $? -ne 0 ]; then
#     echo ""
#     echo ">>> FAILED at $RPS req/s"
#     echo ">>> Last passing rate: $LAST_PASS req/s"
#     exit 0
#   fi
#   LAST_PASS=$RPS
# done

# echo ""
# echo ">>> All rates passed. Max tested: $LAST_PASS req/s. Add higher rates to keep searching."