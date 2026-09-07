# 🎬 StoryBoarding · AI Director & Narrative OS (Commercial Short Drama Workstation)

English | [简体中文](./README.md)

> **Executable Script · Industrial Storyboard Pipeline · Industry Standards · 0ms Edge Cold Start**  
> 
> An all-in-one industrial-grade studio for film directors, micro-drama screenwriters, and AI creators. Covers the entire production lifecycle: from literary core distillation, four-quadrant adaptation matrix, payoff beat radar, unified visual bible, and dual-pane synchronization to call sheet clustering, cinema previz theater, and production deliverables packaging.  
> **Powered by Cloudflare Serverless Edge Stack (Next.js + Hono + D1 + R2 + Pages).**

---

## 🏗️ System Architecture & Production Workflow Map
 
The system is built on the philosophy of **"Script as Code (Executable Script)"**, establishing **3 Production Phases · 7 Industry Stages · AI Director Co-pilot** across commercial micro-drama lifecycles. Users can press <kbd>M</kbd> or click "🗺️ Feature Map" in the TopBar at any time to open the interactive command map:
 
![StoryBoarding Global Production Architecture Map](./docs/assets/architecture.png)
 
> 💡 **High-Resolution Vector Asset**: Downloadable directly in the workspace, or view [docs/assets/system_architecture_map.svg](./docs/assets/system_architecture_map.svg).
>
> - **Phase 1 · Pre-Production & Visual Bible**: `STAGE 01 Adaptation Tradeoffs & Payoff Radar` ➔ `STAGE 02 Unified Visual Bible (Character DNA & Spatial Anchors)`;
> - **Phase 2 · Production & Scheduling**: `STAGE 03 Dual-Pane Self-Healing Studio` ➔ `STAGE 04 Storyboard Canvas & Camera HUD` ➔ `STAGE 05 Call Sheet Production & H3 Prompts`;
> - **Phase 3 · Post-Production & Delivery**: `STAGE 06 Cinema Theater Previz (Full-Screen Darkroom)` ➔ `STAGE 07 5-Tier Industrial Production Deliverables Package`;
> - **Cross-Cutting · 🧠 AI Director Co-pilot**: Conflict distillation, face-locking Visual DNA, dirty-state incremental healing, and multi-modal video prompts compiler.

---

## 💎 Core Capability Modules

### 1. ⚖️ STAGE 01 · Adaptation Tradeoffs & Payoff Radar
- **Dramatic Core Distillation**: Extracts key conflicts, stakes, and commercial hooks from long-form text or outlines;
- **Four-Quadrant Matrix (Adaptation Tradeoffs)**:
  - **Keep**: Core iconic visual moments and essential character traits;
  - **Cut**: Redundant subplots and pacing drags;
  - **Merge**: Secondary character and location aggregations;
  - **Risk**: Logical vulnerabilities and high-cost CGI/production traps;
- **Gate 2 Payoff Beat-Gap Gatekeeper**:
  - Automatically audits payoff distribution to enforce `maxBeatGap ≤ 3` episodes;
  - One-click AI synthesis to bridge dramatic vacuums;
- **Table Read Markdown Summary**: One-click formatted markdown copy and `.md` file download for executive reviews and cast readings.

---

### 2. 🎭 STAGE 02 · Unified Visual Bible
- **Single Source of Truth**: Eliminates inconsistencies between character banks and production bibles;
- **Character DNA Specifications**:
  - 16:9 triple-zone sheets (close-up / full body / dynamic action);
  - Standardized English Visual DNA anchors to prevent facial and stylistic drift across shots;
  - Acoustic DNA parameters (timbre, resonance, speech rate, and English TTS prompt);
- **Environment Anchors**:
  - Solidifies architectural materials, lighting state variants (day/top/night), and 3-5 verifiable entity anchors per set;
- **Prop Specifications**:
  - Handheld, tabletop, and furniture-scale tiering with operational states (open / closed / damaged).

---

### 3. ✍️ STAGE 03 · Dual-Pane Screenplay & Dirty-State Self-Healing
- **Dual-Pane Interactive Studio**: Millisecond-level synchronization between screenplay beats and storyboard cells;
- **Pacing Breath Monitor**: Automatically flags dialogues over 35 characters to maintain tight pacing;
- **Split-to-Dual-Shots**: Splits a single beat into complementary dual-angle camera shots in one click;
- **Dirty State Detection**: Automatically highlights shots as `Needs Re-render` when underlying script text changes, enabling incremental re-rendering without disturbing intact shots.

