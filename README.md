# ERP_W

[English README](README_EN.md)

一个面向中小企业与制造场景的 Web 进销存系统，包含：

- 物料、分类、版本
- BOM
- 库存
- 采购、入库、发票、询价、供应商
- 销售订单
- 生产计划
- Excel 导入导出
- 淘宝 / WooCommerce 基础集成

项目技术栈：`FastAPI + SQLite + Jinja2`

## 先看结论

- 日常开发：按下面“开发阶段”做，改代码最快。
- 验证和部署：按下面“验证与部署阶段”做，环境更稳定。
- 想两个人共用一份数据：按下面“两人共用”做。
-  `data/*.db`、`uploads/`、`.env`、为真实业务数据或 API 密钥。

## 推荐工作流

更适合这个项目的方式是：

- 开发阶段：本地直接跑为主

原因很简单：

- 本地直跑有 `--reload`，改 Python、模板、静态文件都更快
- 两套方式分开用，能减少“明明改了代码但页面没变”的困惑

一个很重要的习惯：


## 开发阶段

适合：

- 改页面
- 改接口
- 调试功能
- 想立刻看到代码变化

### 环境要求

- Python `3.10+`
- Windows / Linux / macOS

### 1. 获取代码

```bash
git clone <你的仓库地址> dalang-erp
cd dalang-erp
```

如果你是下载压缩包，解压后进入项目根目录即可。项目根目录就是能看到 `app/`、`requirements.txt`、`README.md` 的那一层目录。

### 2. 安装依赖

Windows `CMD`：

```bat
python -m venv .venv
.venv\Scripts\activate.bat
python -m pip install -U pip
pip install -r requirements.txt
```

Windows `PowerShell`：

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -U pip
pip install -r requirements.txt
```

Linux / macOS：

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -U pip
pip install -r requirements.txt
```

如果 PowerShell 提示无法执行脚本，最省事的做法是直接改用 `CMD`。

### 3. 启动开发服务

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

常见启动方式对应如下：

- Windows `CMD` / `PowerShell`：可以直接双击 `start.bat`，或手动运行 `python -m uvicorn ...`
- Linux / macOS / WSL 的 `bash`：请使用 `bash start.sh` 或 `./start.sh`
- 不要在 `bash` / WSL 里直接输入 `start.bat`，否则会出现 `command not found`

如果你想一键启动，直接用项目根目录下的入口即可：

- Linux / macOS / WSL：`bash start.sh`
- Windows：双击 `start.bat`

底层会自动转发到开发脚本并处理虚拟环境和依赖安装。

在 Linux / WSL 上，如果系统默认 `python3` 太老且你已经安装了 `uv`，脚本也会优先尝试用 `uv + Python 3.11` 创建 `.venv`。

你也可以直接用原始脚本：

- Linux / macOS / WSL：`bash scripts/start_dev.sh`
- Windows：双击 `scripts/start_dev.bat`

如果你想改端口，例如改成 `8001`，可以直接运行：

```bash
python -m uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

这时访问地址也要一起改成 `8001`：

- 本机：`http://127.0.0.1:8001/ui`
- 同一局域网其他设备：`http://你的局域网IP:8001/ui`

打开：

```text
http://127.0.0.1:8000/inventory
```

- 物料库：`http://127.0.0.1:8000/inventory`
- 板卡管理：`http://127.0.0.1:8000/pcba`
- 接口文档：`http://127.0.0.1:8000/docs`

停止：在运行窗口按 `Ctrl+C`。

### 4. 首次启动会发生什么

- 自动创建 `data/inventory.db`
- 自动创建 `uploads/` 相关目录
- 自动补齐部分默认配置

不会自动生成演示数据，也不会自动预置物料分类。

## 目录结构

```text
.
├── app/                 应用代码
├── data/                SQLite 数据库目录
├── uploads/             上传附件目录
├── scripts/             辅助脚本
├── requirements.txt
├── LICENSE
└── DISCLAIMER.md
```

## 两人共用

如果你希望“我新增的物料，对方刷新就能看到”，不要让两个人各自跑一份仓库；应该让两个人访问同一台机器上的同一个服务。

### 推荐方式：固定一台电脑持续运行

适合：

- 两个人都在同一个办公室或同一个局域网
- 暂时不做登录
- 先共用一份 SQLite 数据

### 1. 启动

在共享主机上先按“开发阶段”完成环境准备，然后启动服务：

- Windows：双击 start.bat
- Linux / macOS / WSL：ash start.sh

### 2. 访问

- 共享主机本机：`http://127.0.0.1:8000/inventory`
- 另一台电脑：`http://共享主机局域网IP:8000/inventory`

例如共享主机 IP 是 `192.168.1.20`，另一台电脑访问：

```text
http://192.168.1.20:8000/inventory
```

如果另一台电脑打不开，通常先检查共享主机防火墙是否放行 `8000/TCP`。

### 3. 数据保存位置

当前项目会把数据直接保存在项目目录：

- 数据库：`data/`
- 上传附件：`uploads/`

所以服务重启后，数据仍会保留。

### 4. 备份建议

备份时至少一起备份：

- `data/`
- `uploads/`

不要只备份代码仓库。

## 使用顺序建议

第一次使用可以按这个顺序：

1. 进入“类别管理”，先建物料分类
2. 进入“物料主数据”，新增物料
3. 维护基础设置
4. 录入产品与 BOM
5. 再使用库存、采购、销售、生产计划等模块

更细的页面操作顺序可在系统里的“使用教程”查看。

## 常见问题

### 为什么我新增的数据，别人电脑上看不到？

因为默认是本地 SQLite 文件，每个人各自运行时都有自己的一份数据库。想共享数据，就要让两个人访问同一台机器上的同一个服务。

### 为什么没有演示数据？

为了避免公开真实业务信息，仓库只提供代码和空目录结构。

### 为什么“类别管理”是空的？

这是刻意设计的。公开版本不会自动预置行业分类，你需要先自行建立分类。

### 能不能把 `inventory.db` 上传到 GitHub 给别人同步？

不建议。它适合备份，不适合多人实时同步。多人共用数据的正确方式是共用同一个正在运行的服务。

### 可以直接部署在 GitHub Pages 吗？

不可以。这个项目不是纯静态网页，而是带后端和数据库的应用。

## 安全提示

- 不要提交 `data/*.db`
- 不要提交 `uploads/` 里的真实附件
- 不要提交 `.env`
- 不要把淘宝、WooCommerce 等密钥写进代码仓库
- 当前如果不做登录，就不要暴露到公网

## 许可说明

本项目不是传统意义上“可随意商用”的开源协议，而是“源码公开 + 自定义自用许可”。

你通常可以：

- 个人或本单位内部安装、使用、学习、为自用修改
- 用它管理你自己的业务

你通常不可以：

- 把本软件当商品出售、出租、收授权费
- 以本软件为主要交付物，对外提供收费托管、代部署、SaaS 等服务

完整条款请看 [LICENSE](LICENSE)。

## 免责声明

本软件按“现状”提供，不作任何明示或暗示担保。因使用本软件导致的业务损失、数据丢失或第三方平台接口相关问题，由使用者自行承担。

完整内容请看 [DISCLAIMER.md](DISCLAIMER.md)。
