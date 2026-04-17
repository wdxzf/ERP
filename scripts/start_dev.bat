@echo off
setlocal
cd /d "%~dp0.."

if not exist ".venv\Scripts\python.exe" (
  echo [INFO] 未找到 .venv，正在创建虚拟环境...
  python -m venv .venv
  if errorlevel 1 (
    echo [错误] 创建虚拟环境失败，请确认已安装 Python 3.10+
    pause
    exit /b 1
  )
)

call .venv\Scripts\activate.bat

python -c "import fastapi, uvicorn" >nul 2>nul
if errorlevel 1 (
  echo [INFO] 正在安装项目依赖...
  python -m pip install -U pip
  pip install -r requirements.txt
  if errorlevel 1 (
    echo [错误] 安装依赖失败
    pause
    exit /b 1
  )
)

echo [INFO] 开发模式启动中...
echo [INFO] 物料库: http://127.0.0.1:8000/inventory
echo [INFO] 板卡管理: http://127.0.0.1:8000/pcba
echo [INFO] 接口文档: http://127.0.0.1:8000/docs

uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
