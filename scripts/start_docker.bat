@echo off
setlocal
cd /d "%~dp0.."

docker --version >nul 2>nul
if errorlevel 1 (
  echo [错误] 未找到 Docker，请先安装 Docker Desktop。
  pause
  exit /b 1
)

echo [INFO] Docker 模式启动中...
docker compose up -d --build
if errorlevel 1 (
  echo [错误] Docker 启动失败
  pause
  exit /b 1
)

echo [INFO] 启动完成。
echo [INFO] 物料库: http://127.0.0.1:8000/inventory
echo [INFO] 板卡管理: http://127.0.0.1:8000/pcba
pause
