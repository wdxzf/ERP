#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "$ROOT_DIR"

if ! command -v docker >/dev/null 2>&1; then
  echo "[错误] 未找到 docker，请先安装 Docker Desktop 或 Docker Engine。"
  exit 1
fi

echo "[INFO] Docker 模式启动中..."
docker compose up -d --build

echo "[INFO] 启动完成。"
echo "[INFO] 物料库: http://127.0.0.1:8000/inventory"
echo "[INFO] 板卡管理: http://127.0.0.1:8000/pcba"
