#!/bin/bash
set -euo pipefail
echo "[post-merge] Installing locked workspace dependencies"
pnpm install --frozen-lockfile
echo "[post-merge] Generating API clients and checking shared types"
pnpm --filter @workspace/api-spec run codegen
echo "[post-merge] Checking database schema (no forced changes)"
pnpm --filter @workspace/db run push
echo "[post-merge] Setup complete"
