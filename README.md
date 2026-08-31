# 🎬 AI Director Workspace (分镜头脚本与故事板双向协同系统)

> **一套镜头数据，两种创作语言，双向编辑，始终同步。**
> 
> A Unified Dual-Panel AI Director Workspace for Professional Scriptwriting, Visual Storyboarding, and Previz Orchestration.
> **Now Powered by Cloudflare Serverless Edge Architecture (0 Docker, 0ms Cold Start).**

---

## 🌟 核心理念与亮点

在传统影视与动画工业流程中，**分镜头脚本 (Script View)** 与 **视觉故事板 (Storyboard View)** 往往由不同工具割裂维护。**AI Director Workspace** 以标准化的 **`Shot Model`（镜头模型）** 作为单一真实数据源（Single Source of Truth），实现了：

* 🔄 **双面板双向协同 (Dual-Panel Co-Editing)**：修改左侧剧本景别/机位/台词，右侧故事板角标与元数据即时更新；修改动作描述时智能标记 `dirty`，支持单格与批量局部重绘。
* 🤖 **好莱坞导演智能体 (Director Agent)**：
  - **6 阶段 30 秒 12 镜叙事弧**：开篇抓人 ➔ 空间与人物 ➔ 遭遇危机 ➔ 动作升级 ➔ 子弹时间高潮 ➔ 意境收尾。
  - **严格视听语法**：恪守 180° 视线与运动轴线，禁止视线颠倒与空间跳轴。
  - **石墨素描 Previz 画风**：统一注入专业黑白粗粝石墨线条、自信结构笔触、选择性灰度光影与运动指示箭头。
* 🚀 **双创作起点支持**：
  - **起点 A（故事 ➔ 分镜）**：输入一段故事梗概或创意简述，一键自动规划 12 镜起承转合。
  - **起点 B（剧本 ➔ 故事板）**：内置 **模糊分镜解析器 (Fuzzy Shot Parser)**，粘贴任意已有纯文本/Markdown 剧本自动逆向拆解并生成故事板。
* ⏱️ **全屏影院动态预演播放器 (Cinema Theater Previz)**：
  - 支持全屏/大屏 16:9 动态分镜播放、键盘快捷键（空格播放/暂停、方向键前后切镜）、真实时长切镜与倍速调节；
  - 播放过程中，左右两侧的剧本卡片与故事板画面**全程平滑自动滚屏跟随**。
* 📖 **全局设定集体系 (Visual Bible & Continuity Anchors)**：
  - **Reference 1 (主角色连续性基准锁)**：锁定五官、发型、体态与服装道具；
  - **Reference 2 (核心场景空间基准锁)**：锁定建筑几何、空间透视与光影方向。
* 📦 **全套工业级交付物一键导出**：
  - 🖼️ **Storyboard Page (PNG)**：1:1 动态像素对齐故事板打样单；
  - 📝 **Shot Script (Markdown)**：标准化好莱坞工业级分镜头台本；
  - 📋 **Professional Director's Global Prompt**：一键复制完整 12 格总控 Prompt（直接投喂 Midjourney / Grok）；
  - 🗂️ **Storyboard Images Pack (ZIP)**：每个镜头的 1080P 高清原图（按 `SHOT_01_WS_...png` 严格有序规则命名）；
  - 📦 **Shot Generation Package (ZIP)**：全套 Shot Model JSON Spec + 提示词包 + 全部 1080P 原图。

---

## 🛠️ 技术栈与架构 (Cloudflare Serverless)

| 层级 | 技术选型 | 说明 |
| :--- | :--- | :--- |
| **前端 (Frontend)** | Next.js 14 / React 18 / Tailwind CSS / Lucide Icons | 部署于 **Cloudflare Pages** |
| **后端 (Backend)** | **Hono (TypeScript)** | 部署于 **Cloudflare Workers** (0ms 冷启动，极速轻量) |
| **数据库 (Database)** | **Cloudflare D1 ➕ Drizzle ORM** | 边缘分布式 Serverless SQLite，全类型安全 |
| **对象存储 (Storage)** | **Cloudflare R2** | S3 兼容对象存储，免流量出口费直存分镜资产 |
| **AI 编排 (Agent)** | 轻量原生 TypeScript 导演状态机 | 6 阶段 12 镜好莱坞工业分镜管线 |
| **状态管理 (State)** | Zustand (Slices & Fine-Grained Atomic Updates) | 解耦单卡片编辑与全局工作台 |

---

## 🚀 快速开始 (本地开发与部署)

本项目已彻底废除 Docker 依赖，直接通过 Node.js 与 `wrangler` 驱动。

### 1. 安装依赖

```bash
# 安装后端 Workers 依赖
cd backend && npm install

# 安装前端依赖
cd ../frontend && npm install
```

### 2. 启动本地开发服务

```bash
# 启动后端 Cloudflare Worker (运行于 http://localhost:8787)
cd backend && npm run dev

# 另起终端启动前端 (运行于 http://localhost:3000)
cd frontend && npm run dev
```

### 3. 一键部署到 Cloudflare

#### 部署后端 Workers:
```bash
cd backend
npx wrangler d1 create storyboard_db
npx wrangler r2 bucket create storyboard-assets
npm run deploy
```

#### 部署前端 Pages:
```bash
cd frontend
npm run build
npx wrangler pages deploy .next
```
