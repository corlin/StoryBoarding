# 🎬 AI Director Workspace (分镜头脚本与故事板双向协同系统)

> **一套镜头数据，两种创作语言，双向编辑，始终同步。**
> 
> A Unified Dual-Panel AI Director Workspace for Professional Scriptwriting, Visual Storyboarding, and Previz Orchestration.

---

## 🌟 核心理念与亮点

在传统影视与动画工业流程中，**分镜头脚本 (Script View)** 与 **视觉故事板 (Storyboard View)** 往往由不同工具割裂维护。**AI Director Workspace** 以标准化的 **`Shot Model`（镜头模型）** 作为单一真实数据源（Single Source of Truth），实现了：

* 🔄 **双面板双向协同 (Dual-Panel Co-Editing)**：修改左侧剧本景别/机位/台词，右侧故事板角标与元数据即时更新；修改动作描述时智能标记 `dirty`，支持单格与批量局部重绘。
* 🤖 **LangGraph 导演智能体 (Director Agent)**：
  - **故事分析 (Story Analyzer)**：智能提炼戏剧节拍（Narrative Beats）、角色空间与视觉基调。
  - **镜头规划 (Shot Planner)**：合理分配时长节奏曲线（Pacing Curve）。
  - **滑动窗口镜头填充 (Shot Detailer with Sliding Window)**：结合前序镜头上下文生成详尽的镜头参数与精准 Prompt。
  - **连续性检查 (Continuity Checker)**：严格校验视线朝向（Screen Direction）与 180° 轴线规则。
* 🚀 **双创作起点支持**：
  - **起点 A（故事 ➔ 分镜）**：输入一段故事梗概或创意简述，一键自动规划 12 镜起承转合。
  - **起点 B（剧本 ➔ 故事板）**：内置 **模糊分镜解析器 (Fuzzy Shot Parser)**，粘贴任意已有纯文本/Markdown 剧本自动逆向拆解并生成故事板。
* ⏱️ **动态视听预演播放器 (Animatic Previz Player)**：
  - 底部时间轴支持真实时长模拟播放、倍速调节（1x / 1.5x / 2x）与进度拖拽（Scrubbing）；
  - 播放过程中，左右两侧的剧本卡片与故事板画面**全程平滑自动滚屏跟随**。
* 📖 **全局设定集体系 (Visual Bible & Style Constraints)**：
  - **角色设定 (Character Bible)** & **场景空间 (Location Bible)** 统一管理；
  - **全局画风前缀 (Visual Style Prefix)** 自动注入至全片各镜头 Prompt 中，锁定画风一致性。
* 📦 **三重工业级交付物一键导出**：
  - 🖼️ **Storyboard Page (PNG)**：3×4 规格 12 格高清电影分镜全览大图（内置中文字体与构图辅助线）；
  - 📝 **Shot Script (Markdown)**：标准化好莱坞工业级分镜头台本；
  - 📦 **Shot Generation Package (ZIP)**：全套 Shot Model JSON Spec + 提示词包 + 素材包。

---

## 🛠️ 技术栈与规范

| 层级 | 技术选型 | 说明 |
| :--- | :--- | :--- |
| **前端 (Frontend)** | Next.js 14 (App Router) + React 18 + Tailwind CSS + Lucide Icons | 现代暗色电影导演设计系统 |
| **状态管理 (State)** | Zustand (Slices & Fine-Grained Atomic Updates) | 解耦单卡片编辑与全局工作台，零重绘地狱 |
| **后端 (Backend)** | Python 3.11+ / FastAPI / SQLAlchemy 2.0 (Asyncio) / Pydantic V2 | 高性能异步 RESTful 服务 |
| **Python 包管理** | **`uv` (Astral)** | **强制规范：所有 Python 环境与依赖统一由 `uv` 管理** |
| **AI 编排 (Agent)** | LangGraph / LangChain / OpenAI & Anthropic API 兼容层 | 状态机工作流与滑动窗口上下文控制 |
| **存储 (Storage)** | MinIO (S3 兼容对象存储) + PostgreSQL 16 (JSONB) | 资产分块存储与结构化镜头数据持久化 |
| **编排 (DevOps)** | Docker Compose 多容器一键自举 | 容器化部署 |

---

## 🚀 快速开始

### 方式一：Docker Compose 一键启动（推荐）

