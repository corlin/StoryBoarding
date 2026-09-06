# 🎬 AI Director & Narrative OS (好莱坞叙事操作系统 · 多集短剧编译器)

[English](./README_EN.md) | 简体中文

> **剧本即代码 (Executable Script) · 角色视觉基因锚定 · Reelbench 工业标准 · 0ms 边缘冷启动**  
> 
> A Unified Hollywood Narrative OS for Long-Form Series Compilation, Visual DNA Continuity, Reelbench Short Drama Standards, and Cinematic Previz Orchestration.  
> **Powered by Cloudflare Serverless Edge Architecture (Hono + D1 + R2 + Pages).**

---

## 🌟 核心愿景与「乘 · 承 · 应 · 与」有机融合架构

影视与短剧创作正在经历从“导演口述调度制”向**“剧本中心可执行化 (Narrative OS)”**的历史性跃迁。剧本不再只是文学文本，而是可被智能编译器解析、编译、渲染并输出工业资产的 **Source Code（可执行剧本）**。

为了杜绝新增能力变成孤立割裂的“外挂插件”，系统遵循中国古典叙事学与工业产品哲学的**「乘 · 承 · 应 · 与」**四重关系，将长篇短剧编译与单场拆镜、视听设定集、双面板协同、情绪波形、影院预演与制片交付血肉相融：

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       AI Director: 乘 · 承 · 应 · 与 关系图谱                  │
├─────────────────────────────────────────────────────────────────────────────┤
│ 1.【承】(底层资产同一 · 单一真实数据源 / Inheritance & Ground Truth):         │
│    • 全剧视听基因中枢 (Unified Visual Bible)：角色定妆谱、场景空间锁与道具档案；│
│    • 单场工程与多集短剧 100% 共享这一套唯一的连续性资产库，杜绝两套数据割裂。 │
├─────────────────────────────────────────────────────────────────────────────┤
│ 2.【乘】(势能接力 · 升降维自由跃迁 / Momentum & Expansion):                 │
│    • 单场戏随时提供【🚀 升维扩写为连载短剧】(Scene-to-Series Expansion)；     │
│    • 将现有 12 镜固化为「EP 1 · 开篇定调集」，继承主角与场景空间；           │
│    • AI 衔接第 1 集结尾生死悬念，自动推演扩写后续 2~4 集短剧大纲与并发分镜。  │
├─────────────────────────────────────────────────────────────────────────────┤
│ 3.【应】(视听呼应 · 宏微双视界贯通 / Resonance & Duality):                  │
│    • 底部时间轴升级为「双视界情绪时间轴 (Dual-Scale Series Timeline)」；     │
│    • [🔍 本集精修 (12镜)] ⇋ [🌐 全剧宏观波形 (全集连贯山峦)] 无缝缩放；      │
│    • 宏观波形直观悬挂每集末尾【🎣 Cliffhanger 生死卡点浮标】，支持一键下钻穿梭│
├─────────────────────────────────────────────────────────────────────────────┤
│ 4.【与】(工业交付 · 全局反哺 / Mutual Feed & Deliverables):                 │
│    • 影院动态预演支持【🎬 全剧连播 (Binge Previz)】，带章节过场黑场卡；       │
│    • 制片交付支持【当前集 / 全剧打包导出】，Markdown 台本分卷，ZIP 分集归档。 │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 💎 核心能力模块 (v2.1.0 Reelbench 里程碑)

### 1. ⚖️ STAGE 01 · 大纲改编与爽点雷达工作室 (Adaptation Tradeoffs & Payoff Radar)
- **小说原著核心提炼**：商业短剧抽核，提炼核心戏剧矛盾与观众商业钩子；
- **四象限结构取舍**：保留 (Keep) 核心高光、砍掉 (Cut) 冗长支线、合并 (Merge) 角色与场景、风险 (Risk) 预算陷阱；
- **Gate 2 爽点节拍门控**：算法强制全剧相邻爽点真空间隔 `maxBeatGap ≤ 3` 集，支持一键智能补齐真空期爽点；
- **剧本围读 Markdown 导出**：支持一键复制标准排版通告至剪贴板，以及直接下载 `.md` 文件供剧组线下围读会审。

---

### 2. 🎭 STAGE 02 · 剧组前期视觉设定集 (Unified Visual Bible)
- **角色定妆档案 (Character DNA)**：
  - 16:9 三区定妆图（特写/全身/动态），生成并沉淀纯英文 Visual DNA 提示词基准，解决跨集“换脸”难题；
  - 角色声学 DNA 属性注入（音色、共鸣、语速与英文 TTS Acoustic Prompt）。
- **场景空间锚点 (Environment Anchors)**：
  - 固化全剧关键建筑材质、自然光/顶光/暗夜光影状态，记录 3-5 处实物对齐锚点。
- **关键道具特写档案 (Prop Specifications)**：
  - 手持级、桌面级、家具级三级尺度规范与状态变体（开/合/损毁）。

---

