# AGENTS.md

本文档是本仓库内各类代理或协作型自动化工具的工作约定。

## 项目概览

- 技术栈：`FastAPI + SQLite + Jinja2 + 原生 JS`
- 应用根目录：`app/`
- 后端入口：`app/main.py`
- 页面路由：`/ui/*`
- 接口路由：`/api/*`
- 静态资源：`app/static/`
- 模板目录：`app/templates/`

这是一个围绕物料、分类、BOM、库存、采购、供应商、销售订单、生产计划等模块构建的 ERP 系统。

## 当前代码结构

- `app/main.py`
  负责注册路由和兼容性跳转。
- `app/routes/`
  页面路由层和部分历史接口入口。
- `app/modules/materials/`
  已拆分为 `api + service + repository + schema`
- `app/modules/categories/`
  已拆分为 `api + service + repository + schema`
- `app/crud.py`
  仍承载大量历史业务逻辑。除非目标模块还未拆分，否则尽量不要继续往这里堆新逻辑。
- `app/schemas.py`
  历史 schema，旧模块仍在使用。
- `app/templates/`
  Jinja 模板。
- `app/static/js/`
  页面脚本和前端公共逻辑。
- `app/static/js/api/http.js`
  统一请求层。
- `app/static/js/store/appStore.js`
  公共基础数据缓存和共享状态入口。

## 不可违反的约束

- 不要擅自改变业务语义，除非任务明确要求。
- 不要做大范围 UI 改版，除非任务明确要求。
- 每次改动后都要保证现有页面可用。
- 不要擅自修改数据库结构，除非任务明确要求做 migration。
- 优先做兼容，而不是直接打断旧数据或旧路由。

## 后端约定

- 新增或重构后的业务域优先使用以下结构：
  - `api.py`
  - `service.py`
  - `repository.py`
  - `schema.py`
- 路由层保持薄，尽量只做参数接收和响应返回。
- 校验、编排、兼容映射放在 `service.py`。
- 查询和数据库细节放在 `repository.py`。
- 如果涉及历史接口，`/api/*` 仍应作为主路线。
- 必须重视兼容性：
  - 旧前端 payload 可能还在发送历史字段名
  - 数据库旧记录可能还保留拆分字段

## 前端约定

- 公共请求统一走 `app/static/js/api/http.js`
- 公共基础数据加载统一走 `app/static/js/store/appStore.js`
- 不要在模板的 `content block` 里直接写会立即执行的页面脚本
- 页面级脚本统一通过 `base.html` 中的 `{% block page_scripts %}` 注入
- 公共脚本由 `base.html` 统一加载
- `layout.js` 保持在页面底部加载
- 桌面端和移动端尽量共用同一份数据源，不要拆出两套请求逻辑

## 模板约定

- `base.html` 是共享脚本加载的唯一入口
- 不要在 `{% block content %}` 中插入立即执行的 `<script>`
- 页面如需脚本：
  - 优先放到 `app/static/js/<page>.js`
  - 或在 `{% block page_scripts %}` 中放极薄的一层包装

## Materials 模块说明

物料页已经做过一轮简化，不要把已移除的旧概念重新加回主表单。

- 物料主表单基础字段目前是：
  - `name`
  - `model_spec`
  - `material_type`
  - `category`
  - `unit`
  - `default_supplier`
  - `unit_price`
- 其余字段放在高级信息折叠区
- `code` 仍然在后端生成和存储，但物料页弹窗和列表已不再直接展示它
- `tax_rate` 不再由物料表单填写
- `package_name` 只作为兼容字段存在，不应再驱动物料页筛选或独立 UI

### Materials 兼容说明

- 旧数据中仍可能存在以下拆分字段：
  - `spec`
  - `drawing_no`
  - `package_name`
  - `material_name_attr`
  - `grade_attr`
- 当前前端显示会将它们兼容合并为：
  - `model_spec`
  - `brand_attr`
- 后端 service 应继续尽量兼容这些历史字段输入

## Categories 模块说明

- 分类模块也已迁移到 `api + service + repository + schema`
- 相关改动应继续遵循 `/api/*` 路由体系

## 路由约定

- 页面优先使用 `/ui/*`
- 接口优先使用 `/api/*`
- 历史路由可能仍用于兼容，不要随意删除

## 校验要求

完成有意义的改动后，至少执行与改动范围相匹配的最小校验：

- Python 语法和导入检查：
  - `.venv\Scripts\python -m compileall app`
- JS 语法检查：
  - `node --check app/static/js/<file>.js`
- 如果改到应用启动或路由装配：
  - `.venv\Scripts\python -c "import app.main; print('import-ok')"`

如果某项检查无法执行，需要明确说明。

## 编辑建议

- 优先做小而可回滚的改动
- 优先保持局部一致性，不要为了“理想结构”扩大改动面
- 除非任务要求，不要把新模式大面积扩散到未触达的老模块
- 如果页面已经有稳定风格或交互模式，应尽量保持一致
- 当你移除一个表单字段时，至少同步检查：
  - 渲染逻辑
  - 搜索和筛选逻辑
  - 表单提交 payload
  - 编辑态回填
  - 空状态和加载状态
  - 移动端布局

## 高风险区域

- 模板之间的脚本加载顺序
- 仍依赖 `base.html` 全局脚本的页面
- `appStore` 中的短时缓存基础数据
- 数据库里还存在、但当前 UI 不应再依赖的历史字段
- 桌面表格视图和移动端卡片视图之间的行为漂移

## 推荐改动风格

- 小步修改，可逆优先
- 兼容优先
- 只重构当前任务真正需要的切片
- 在最终说明中明确指出残余风险
