#!/usr/bin/env bash
# Smoke test for QwenCloud provider
# Usage: QWENCLOUD_API_KEY="sk-..." bash tests/e2e/smoke.sh
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

API_BASE="${QWENCLOUD_API_BASE:-https://token-plan.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1}"
API_KEY="${QWENCLOUD_API_KEY:-}"

if [ -z "$API_KEY" ]; then
  echo -e "${RED}ERROR: QWENCLOUD_API_KEY not set.${NC}"
  echo "Run: QWENCLOUD_API_KEY=\"your-key\" bash $0"
  exit 1
fi

# Hide full key in logs
MASKED_KEY="${API_KEY:0:8}...${API_KEY: -4}"
echo -e "${CYAN}=== QwenCloud API Smoke Test ===${NC}"
echo "API Base: $API_BASE"
echo "API Key:  $MASKED_KEY"
echo ""

pass=0
fail=0

check() {
  local label="$1" status="$2" body="$3"
  if [ "$status" -ge 200 ] && [ "$status" -lt 300 ]; then
    echo -e "  ${GREEN}PASS${NC} ($status) — $label"
    pass=$((pass + 1))
  else
    echo -e "  ${RED}FAIL${NC} ($status) — $label"
    echo "  Response: $(echo "$body" | head -c 500)"
    fail=$((fail + 1))
  fi
}

# ─── Test 1: /models endpoint ────────────────────────────────────────────
echo -e "${YELLOW}[1/7] Fetch /models endpoint${NC}"
MODELS_RESP=$(curl -s -w "\n%{http_code}" \
  -H "Authorization: Bearer $API_KEY" \
  "$API_BASE/models" 2>&1) || true
MODELS_STATUS=$(echo "$MODELS_RESP" | tail -1)
MODELS_BODY=$(echo "$MODELS_RESP" | sed '$d')

check "GET /models" "$MODELS_STATUS" "$MODELS_BODY"

# Parse model count from response
MODEL_COUNT=$(echo "$MODELS_BODY" | grep -o '"id"' | wc -l | tr -d ' ')
echo "  → Found ~$MODEL_COUNT model IDs"

# Check for our expected model IDs
for MODEL in "qwen3.7-plus" "qwen3.6-flash" "deepseek-v4-pro" "glm-5.2"; do
  if echo "$MODELS_BODY" | grep -q "\"$MODEL\""; then
    echo -e "    ${GREEN}✓${NC} $MODEL found"
  else
    echo -e "    ${YELLOW}⚠${NC} $MODEL not found (may use different ID format)"
  fi
done

# ─── Test 2: Basic chat completion (no reasoning) ────────────────────────
echo ""
echo -e "${YELLOW}[2/7] Basic chat completion (no reasoning)${NC}"
CHAT1_RESP=$(curl -s -w "\n%{http_code}" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen3.6-flash",
    "messages": [{"role": "user", "content": "Say exactly: hello world"}],
    "max_tokens": 20
  }' \
  "$API_BASE/chat/completions" 2>&1) || true
CHAT1_STATUS=$(echo "$CHAT1_RESP" | tail -1)
CHAT1_BODY=$(echo "$CHAT1_RESP" | sed '$d')

check "POST chat/completions (flash, no reasoning)" "$CHAT1_STATUS" "$CHAT1_BODY"

# Extract content
CHAT1_CONTENT=$(echo "$CHAT1_BODY" | grep -o '"content":"[^"]*"' | head -1 | sed 's/"content":"//;s/"//')
echo "  → Response: \"$CHAT1_CONTENT\""

# ─── Test 3: Reasoning effort = low ──────────────────────────────────────
echo ""
echo -e "${YELLOW}[3/7] Chat completion with reasoning_effort=low${NC}"
CHAT2_RESP=$(curl -s -w "\n%{http_code}" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen3.7-plus",
    "messages": [{"role": "user", "content": "What is 2+2? Answer in one word."}],
    "max_tokens": 50,
    "reasoning_effort": "low"
  }' \
  "$API_BASE/chat/completions" 2>&1) || true
CHAT2_STATUS=$(echo "$CHAT2_RESP" | tail -1)
CHAT2_BODY=$(echo "$CHAT2_RESP" | sed '$d')

check "POST chat/completions (reasoning_effort=low)" "$CHAT2_STATUS" "$CHAT2_BODY"

# Check for reasoning_content in response
if echo "$CHAT2_BODY" | grep -q "reasoning_content"; then
  echo "  → Has reasoning_content in response"
elif echo "$CHAT2_BODY" | grep -q "reasoning"; then
  echo "  → Has reasoning field in response"
fi

