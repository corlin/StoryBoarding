# 🎬 StoryBoarding · Short-Drama AIGC Director and Production Workspace

English | [简体中文](./README.md)

StoryBoarding is a production workspace for short-drama writers, directors, and small content teams. It keeps story development, storyboard design, AI video and speech generation, review decisions, subtitles, and final delivery in one traceable project. Every shot, generation job, candidate take, adopted version, and delivery artifact has an explicit place in the workflow.

**Live site: [storyboarding.caifu.social](https://storyboarding.caifu.social/)**

![StoryBoarding system architecture](./docs/assets/architecture.png)

## Production workflow

### 01 · Bible and Screenplay

- Build multi-episode projects from a premise, outline, or long-form source.
- Manage hooks, cliffhangers, payoff beats, screenplay text, and linked shots.
- Define character visual and acoustic DNA, location anchors, and prop states.
- Use 9:16 as the primary vertical-drama format, with 16:9 and other project ratios supported.

### 02 · Storyboard Workshop

- Edit shots by episode, including framing, camera movement, duration, dialogue, and prompts.
- Bind characters, locations, and props to shots for continuity across episodes.
- Use shot locking, incremental redraw, storyboard grids, beat views, timelines, and call sheets.
- Export storyboard sheets, production CSV files, and prompts for multiple video engines.

### 03 · Theater and Review

- Preview one episode or the full series in a cinema-style player.
- Diagnose missing shot data, acoustic profiles, locations, props, timing, and continuity risks.
- Track pending, generating, review, rejected, and adopted states in the Production Kanban.
- Count visual and audio takes separately so speech assets never appear as finished video candidates.

### 04 · Delivery

- Export storyboard sheets, call sheets, model prompts, and project archives.
- Submit video jobs, poll providers, recover media to R2, review candidates, and adopt takes.
- Create edit versions with full and per-episode MP4 files, SRT subtitles, and a delivery manifest.
- Use all four stages on mobile; the Kanban stacks its shot list and take details for narrow screens.

## AI video and speech

- **Video:** Provider tasks support submission, polling, R2 recovery, review, and adoption. Vertical projects can require a 9:16 first frame before paid generation.
- **Speech/TTS:** The Settings UI exposes configurable OpenRouter `speech` models plus default female, male, and narrator voices. Per-line overrides remain available in production.
- **Audio versions:** TTS results are stored as Audio Takes and can be previewed, adopted, rejected, or restored. Adopted audio can be remixed into final MP4 deliveries.
- **Cost integrity:** The ledger records a charge only when the provider supplies real billing data. Unknown charges remain explicitly incomplete.

## Deployed three-episode acceptance sample

The live project *The Second Key · Three-Episode Production Acceptance* validates the production path with realistic data:

| Area | Verified result |
| --- | --- |
| Series | 3 episodes, 8 shots and 48 seconds each; 144 seconds total |
| Aspect ratio | 9:16 across dashboard, workspace, and delivery views |
| Structured assets | 2 characters, 2 locations, and 5 key props; every shot binds characters and a location |
| Real video | EP01 SHOT01 completed MiniMax generation, R2 recovery, and adoption |
| Speech | 23 Audio Takes in the Kanban; OpenRouter Chinese TTS generation, playback, R2 recovery, and adoption verified |
| Current delivery | `v1.2-current-voice`: full MP4, 3 episode MP4 files, 4 SRT files, and a manifest |
| Media | Full delivery is 720×1280 H.264 + AAC with an embedded `mov_text` subtitle track |

This is a **low-cost technical sample**. EP01 SHOT01 is real AI video; the remaining 23 shots use clearly labelled technical animatic cards. The project validates structure, speech, subtitles, editing, versioning, and delivery. It is not evidence of full-series visual quality.

See the [deployed end-to-end QA report](./.gstack/qa-reports/qa-report-storyboarding-caifu-social-2026-09-09.md) and [three-episode acceptance plan](./docs/short-drama-production-acceptance.md).

## Data, security, and media

- Cloudflare D1 stores authenticated project data; R2 stores images, video, audio, subtitles, and delivery artifacts.
- Project, shot, character, location, and prop routes enforce authentication and project ownership.
- User model keys are encrypted with AES-256-GCM and returned to the UI only as masked configuration state.
- R2 media endpoints support HTTP Range requests for playback, seeking, and partial reads.
- Production records retain provider task IDs, status, model, parameters, candidate takes, and adoption decisions.

## Architecture

| Layer | Technology | Role |
| --- | --- | --- |
| Web | Next.js 14, React 18, Tailwind CSS | Responsive director workspace and production UI |
| State | Zustand | Project, episode, shot, auth, and stage state |
| API | Hono on Cloudflare Workers | Auth, projects, generation, production, and delivery APIs |
| Data | Cloudflare D1, Drizzle ORM | Multi-tenant projects, jobs, and edit versions |
| Media | Cloudflare R2 | Storyboards, video, audio, subtitles, and deliveries |
| Models | OpenRouter, MiniMax, configurable image/video providers | Story analysis, image, video, and Speech/TTS |

## Local development

Node.js 22+ is recommended.

```bash
# Install dependencies
cd backend && npm install
cd ../frontend && npm install

# Terminal 1: start the Worker
cd backend && npm run dev

# Terminal 2: start the frontend
cd frontend && npm run dev
```

Default local endpoints:

- Frontend: http://localhost:3000
- Worker: http://localhost:8787

## Validation

```bash
# Frontend regression tests and production build
cd frontend
npm test
npm run build

# Backend type checking
cd ../backend
npx tsc --noEmit
```

The regression suite covers multi-episode ordering, shot-field preservation, speaker resolution, configured speech voices, concurrent generation protection, cost semantics, and delivery normalization. Provider availability, generation quality, and actual billing still require deployed-environment checks.

## Deployment

GitHub Actions deploy Cloudflare Pages and Workers based on changed paths. Manual deployment uses:

```bash
# Backend
cd backend
npm run deploy

# Frontend build
cd ../frontend
npm run build
```

A first deployment also requires D1 and R2 bindings plus Worker/Pages environment variables and secrets. Never commit model API keys, JWT secrets, or Cloudflare credentials.
