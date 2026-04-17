#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VENV_DIR="$ROOT_DIR/.venv"
PYTHON_BIN="${PYTHON_BIN:-python3}"
UV_BIN="${UV_BIN:-$HOME/.local/bin/uv}"
UV_CACHE_DIR="${UV_CACHE_DIR:-/tmp/uv-cache}"

cd "$ROOT_DIR"

create_with_uv() {
  if [ ! -x "$UV_BIN" ]; then
    return 1
  fi
  echo "[INFO] 正在使用 uv + Python 3.11 创建虚拟环境..."
  mkdir -p "$UV_CACHE_DIR"
  UV_CACHE_DIR="$UV_CACHE_DIR" "$UV_BIN" venv --python 3.11 "$VENV_DIR"
  "$VENV_DIR/bin/python" -m ensurepip --upgrade >/dev/null 2>&1 || true
}

if [ ! -f "$VENV_DIR/bin/activate" ]; then
  echo "[INFO] 未找到 .venv，正在创建虚拟环境..."
  if command -v python3.11 >/dev/null 2>&1; then
    python3.11 -m venv "$VENV_DIR"
  elif command -v "$PYTHON_BIN" >/dev/null 2>&1 && "$PYTHON_BIN" -m venv "$VENV_DIR" >/dev/null 2>&1; then
    :
  elif ! create_with_uv; then
    echo "[错误] 未找到可用的 Python 3.10+ 运行环境。"
    echo "[提示] 可以先安装 Python 3.10+，或先安装 uv 后再运行本脚本。"
    exit 1
  fi
fi

# shellcheck disable=SC1091
source "$VENV_DIR/bin/activate"

if ! python -c "import fastapi, uvicorn" >/dev/null 2>&1; then
  echo "[INFO] 正在安装项目依赖..."
  if python -m pip --version >/dev/null 2>&1; then
    python -m pip install -U pip
    pip install -r requirements.txt
  elif [ -x "$UV_BIN" ]; then
    mkdir -p "$UV_CACHE_DIR"
    UV_CACHE_DIR="$UV_CACHE_DIR" "$UV_BIN" pip install --python "$VENV_DIR/bin/python" -r requirements.txt
  else
    echo "[错误] 当前虚拟环境缺少 pip，且未找到 uv，无法自动安装依赖。"
    exit 1
  fi
fi

echo "[INFO] 开发模式启动中..."
echo "[INFO] 物料库: http://127.0.0.1:8000/inventory"
echo "[INFO] 板卡管理: http://127.0.0.1:8000/pcba"
echo "[INFO] 接口文档: http://127.0.0.1:8000/docs"

exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