# ─── Test 4: Reasoning effort = high ─────────────────────────────────────
echo ""
echo -e "${YELLOW}[4/7] Chat completion with reasoning_effort=high${NC}"
CHAT3_RESP=$(curl -s -w "\n%{http_code}" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen3.7-plus",
    "messages": [{"role": "user", "content": "What is 2+2? Answer in one word."}],
    "max_tokens": 50,
    "reasoning_effort": "high"
  }' \
  "$API_BASE/chat/completions" 2>&1) || true
CHAT3_STATUS=$(echo "$CHAT3_RESP" | tail -1)
CHAT3_BODY=$(echo "$CHAT3_RESP" | sed '$d')

check "POST chat/completions (reasoning_effort=high)" "$CHAT3_STATUS" "$CHAT3_BODY"

# ─── Test 5: No reasoning_effort (simulates "off") ───────────────────────
echo ""
echo -e "${YELLOW}[5/7] Chat completion WITHOUT reasoning_effort (simulates 'off')${NC}"
CHAT4_RESP=$(curl -s -w "\n%{http_code}" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen3.7-plus",
    "messages": [{"role": "user", "content": "What is 2+2? Answer in one word."}],
    "max_tokens": 50
  }' \
  "$API_BASE/chat/completions" 2>&1) || true
CHAT4_STATUS=$(echo "$CHAT4_RESP" | tail -1)
CHAT4_BODY=$(echo "$CHAT4_RESP" | sed '$d')

check "POST chat/completions (no reasoning_effort)" "$CHAT4_STATUS" "$CHAT4_BODY"

# Check if reasoning still occurred without explicit reasoning_effort
HAS_REASONING="no"
if echo "$CHAT4_BODY" | grep -qE "(reasoning_content|reasoning)"; then
  HAS_REASONING="yes"
fi
echo "  → Reasoning in response without explicit effort: $HAS_REASONING"

# ─── Test 6: Reasoning effort = "none" (explicit disable) ────────────────
echo ""
echo -e "${YELLOW}[6/7] Chat completion with reasoning_effort=\"none\"${NC}"
CHAT5_RESP=$(curl -s -w "\n%{http_code}" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen3.7-plus",
    "messages": [{"role": "user", "content": "What is 2+2? Answer in one word."}],
    "max_tokens": 50,
    "reasoning_effort": "none"
  }' \
  "$API_BASE/chat/completions" 2>&1) || true
CHAT5_STATUS=$(echo "$CHAT5_RESP" | tail -1)
CHAT5_BODY=$(echo "$CHAT5_RESP" | sed '$d')

check "POST chat/completions (reasoning_effort=none)" "$CHAT5_STATUS" "$CHAT5_BODY"

# Check if "none" is accepted or rejected
NONE_ACCEPTED="no"
if [ "$CHAT5_STATUS" -ge 200 ] && [ "$CHAT5_STATUS" -lt 300 ]; then
  NONE_ACCEPTED="yes"
  CHAT5_CONTENT=$(echo "$CHAT5_BODY" | grep -o '"content":"[^"]*"' | head -1 | sed 's/"content":"//;s/"//')
  echo "  → \"none\" ACCEPTED — content: \"$CHAT5_CONTENT\""
else
  NONE_ACCEPTED="no"
  echo -e "  → \"none\" REJECTED — QwenCloud does not support reasoning_effort=\"none\""
fi

# ─── Test 7: DeepSeek V4 Pro with reasoning_effort=high ──────────────────
echo ""
echo -e "${YELLOW}[7/7] DeepSeek V4 Pro with reasoning_effort=high${NC}"
CHAT6_RESP=$(curl -s -w "\n%{http_code}" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "deepseek-v4-pro",
    "messages": [{"role": "user", "content": "What is 2+2? Answer in one word."}],
    "max_tokens": 50,
    "reasoning_effort": "high"
  }' \
  "$API_BASE/chat/completions" 2>&1) || true
CHAT6_STATUS=$(echo "$CHAT6_RESP" | tail -1)
CHAT6_BODY=$(echo "$CHAT6_RESP" | sed '$d')

check "POST chat/completions (deepseek-v4-pro, reasoning_effort=high)" "$CHAT6_STATUS" "$CHAT6_BODY"

# ─── Summary ─────────────────────────────────────────────────────────────
echo ""
echo -e "${CYAN}=== Results: $pass passed, $fail failed ===${NC}"

if [ "$fail" -eq 0 ]; then
  echo -e "${GREEN}All smoke tests passed!${NC}"
  exit 0
else
  echo -e "${RED}Some tests failed.${NC}"
  exit 1
fi