### 3. ✍️ STAGE 03 · 文学母本与分镜双向自愈 (Dual-Pane Screenplay & Dirty State)
- **双栏响应式工作台**：左侧文学剧本流与右侧故事板分镜无缝联动；
- **短剧台词呼吸感监控**：单句台词超过 35 字符自动黄色预警，杜绝长篇说教；
- **一分为二拆镜**：鼠标悬停单节拍一键智能切分为景别互补的双镜头组合；
- **增量脏状态检测 (Dirty State)**：修改文学台本后，右侧镜头卡片即时标黄提示「待重绘」，支持原位增量冲印显影。

---

### 4. 📋 STAGE 04 & 05 · 故事板与顺场表排期 (Storyboard & Call Sheet)
- **故事板网格工坊**：
  - 4:3 / 16:9 / 9:16 自适应网格，HUD 运镜参数、景别标签与镜头锁定（Lock）防护；
  - 一键批量锁定/解锁全片镜头，防止批量显影误覆盖。
- **顺场表制片管理 (Call Sheet View)**：
  - 按「拍摄空间 + 光影氛围」聚类归并生产批次（B1, B2...），统计每批时长与镜数；
  - 批次卡片支持折叠展开与全部收起，切集自动重置局部搜索，杜绝空屏假象；
  - **MiniMax Hailuo H3 视频提示词**：一键生成并复制连贯的多模态多镜头视频指令；
  - **制片排期表导出**：一键导出标准 CSV / Excel 制片顺场表格。

---

### 5. 🎬 STAGE 06 · 好莱坞放映影院 (Cinema Theater & Binge Previz)
- **纯净黑场大屏预演**：支持 16:9 宽画幅与 9:16 短剧竖屏满屏动态放映；
- **视听多模态呈现**：Ken Burns 运镜动态视差，台词打字机字幕；
- **好莱坞级分段胶囊进度条**：精确指示当前镜头序号与单镜流逝进度；
- **全套导演键盘快捷键**：
  - `Space`：播放 / 暂停试映
  - `←` / `→`：快速切镜跳转
  - `C`：字幕打字机开关
  - `B`：全剧连播模式开关 (Binge Previz)
  - `ESC`：退出放映并精准对齐高亮工作台对应镜头

---

### 6. 🛡️ 演示体验与商业转化安全闭环
- **公共体验账号零资源消耗红线**：
  - 在 AI 智能拆镜、3步向导、剧组设定集、脚本导入与爆点重构中全面接入 `checkAuthAndKey` 前置拦截；
  - 彻底剔除虚假写死的“专属 Key 已就绪”绿标，接入真实 Key 状态胶囊；
  - 统一换装**琥珀金钥匙按钮**（如 `🔑 注册专属账号规划分镜` / `🔑 注册专属账号出片预演`）；
  - 拦截时弹出友好引导并直接打开注册抽屉，**不丢失当前输入故事内容**；
  - 顶栏设置齿轮与用户菜单在 Demo 模式下拦截修改，引导注册专属导演账号以保障用户私密 API Key 安全。

---

### 7. 📦 工业级制片交付物分卷导出 (Deliverables Package)
- **标准化 5 大工业级交付物**：
  1. 🖼️ **16:9 故事板工作草图打样单 (PNG Draft)**（客户端 Canvas 秒级离线合成）；
  2. 📝 **导演多集分卷分镜头工业台本 (Markdown)**（按 `## 🎬 EPISODE 01` 分卷排版，附带集尾卡点与片长汇总）；
  3. 🎯 **Midjourney / DALL-E 3 导演全局总控提示词 (Global Prompt)**；
  4. 🤖 **可灵 Kling / Runway Gen-3 视频生成清单 (AI Video Manifest)**；
  5. 📦 **制片工程全量资产打包 (ZIP Archive)**（按集数子文件夹规范归档高清图）。

---

## 🛠️ 技术架构 (Cloudflare Serverless Edge Stack)

| 层级 | 技术选型 | 说明 |
| :--- | :--- | :--- |
| **前端 (Frontend)** | **Next.js 14 / React 18 / Tailwind CSS / Zustand** | 部署于 **Cloudflare Pages** (全球边缘 CDN 加速) |
| **后端 (Backend)** | **Hono (TypeScript)** | 部署于 **Cloudflare Workers** (0ms 冷启动，极高并发) |
| **边缘数据库 (Database)** | **Cloudflare D1 ➕ Drizzle ORM** | 分布式 Serverless SQLite，全类型安全自动迁移 |
| **对象存储 (Storage)** | **Cloudflare R2** | S3 兼容对象存储，免流量出口费直存分镜大图 |
| **安全存储 (Key Vault)** | **AES-256-GCM 加密保险箱** | 独立 Salt 密文入库，前端永不返回明文 |

---

## 🚀 快速开始 (本地开发)

本项目完全免除笨重迟钝的 Docker 依赖，直接通过 Node.js 与 `wrangler` 极速轻量驱动。

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
