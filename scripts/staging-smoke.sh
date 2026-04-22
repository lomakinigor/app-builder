#!/usr/bin/env sh
# T-311 — Staging smoke launcher with automatic run-level session id.
#
# Generates VITE_SESSION_ID=smoke-<YYYYMMDDHHmm>-<4-hex-random> if the caller
# has not already set it. This gives every run a stable, human-readable
# correlation id that ties together all X-Session-Id headers in that run.
#
# Usage (local):
#   npm run test:e2e:staging:session
#
# Usage (override the generated id):
#   VITE_SESSION_ID=smoke-debug-001 npm run test:e2e:staging:session
#
# Required env for real backend calls:
#   VITE_API_MODE=real
#   VITE_API_BASE_URL=https://api-staging.example.com
#   VITE_API_BEARER_TOKEN=<token>        (optional — auth header omitted if absent)

set -e

# ─── Session id ───────────────────────────────────────────────────────────────

if [ -z "${VITE_SESSION_ID}" ]; then
  # date +%Y%m%d%H%M is POSIX-compatible.
  # The 4-hex suffix provides enough entropy to distinguish concurrent runs on
  # the same minute without requiring /dev/urandom or bash-specific $RANDOM.
  SUFFIX=$(od -An -N2 -tx1 /dev/urandom 2>/dev/null | tr -d ' \n' || printf '%04x' "$$")
  VITE_SESSION_ID="smoke-$(date +%Y%m%d%H%M)-${SUFFIX}"
  export VITE_SESSION_ID
  echo "[staging] Generated VITE_SESSION_ID=${VITE_SESSION_ID}"
else
  echo "[staging] Using caller-provided VITE_SESSION_ID=${VITE_SESSION_ID}"
fi

# ─── Run ─────────────────────────────────────────────────────────────────────

exec npx playwright test --config=playwright.staging.config.ts "$@"