---

### 4. 📋 STAGE 04 & 05 · Storyboard Workshop & Call Sheet Management
- **Storyboard Workshop**:
  - Seamless toggle across 4:3, 16:9 cinematic widescreen, and 9:16 vertical short drama viewports;
  - HUD overlay with camera parameters, shot scale badges, and individual/batch lock protection;
- **Call Sheet Production View**:
  - Clusters shots into production units (B1, B2...) by `Location + Lighting State`, tracking unit runtimes;
  - Independent batch collapse/expand with global toggle;
  - **MiniMax Hailuo H3 Multi-Modal Prompts**: One-click generation and clipboard copy of coherent video prompts;
  - **CSV Call Sheet Export**: Instant export to standard Excel / CSV call sheets.

---

### 5. 🎬 STAGE 06 · Cinema Theater Previz
- **Darkroom Full-Screen Previz**: Adaptive fullscreen playback featuring Ken Burns motion parallax;
- **Multi-Modal Captions**: Synchronized typewriter dialogue subtitles;
- **Segmented Capsule Scrubber**: Clear visual indication of current shot index and shot duration progress;
- **Full Director Keybindings**:
  - `Space`: Play / Pause playback
  - `←` / `→`: Step backward / forward across shots
  - `C`: Toggle typewriter subtitles
  - `B`: Toggle multi-episode Binge Previz mode
  - `ESC`: Exit theater and focus on active shot in workspace

---

### 6. 🛡️ Studio Security & Multi-Tenant Isolation
- **Zero Resource Consumption for Public Demos**:
  - Pre-flight `checkAuthAndKey` guards placed across AI Generate, Quick Start Wizard, Visual Bible, Script Import, and Hook Doctor;
  - Friendly registration prompts that **never dismiss modals or lose user inputs**;
- **AES-256-GCM Key Vault**: User-provided API keys are encrypted with individual salts before database storage; plaintext keys are never returned to client;
- **Zero-Fallback Architecture**: Strict isolation preventing accidental key exposure or unauthorized resource consumption.

---

### 7. 📦 STAGE 07 · Deliverables & Production Package Export
- **5 Standardized Studio Deliverables**:
  1. 🖼️ **16:9 Storyboard Work Draft (PNG Sheet)** (Instant client-side canvas offline export);
  2. 📝 **Director Multi-Episode Screenplay (Markdown)** (Formatted by `## 🎬 EPISODE 01`, with cliffhanger notes and runtime metrics);
  3. 🎯 **Midjourney / DALL-E 3 Global Control Prompts**;
  4. 🤖 **Kling / Runway Gen-3 AI Video Manifest**;
  5. 📦 **Complete Project Assets Archive (ZIP)** (Structured by episode folders).

---

## 🛠️ Technology Stack

| Layer | Technology | Primary Role |
| :--- | :--- | :--- |
| **Frontend** | **Next.js 14 / React 18 / Tailwind CSS** | Modern responsive dual-pane workspace, fully type-safe |
| **State Management** | **Zustand** | Lightweight, reactive store for storyboard trees and auth |
| **Edge Runtime** | **Hono (TypeScript) on Cloudflare Workers** | 0ms cold start, ultra-high concurrency edge API gateway |
| **Edge Database** | **Cloudflare D1 ➕ Drizzle ORM** | Distributed Serverless SQLite with automated migrations |
| **Object Storage** | **Cloudflare R2** | S3-compatible asset storage with zero egress fees |
| **Model Integration** | **OpenRouter / MiniMax H3 / Seedream** | Multi-modal prompt compiler and image/video synthesis |

---

## 🚀 Quick Start (Local Development)

Zero heavy Docker dependencies. Powered purely by Node.js and Cloudflare `wrangler`.

### 1. Install Dependencies

```bash
# Install backend worker dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install
```

### 2. Start Local Development Servers

```bash
# Terminal 1: Start Hono Cloudflare Worker (http://localhost:8787)
cd backend && npm run dev

# Terminal 2: Start Next.js frontend (http://localhost:3000)
cd frontend && npm run dev
```

### 3. Deploy to Cloudflare

#### Deploy Backend Workers:
```bash
cd backend
npx wrangler d1 create storyboard_db
npx wrangler r2 bucket create storyboard-assets
npm run deploy
```

#### Deploy Frontend Pages:
```bash
cd frontend
npm run build
npx wrangler pages deploy .next
```

---

## 📄 License

Distributed under the [MIT License](LICENSE).
