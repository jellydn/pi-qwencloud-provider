#!/usr/bin/env bash
# E2E test for QwenCloud provider using pi directly
# Usage: QWENCLOUD_API_KEY="sk-..." bash tests/e2e/smoke-pi.sh
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

PASS=0
FAIL=0

PROVIDER_PATH="$(cd "$(dirname "$0")/../.." && pwd)"
TIMEOUT="${TIMEOUT:-60}"
API_KEY="${QWENCLOUD_API_KEY:-}"

if [ -z "$API_KEY" ]; then
  echo -e "${RED}ERROR: QWENCLOUD_API_KEY not set${NC}"
  exit 1
fi

if ! command -v pi &>/dev/null; then
  echo -e "${RED}ERROR: pi not found${NC}"
  exit 1
fi

echo "=== QwenCloud Provider — pi E2E Smoke Tests ==="
echo ""

run_test() {
  local name="$1" model="$2" prompt="$3" expected="$4"
  echo -n "  $name ... "

  # Use pi with the QwenCloud provider extension
  output=$(QWENCLOUD_API_KEY="$API_KEY" \
    timeout "$TIMEOUT" pi --no-extensions \
    -e "$PROVIDER_PATH" \
    --model "qwencloud/$model" \
    --no-tools \
    -p "$prompt" 2>&1) || true

  if echo "$output" | grep -qi "$expected"; then
    echo -e "${GREEN}PASS${NC}"
    PASS=$((PASS + 1))
  else
    echo -e "${RED}FAIL${NC}"
    echo "    Expected: $expected"
    echo "    Got: $(echo "$output" | head -3 | tr '\n' ' ')"
    FAIL=$((FAIL + 1))
  fi
}

# ─── Test 1: Basic chat (qwen3.6-flash, no reasoning) ────────────────────
echo -e "${YELLOW}[1/4] Basic chat — qwen3.6-flash${NC}"
run_test "Simple response" \
  "qwen3.6-flash" \
  "Say exactly and only: PASS" \
  "PASS"

# ─── Test 2: Reasoning model (qwen3.7-plus) ─────────────────────────────
echo -e "${YELLOW}[2/4] Reasoning — qwen3.7-plus${NC}"
run_test "Math with reasoning" \
  "qwen3.7-plus" \
  "What is 2+2? Answer with just the number." \
  "4"

# ─── Test 3: DeepSeek V4 Pro ────────────────────────────────────────────
echo -e "${YELLOW}[3/4] DeepSeek V4 Pro${NC}"
run_test "DeepSeek response" \
  "deepseek-v4-pro" \
  "Say exactly and only: OK" \
  "OK"

# ─── Test 4: GLM-5.2 ────────────────────────────────────────────────────
echo -e "${YELLOW}[4/4] GLM-5.2${NC}"
run_test "GLM response" \
  "glm-5.2" \
  "Say exactly and only: YES" \
  "YES"

# ─── Summary ────────────────────────────────────────────────────────────
echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="
[ "$FAIL" -eq 0 ] && echo -e "${GREEN}All E2E tests passed!${NC}" || echo -e "${RED}Some tests failed.${NC}"
exit "$FAIL"
