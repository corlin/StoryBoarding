"use client";

import React, { useState } from "react";
import { ProjectModel, ShotModel } from "@/types/shot";
import { exportStoryboardSheetToPng } from "@/lib/canvasExporter";
import { exportCallSheetToCsv } from "@/lib/callSheetExporter";
import { notify } from "@/components/ui/ToastNotification";
import { generateH3Prompt } from "@/lib/h3Prompt";
import { buildH3CutItem } from "@/hooks/useH3Prompt";
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
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DeliverStudioViewProps {
  project: ProjectModel | null;
  shots?: ShotModel[];
}

export const DeliverStudioView: React.FC<DeliverStudioViewProps> = ({
  project,
  shots = [],
}) => {
  const [exportScope, setExportScope] = useState<"current" | "all">("current");
  const [exportWithHud, setExportWithHud] = useState(true);
  const [isExportingPng, setIsExportingPng] = useState(false);
  const [isCopyingH3, setIsCopyingH3] = useState(false);
  const [isH3Copied, setIsH3Copied] = useState(false);
  const [isExportingZip, setIsExportingZip] = useState(false);

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

  // 3. Export H3 JSON / Copy
  const handleCopyH3Prompt = () => {
    if (activeShots.length === 0) {
      notify.error("暂无可导出的分镜数据");
      return;
    }
    setIsCopyingH3(true);
    try {
      const data = {
        project_title: project.title,
        timestamp: new Date().toISOString(),
        shots_count: activeShots.length,
        shots: activeShots.map((s, idx) => ({
          order: idx + 1,
          seconds: Number(s.duration) || 2.5,
          shot_size: s.shot_size,
          camera_movement: s.camera_movement?.type,
          h3_prompt: s.h3_prompt || generateH3Prompt([buildH3CutItem(s, idx + 1)], { lang: "en" }),
          dialogue: s.dialogue,
        })),
      };
      navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      setIsH3Copied(true);
      notify.success("✅ 海螺 H3 批量提示词清单已复制到剪贴板！");
      setTimeout(() => setIsH3Copied(false), 2000);
    } catch (err: any) {
      notify.error("复制失败");
    } finally {
      setIsCopyingH3(false);
    }
  };

  // 4. Export Lossless Master Package JSON
  const handleExportZip = async () => {
    if (activeShots.length === 0) {
      notify.error("暂无可导出的分镜数据");
      return;
    }
    setIsExportingZip(true);
    try {
      const exportData = {
        project,
        exported_at: new Date().toISOString(),
        shots: activeShots,
      };
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${project.title}_全案母盘数据包_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      notify.success("✅ 全案母盘数据包已导出！");
    } catch (err: any) {
      notify.error(`导出母盘失败: ${err.message || "请稍后重试"}`);
    } finally {
      setIsExportingZip(false);
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

            {/* Card 3: AI Video Generation Prompt Package (H3) */}
            <div className="p-4 rounded-xl bg-card border border-border/80 hover:border-primary/50 transition-all shadow-xs space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
                    <Film className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-300 font-bold">
                    MiniMax H3 / Runway
                  </span>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-foreground">AI 视频引擎提示词包 (Prompt Package)</h4>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    结构化输出符合海螺 H3、可灵、Runway 语法的机位动效、主体与场景连续性提示词。
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCopyH3Prompt}
                className="w-full py-2 px-3 rounded-lg text-xs font-semibold bg-secondary hover:bg-secondary/80 text-foreground border border-border transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                {isH3Copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
                <span>{isH3Copied ? "已复制提示词清单" : "复制海螺 H3 提示词清单"}</span>
              </button>
            </div>

            {/* Card 4: Lossless Master Archive */}
            <div className="p-4 rounded-xl bg-card border border-border/80 hover:border-primary/50 transition-all shadow-xs space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <Archive className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 font-bold">
                    JSON
                  </span>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-foreground">全案工程母盘包 (Master Archive)</h4>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    打包全案剧本、分镜拓扑元数据与全部高清资产引用，确保项目资产完整归档。
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleExportZip}
                disabled={isExportingZip}
                className="w-full py-2 px-3 rounded-lg text-xs font-semibold bg-secondary hover:bg-secondary/80 text-foreground border border-border transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
              >
                {isExportingZip ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Archive className="w-3.5 h-3.5 text-muted-foreground" />}
                <span>归档导出全案工程母盘</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Configuration & Status Monitor */}
        <div className="flex-1 lg:w-1/3 border-t lg:border-t-0 lg:border-l border-border/70 bg-card/30 p-4 md:p-6 space-y-5 overflow-y-auto">
          <div className="space-y-1">
            <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>交付前就绪状态监测</span>
            </h3>
            <p className="text-[11px] text-muted-foreground">
              检查分镜是否 100% 渲染显影，保障交付给客户或下层制作团队时零瑕疵
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="p-3.5 rounded-xl bg-card border border-border/70 space-y-2.5 shadow-2xs">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">镜头总计</span>
              <span className="font-mono font-bold text-foreground">{activeShots.length} 镜</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">已显影画面</span>
              <span className="font-mono font-bold text-emerald-400">
                {activeShots.filter((s) => s.storyboard_image_url).length} / {activeShots.length}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">画幅比例</span>
              <span className="font-mono text-foreground font-semibold">{project.aspect_ratio || "16:9"}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">目标总时长</span>
              <span className="font-mono text-foreground font-semibold">
                {activeShots.reduce((acc, s) => acc + (Number(s.duration) || 2), 0).toFixed(1)}s
              </span>
            </div>
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
