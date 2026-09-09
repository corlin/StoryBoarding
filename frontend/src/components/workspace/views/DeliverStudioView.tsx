"use client";

import React, { useState } from "react";
import { ProjectModel, ShotModel } from "@/types/shot";
import { exportStoryboardSheetToPng, renderStoryboardToBlob, renderSingleShotAiFrameBlob } from "@/lib/canvasExporter";
import { exportCallSheetToCsv, generateCallSheetCsvContent } from "@/lib/callSheetExporter";
import { generateAiVideoControlRigJson, generateAiVideoControlRigCsv } from "@/lib/aiVideoControlRig";
import { notify } from "@/components/ui/ToastNotification";
import { VIDEO_PROMPT_ENGINES, VideoEngineType } from "@/lib/videoPromptEngines";
import JSZip from "jszip";
import {
  Download,
  FileText,
  FileSpreadsheet,
  Film,
  Archive,
  Check,
  Copy,
  Loader2,
  Sparkles,
  Layers,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DeliverStudioViewProps {
  project: ProjectModel | null;
  shots?: ShotModel[];
  onOpenProductionKanban?: () => void;
}

export const DeliverStudioView: React.FC<DeliverStudioViewProps> = ({
  project,
  shots = [],
  onOpenProductionKanban,
}) => {
  const [exportScope, setExportScope] = useState<"current" | "all">("current");
  const [exportWithHud, setExportWithHud] = useState(true);
  const [isExportingPng, setIsExportingPng] = useState(false);
  const [selectedEngine, setSelectedEngine] = useState<VideoEngineType>("minimax_h3");
  const [isPromptCopied, setIsPromptCopied] = useState(false);
  const [isExportingZip, setIsExportingZip] = useState(false);
  const [zipProgressText, setZipProgressText] = useState("");

  if (!project) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground text-xs">
        暂无工程数据
      </div>
    );
  }

  const allShots = (project.sequences || []).flatMap((seq) => seq.shots || []);
  const activeShots = exportScope === "all" && allShots.length > 0 ? allShots : shots;

  // 1. Export Storyboard Sheet (PNG)
  const handleExportPng = async () => {
    if (activeShots.length === 0) {
      notify.error("暂无可导出的分镜数据");
      return;
    }
    setIsExportingPng(true);
    try {
      await exportStoryboardSheetToPng(project, activeShots, {
        includeHud: exportWithHud,
      });
      notify.success("✅ 商业分镜长图已生成并启动下载！");
    } catch (err: any) {
      notify.error(`分镜长图导出失败: ${err.message || "请稍后重试"}`);
    } finally {
      setIsExportingPng(false);
    }
  };

  // 2. Export Call Sheet (CSV)
  const handleExportCsv = () => {
    if (activeShots.length === 0) {
      notify.error("暂无可导出的分镜数据");
      return;
    }
    try {
      exportCallSheetToCsv(
        project,
        activeShots,
        project.locations || [],
        project.characters || []
      );
      notify.success("✅ 制片场记通告单 CSV 已下载！");
    } catch (err: any) {
      notify.error(`场记单导出失败: ${err.message || "请稍后重试"}`);
    }
  };

  // 3. Multi-Engine Video Prompt Copy
  const handleCopyPrompt = () => {
    if (activeShots.length === 0) {
      notify.error("暂无可导出的分镜数据");
      return;
    }
    const engine = VIDEO_PROMPT_ENGINES.find((e) => e.id === selectedEngine) || VIDEO_PROMPT_ENGINES[0];
    try {
      const text = engine.generateText(activeShots, project);
      navigator.clipboard.writeText(text);
      setIsPromptCopied(true);
      notify.success(`✅ ${engine.name} 工业提示词包已复制到剪贴板！`);
      setTimeout(() => setIsPromptCopied(false), 2000);
    } catch (err: any) {
      notify.error("复制失败，请重试");
    }
  };

  // 4. Export All-in-One Lossless Master Package (Full ZIP Archive)
  const handleExportZip = async () => {
    if (activeShots.length === 0) {
      notify.error("暂无可导出的分镜数据");
      return;
    }
    setIsExportingZip(true);
    setZipProgressText("正在初始化工业母盘数据包...");

    try {
      const zip = new JSZip();
      const dateStr = new Date().toISOString().slice(0, 10);
      const safeTitle = (project.title || "storyboard").replace(/[\\/*?:"<>| \n\t\r,，。！!？"'“”]/g, "_");
      const rootFolder = zip.folder(`${safeTitle}_交付母盘包_${dateStr}`);

      // 0. AI Video Model Reference Keyframes with HUD Control Slate
      setZipProgressText(`正在渲染并烧录 ${activeShots.length} 镜 AI 视频对齐关键帧图集...`);
      const aiFramesFolder = rootFolder?.folder("00_AI视频生成全景参考图集_含机位运镜标识");
      const isVertical = project.aspect_ratio === "9:16";

      for (let idx = 0; idx < activeShots.length; idx++) {
        const shot = activeShots[idx];
        const shotIndexStr = String(idx + 1).padStart(3, "0");
        try {
          const frameBlob = await renderSingleShotAiFrameBlob(shot, idx, isVertical ? "9:16" : "16:9");
          aiFramesFolder?.file(`Shot_${shotIndexStr}_${shot.shot_size || "MS"}_${(shot.duration || 2.5).toFixed(1)}s_AI参考图.png`, frameBlob);
        } catch (fErr) {
          console.warn(`Failed to render frame for shot ${idx + 1}:`, fErr);
        }
      }

      // 0b. AI Video Generation Structured Control Rig (JSON + CSV) for Batch API Pipeline
      setZipProgressText("正在编译 AI 视频生成结构化控制指令清单 (JSON + CSV)...");
      const controlRigJson = generateAiVideoControlRigJson(activeShots, project);
      aiFramesFolder?.file("ai_video_generation_prompts.json", controlRigJson);
      const controlRigCsv = generateAiVideoControlRigCsv(activeShots, project);
      aiFramesFolder?.file("ai_video_control_rig.csv", controlRigCsv);

      // 1. Production Storyboard Sheet PNG
      setZipProgressText("正在渲染全案商业分镜长图...");
      try {
        const pngBlob = await renderStoryboardToBlob(project, activeShots, {
          includeHud: exportWithHud,
        });
        rootFolder?.file(`01_商业分镜打样表_${activeShots.length}镜.png`, pngBlob);
      } catch (pngErr) {
        console.warn("Skip PNG generation in zip:", pngErr);
      }

      // 2. Production Call Sheet CSV
      setZipProgressText("正在排版制片场记顺场表 CSV...");
      const csvContent = generateCallSheetCsvContent(
        project,
        activeShots,
        project.locations || [],
        project.characters || []
      );
      rootFolder?.file(`02_剧组制片通告顺场表_${activeShots.length}镜.csv`, csvContent);

      // 3. Multi-Engine AI Video Prompts Folder
      setZipProgressText("正在编译各平台 AI 视频提示词工程包 (MiniMax/SeaDance/Wan/Runway)...");
      const promptsFolder = rootFolder?.folder("03_AI视频提示词工程包");
      VIDEO_PROMPT_ENGINES.forEach((eng) => {
        const promptText = eng.generateText(activeShots, project);
        promptsFolder?.file(`${eng.name.replace(/[^\w\u4e00-\u9fa5]/g, "_")}_提示词清单.txt`, promptText);
      });

      // 4. Lossless Master Project JSON
      setZipProgressText("正在写入全案拓扑母盘数据与资产索引...");
      const masterMetadata = {
        project_title: project.title,
        exported_at: new Date().toISOString(),
        studio_engine: "StoryBoarding AI Director Studio v2.1",
        scope: exportScope,
        shots_count: activeShots.length,
        project,
        shots: activeShots,
      };
      rootFolder?.file("04_全案工程母盘拓扑元数据.json", JSON.stringify(masterMetadata, null, 2));

      // 5. Readme / Delivery Manifest
      const manifest = `# ${project.title} · 工业级交付母盘说明文档 (Delivery Manifest)
导出时间: ${new Date().toLocaleString()}
总镜头数: ${activeShots.length} 镜
包含内容:
0. 00_AI视频生成全景参考图集_含机位运镜标识/
   - Shot_XXX_*.png: 每个镜头的独立超清关键帧图（已烧录九宫格、机位序号、景别、运镜矢量与台词语义），直接喂入 MiniMax / SeaDance / Wan 2.1 等大模型作为首帧与对齐基准
   - ai_video_generation_prompts.json: 结构化 AI 视频生成 Prompt 清单（含中英双语提示词、运镜矢量、景别、时长、负向提示词），可被自动化管线直接读取批量调用 API
   - ai_video_control_rig.csv: 扁平表格版控制指令（兼容 Excel / pandas / Google Sheets），每行一镜，包含全部 API 所需参数
1. 01_商业分镜打样表.png - 高清景别/运镜/对白排版长图 (Previz Sheet)
2. 02_剧组制片通告顺场表.csv - 影视制片排期、空间灯光与出场演员统计表
3. 03_AI视频提示词工程包/ - 适配 MiniMax 海螺 H3、剪映 SeaDance 2.5、Wan 2.1、Runway/可灵 的机位提示词
4. 04_全案工程母盘拓扑元数据.json - 包含剧本、人物设定卡、场景光影与分镜时码的无损归档数据

Generated by StoryBoarding AI Studio.`;
      rootFolder?.file("README_交付说明.txt", manifest);

      // Generate ZIP and trigger instant download
      setZipProgressText("正在封包生成 ZIP 归档文件...");
      const zipContent = await zip.generateAsync({
        type: "blob",
        compression: "DEFLATE",
        compressionOptions: { level: 6 },
      });

      const url = URL.createObjectURL(zipContent);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${safeTitle}_全案工业母盘包_${dateStr}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      notify.success("🎉 全要素工业交付母盘 ZIP 已一键封包并启动下载！");
    } catch (err: any) {
      console.error(err);
      notify.error(`母盘打包失败: ${err.message || "请稍后重试"}`);
    } finally {
      setIsExportingZip(false);
      setZipProgressText("");
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden">
      {/* Studio Header Bar */}
      <div className="h-12 border-b border-border/70 bg-card/60 px-4 md:px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-md bg-primary/10 text-primary border border-primary/20">
            <Download className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xs md:text-sm font-bold text-foreground">
                STAGE 04 · 工业级交付与导出看板 (Deliver Suite)
              </h2>
              <span className="text-[10px] px-1.5 py-0.2 rounded font-mono bg-primary/15 text-primary border border-primary/30 font-bold">
                标准工业规格
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground hidden sm:block">
              一键输出符合影视剧组工业标准的分镜长图、场记单、模型提示词包与原画母盘
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-secondary/70 p-0.5 rounded-lg border border-border text-xs">
            <button
              type="button"
              onClick={() => setExportScope("current")}
              className={cn(
                "px-2.5 py-1 rounded-md transition-all font-medium cursor-pointer",
                exportScope === "current" ? "bg-card text-foreground font-bold shadow-xs" : "text-muted-foreground hover:text-foreground"
              )}
            >
              当前集 ({shots.length} 镜)
            </button>
            <button
              type="button"
              onClick={() => setExportScope("all")}
              className={cn(
                "px-2.5 py-1 rounded-md transition-all font-medium cursor-pointer",
                exportScope === "all" ? "bg-card text-foreground font-bold shadow-xs" : "text-muted-foreground hover:text-foreground"
              )}
            >
              全剧工程 ({allShots.length || shots.length} 镜)
            </button>
          </div>
        </div>
      </div>

      {/* Main Studio Body: Deliverables Matrix (Left 65%) + Config Panel (Right 35%) */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Column: Deliverables Matrix Cards */}
        <div className="flex-1 lg:w-2/3 overflow-y-auto p-4 md:p-6 space-y-4">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-primary" />
            <span>可选交付物规格清单 (Deliverable Assets)</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Card 1: Storyboard Sheet (PNG/PDF) */}
            <div className="p-4 rounded-xl bg-card border border-border/80 hover:border-primary/50 transition-all shadow-xs space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
                    <FileText className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-300 font-bold">
                    PNG / PDF
                  </span>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-foreground">商业导演分镜表 (Storyboard Sheet)</h4>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    高清水印排版长图，标注景别、机位运镜、台词与镜头时长，适用于提案与现场监看。
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleExportPng}
                disabled={isExportingPng}
                className="w-full py-2 px-3 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
              >
                {isExportingPng ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                <span>生成高清分镜表长图</span>
              </button>
            </div>

            {/* Card 2: Production Call Sheet (CSV) */}
            <div className="p-4 rounded-xl bg-card border border-border/80 hover:border-primary/50 transition-all shadow-xs space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 font-bold">
                    CSV / Excel
                  </span>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-foreground">制片通告单与场记表 (Call Sheet)</h4>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    结构化汇总演员出场场次、场景道具分布与时长排期，方便制片团队现场统筹。
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleExportCsv}
                className="w-full py-2 px-3 rounded-lg text-xs font-semibold bg-secondary hover:bg-secondary/80 text-foreground border border-border transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Download className="w-3.5 h-3.5 text-muted-foreground" />
                <span>导出通告场记表 (CSV)</span>
              </button>
            </div>

            {/* Card 3: AI Video Generation Prompt Package (Multi-Engine) */}
            <div className="p-4 rounded-xl bg-card border border-border/80 hover:border-primary/50 transition-all shadow-xs space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
                    <Film className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-300 font-bold">
                    多模型兼容
                  </span>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-foreground">AI 视频引擎提示词包 (Prompt Package)</h4>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    结构化输出符合海螺 H3、剪映 SeaDance 2.5、阿里 Wan 2.1、Runway/可灵语法的机位提示词。
                  </p>
                </div>

                {/* Model Engine Selector */}
                <div className="pt-1">
                  <label className="text-[10px] font-semibold text-muted-foreground block mb-1">
                    选择适配的生成模型语法规范:
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {VIDEO_PROMPT_ENGINES.map((eng) => (
                      <button
                        key={eng.id}
                        type="button"
                        onClick={() => setSelectedEngine(eng.id)}
                        className={cn(
                          "px-2 py-1 rounded text-left text-[11px] font-medium border transition-all truncate flex items-center justify-between",
                          selectedEngine === eng.id
                            ? "bg-purple-500/20 border-purple-500/50 text-purple-200 shadow-2xs font-bold"
                            : "bg-secondary/40 border-border/60 text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <span className="truncate">{eng.name}</span>
                        <span className="text-[9px] font-mono opacity-70 ml-1">{eng.tag}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCopyPrompt}
                className="w-full py-2 px-3 rounded-lg text-xs font-semibold bg-secondary hover:bg-secondary/80 text-foreground border border-border transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                {isPromptCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
                <span>{isPromptCopied ? "已复制提示词清单" : `复制 ${VIDEO_PROMPT_ENGINES.find((e) => e.id === selectedEngine)?.name} 提示词`}</span>
              </button>
            </div>

            {/* Card 4: Lossless Master Archive (ZIP Package) */}
            <div className="p-4 rounded-xl bg-card border border-border/80 hover:border-primary/50 transition-all shadow-xs space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <Archive className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 font-bold">
                    ZIP 全包归档
                  </span>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-foreground">全案工业交付母盘 (Master Archive)</h4>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    一键打包分镜长图 (PNG)、顺场表 (CSV)、四大模型提示词工程包 (TXT) 与全案母盘元数据 (JSON)。
                  </p>
                </div>
                {zipProgressText && (
                  <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300 flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                    <span className="truncate">{zipProgressText}</span>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={handleExportZip}
                disabled={isExportingZip}
                className="w-full py-2 px-3 rounded-lg text-xs font-semibold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
              >
                {isExportingZip ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Archive className="w-3.5 h-3.5 text-amber-400" />}
                <span>{isExportingZip ? "母盘封包压制中..." : "一键打包下载全要素母盘 ZIP"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Configuration & Status Monitor */}
        <div className="flex-1 lg:w-1/3 border-t lg:border-t-0 lg:border-l border-border/70 bg-card/30 p-4 md:p-6 space-y-5 overflow-y-auto">
          <div className="space-y-1">
            <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>交付资料检查</span>
            </h3>
            <p className="text-[11px] text-muted-foreground">
              以下统计图片引用；画面加载、图文匹配与连续性尚未审片。导出前请逐镜核对。
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="p-3.5 rounded-xl bg-card border border-border/70 space-y-2.5 shadow-2xs">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">镜头总计</span>
              <span className="font-mono font-bold text-foreground">{activeShots.length} 镜</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">有图片引用</span>
              <span className="font-mono font-bold text-emerald-400">
                {activeShots.filter((s) => s.storyboard_image_url?.trim()).length} / {activeShots.length}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">画幅比例</span>
              <span className="font-mono text-foreground font-semibold">{project.aspect_ratio || "16:9"}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">计划镜头总时长</span>
              <span className="font-mono text-foreground font-semibold">
                {activeShots.reduce((acc, s) => acc + (Number(s.duration) || 2), 0).toFixed(1)}s
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 space-y-2" role="status">
            <p className="text-xs text-emerald-300">
              本区导出分镜、通告单和提示词；完整 MP4、分集 MP4、配音与字幕在生产看板的“导出整集”中查看。
            </p>
            {onOpenProductionKanban && (
              <button
                type="button"
                onClick={onOpenProductionKanban}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-500"
              >
                <Film className="h-3.5 w-3.5" />
                查看完整成片与字幕
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Configuration Options */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold text-foreground">排版与交付偏好</h4>

            <label className="flex items-center justify-between p-3 rounded-lg bg-card border border-border/70 cursor-pointer hover:bg-secondary/40 transition-colors">
              <div>
                <p className="text-xs font-semibold text-foreground">附带导演机位 HUD 水印</p>
                <p className="text-[11px] text-muted-foreground">在分镜长图上保留景别、运镜参数标注</p>
              </div>
              <input
                type="checkbox"
                checked={exportWithHud}
                onChange={(e) => setExportWithHud(e.target.checked)}
                className="w-4 h-4 rounded text-primary focus:ring-primary"
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};