1. **准备环境变量**：
   ```bash
   cp .env.example .env
   ```

2. **启动全套服务**：
   ```bash
   docker compose up --build
   ```

3. **访问服务**：
   - 🌐 **Web 协同工作台**: [http://localhost:3000](http://localhost:3000)
   - 🎬 **12 镜 Demo 快速预览**: [http://localhost:3000/workspace/demo](http://localhost:3000/workspace/demo)
   - 📚 **FastAPI Swagger 文档**: [http://localhost:8000/docs](http://localhost:8000/docs)
   - 🗄️ **MinIO S3 对象存储控制台**: [http://localhost:9001](http://localhost:9001) (`minioadmin` / `minioadmin_secret_2026`)

---

### 方式二：本地开发调试模式

#### 1. 启动依赖基础服务 (Postgres & MinIO)
```bash
docker compose up -d postgres minio
```

#### 2. 启动 Python 后端（统一使用 `uv` 管理）
```bash
cd backend
# 使用 uv 创建虚拟环境并安装依赖
uv venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
uv pip install -e .

# 启动 FastAPI 后端服务
uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

#### 3. 启动 Next.js 前端
```bash
cd frontend
npm install
npm run dev
```

---

## 📂 项目结构全景

```text
StoryBoarding/
├── docker-compose.yml              # 4合1 多容器编排 (Postgres, MinIO, Backend, Frontend)
├── .env.example                    # 环境变量配置模板
├── implementation_plan.md          # 6 阶段架构设计与完整落地技术方案
├── backend/                        # FastAPI 后端项目
│   ├── pyproject.toml              # 基于 hatchling 与 uv 的依赖声明
│   ├── Dockerfile                  # 基于 uv 的极速轻量容器构建
│   └── app/
│       ├── main.py                 # FastAPI 根应用与路由挂载
│       ├── config.py               # Pydantic 环境变量设置
│       ├── api/                    # RESTful 接口 (projects, shots, generation, export, settings)
│       ├── models/                 # SQLAlchemy 实体与 Pydantic Schemas
│       ├── db/                     # Async 数据库会话与连接池
│       ├── providers/              # LLM / Image / S3 Storage 抽象层与限流器
│       ├── agents/                 # LangGraph Director Agent 状态机与节点
│       ├── services/               # 交付物导出合成器 (ExportService)
│       └── assets/fonts/           # 内置中文字体资源库
├── frontend/                       # Next.js 14 前端项目
│   ├── package.json
│   ├── tailwind.config.ts          # 导演工作台深色影院主题色彩规范
│   └── src/
│       ├── app/                    # 路由 (首页, 控制台, 工作台)
│       ├── components/
│       │   ├── script-view/        # 左面板：分镜头卡片与字段编辑器
│       │   ├── storyboard-view/    # 右面板：3x4 故事板网格与单格重绘
│       │   ├── timeline/           # 底部时间轴：动态 Previz 播放器
│       │   ├── workspace/          # 顶部控制栏与全局操作
│       │   └── modals/             # 设定集、设置中心、剧本导入与参数详情弹窗
│       ├── stores/                 # Zustand 细粒度状态管理
│       └── lib/                    # API 客户端与 SVG 构图图形渲染器
└── shared/
    └── schema/shot_model.json      # 核心 Canonical Shot Model JSON Schema 规范
```

---

## 🎯 核心使用流程

1. **新建项目**：在 [Dashboard](http://localhost:3000/dashboard) 输入标题、故事梗概与目标总时长；
2. **AI 智能拆镜 (起点 A)**：点击顶部 **「AI 导演智能拆镜」**，自动提取角色场景与节奏曲线；
3. **已有剧本导入 (起点 B)**：点击顶部 **「导入脚本」**，粘贴任意分镜脚本文本自动逆向生成；
4. **精细化协同编辑**：
   - 调整左侧景别、机位视角与时长秒数；
   - 在右侧故事板单格中点击 **`ℹ`** 查看 Midjourney/Flux/Sora 提示词与运动向量；
5. **视听 Previz 预演**：点击底部 **`▶` 播放**，检视全片镜头节奏与动态滚屏；
6. **交付物导出**：点击右上角 **「导出」**，一键打包 PNG 大图、Markdown 剧本与 ZIP 素材包。

---

## 📄 开源许可证

本项目采用 [MIT License](LICENSE) 授权协议。
