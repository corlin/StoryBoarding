# 🎬 AI Director & Narrative OS (好莱坞叙事操作系统 · 多集短剧编译器)

> **剧本即代码 (Executable Script) · 角色视觉基因锚定 · 情绪势能波形 · 0ms 边缘冷启动**
> 
> A Unified Hollywood Narrative OS for Long-Form Series Compilation, Visual DNA Continuity, Dramatic Beat State Trees, and Previz Orchestration.
> **Powered by Cloudflare Serverless Edge Architecture (Hono + D1 + R2 + Pages).**

---

## 🌟 核心产品愿景与革命性特性

短剧与影视生产正在从过去的“导演中心调度制”迈向**“编剧/剧本中心制（Narrative OS）”**。
剧本不再只是文学文本，而是影视生产的 **Source Code（可执行剧本）**。本系统不仅支持单场次的分镜头双向协同，更全面升维为商业短剧的工业级编译引擎。

---

### 1. 📖 长篇小说 / 剧本一键成剧 (Multi-Episode Series Compiler)
- **万字长篇无痛导入**：支持直接粘贴 **500 ~ 20,000 字** 的小说高潮章节、网络文学或连续剧本企划；
- **Stage 1 交互式透视抽屉 (Series Blueprint Drawer)**：
  - AI 在 2~3 秒内秒级提取**全局角色卡（主角/反派/配角）**及人物性格动机；
  - 自动为每位角色生成纯英文**视觉基因锚点 (Visual DNA Anchor)**，彻底终结跨集角色“换脸”难题；
  - 智能切分 **3~5 集短剧（每集 60~90s）**，算法强制将每集末尾截断在扣人心弦的**生死悬念或惊天反转 (Cliffhanger Hook)**；
- **Stage 2 微观并发逐集拆拍**：
  - 创作者确认大纲后，系统并发调用好莱坞拆镜引擎，极速为每集拆出 8~12 个镜头并自动注入角色视觉 DNA。

---

### 2. ⚡ 戏剧节拍状态树与情绪势能波形 (Dramatic Beat State Tree)
- **商用成瘾性节拍体系**：
  - `hook`（开篇抓眼球钩子 · 85V+）
  - `inciting_incident`（危机爆发 · 70V+）
  - `tension_build`（悬念与施压 · 60V+）
  - `climax_payoff`（情绪爆点与爽点兑现 · 95V+）
  - `cliffhanger_hook`（集尾生死卡点 · 90V+）
- **实时情绪势能波形 (Emotional Voltage Waveforms)**：
  - 工作台底部时间轴根据 0~100V 情绪势能实时呈现动态波形，波峰深红猩红（高潮/卡点）、波谷幽蓝（铺垫）；
- **悬念引线标注 (Information Gap)**：
  - 显式标记每个分镜向观众隐瞒的核心情报，驱动观众成瘾性追看下一镜。

---

### 3. 🎭 全剧角色资产总线 (Character Hub & Visual DNA Bus)
- **全局角色库常驻抽屉**：随时查看全剧角色的定妆头像、人物小传与纯英文提示词基准；
- **跨集生图连续性锁定**：出镜画面自动注入对应角色的 Visual DNA，实现面部轮廓、发型发色、标志性服装在数十个镜头中的高度连续。

---

### 4. 🔄 双面板协同与局部增量重绘 (Dual-Panel Co-Editing)
- **左侧剧本台本 (Script View)** ➕ **右侧 16:9 故事板 (Storyboard View)**；
- 修改景别/机位/台词即时响应；修改动作描述时智能标记 `dirty`，支持局部一键重绘，杜绝全局推倒重来的算力浪费。

---

### 5. ⏳ 制片级时光穿越与快照管理 (Time-Travel Versions)
- **全生命周期版本快照**：AI 拆镜前自动创建防护快照，支持创作者随时手动创建版本备份；
- **时光穿越只读预演**：在不破坏当前工作区的前提下一键穿越查看历史版本；
- **一键无损回滚与分支派生 (Rollback & Fork Branch)**。

---

### 6. ⏱️ 影院级动态预演播放器 (Cinema Theater Previz)
- 全屏 16:9 视听动态播放，空格键即时启停，方向键跨镜导航；
- 播放过程中两侧剧本与画卷精准平滑自动滚屏跟随。

---

### 7. 🔒 企业级安全与算力保护
- **AES-256-GCM 密文保险箱**：用户的 API Key 经每人独立 Salt 加密后入库，前端永不返回明文；
- **生图模型默认推荐**：全栈统一默认锁定为字节跳动最新超轻量极速模型 `bytedance-seed/seedream-5-0-lite`。

---

## 🛠️ 技术架构 (Cloudflare Serverless)

| 层级 | 技术选型 | 说明 |
| :--- | :--- | :--- |
| **前端 (Frontend)** | Next.js 14 / React 18 / Tailwind CSS / Zustand | 部署于 **Cloudflare Pages** |
| **后端 (Backend)** | **Hono (TypeScript)** | 部署于 **Cloudflare Workers** (0ms 冷启动，边缘计算) |
| **边缘数据库 (Database)** | **Cloudflare D1 ➕ Drizzle ORM** | 分布式 Serverless SQLite，全类型安全自动迁移 |
| **对象存储 (Storage)** | **Cloudflare R2** | S3 兼容对象存储，免流量出口费直存分镜大图 |
| **AI 编排引擎 (Engine)** | 两段式宏微观叙事编译器 ➕ 导演状态机 | 宏观全剧长篇解构 ➔ 微观逐集拆拍 |

---

## 🚀 快速开始 (本地开发)

本项目已彻底废除繁琐的 Docker 依赖，直接通过 Node.js 与 `wrangler` 极速驱动。

### 1. 安装依赖

```bash
# 安装后端 Workers 依赖
cd backend && npm install

# 安装前端依赖
cd ../frontend && npm install
```

### 2. 启动本地开发服务

```bash
# 终端 1：启动后端 Cloudflare Worker (端口 http://localhost:8787)
cd backend && npm run dev

# 终端 2：启动前端 Next.js (端口 http://localhost:3000)
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

---

## 📄 许可证 (License)

本项目基于 [MIT License](LICENSE) 开源发布。
