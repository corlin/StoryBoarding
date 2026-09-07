"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  X,
  Sparkles,
  Download,
  Film,
  Layers,
  SlidersHorizontal,
  Compass,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  BookOpen,
  Clapperboard,
  Tv,
  FileCode2,
  Palette,
  Eye,
  Workflow,
  Zap,
  Clock,
  Sparkle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { notify } from "@/components/ui/ToastNotification";

export interface SystemArchitectureMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Module Launch Handlers
  onOpenRadar?: () => void;
  onOpenBible?: (mode?: "bible" | "style") => void;
  onOpenTradeoff?: () => void;
  onOpenImportScript?: () => void;
  onOpenAIGenerate?: () => void;
  onOpenTheater?: () => void;
  onOpenExport?: () => void;
  onOpenTour?: () => void;
  onSelectViewMode?: (mode: "grid" | "callsheet") => void;
}

interface StageDetail {
  id: number;
  stageCode: string;
  title: string;
  phaseId: number;
  phaseName: string;
  badge: string;
  badgeColor: string;
  summary: string;
  inputDesc: string;
  aiCapabilities: string[];
  outputDesc: string;
  actionText?: string;
  actionHandler?: () => void;
}

export const SystemArchitectureMapModal: React.FC<SystemArchitectureMapModalProps> = ({
  isOpen,
  onClose,
  onOpenRadar,
  onOpenBible,
  onOpenTradeoff,
  onOpenImportScript,
  onOpenAIGenerate,
  onOpenTheater,
  onOpenExport,
  onOpenTour,
  onSelectViewMode,
}) => {
  const [selectedStageId, setSelectedStageId] = useState<number>(1);

  // Keyboard navigation & escape listener
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const STAGES: StageDetail[] = [
    {
      id: 1,
      stageCode: "STAGE 01",
      title: "大纲改编与爽点雷达工作室",
      phaseId: 1,
      phaseName: "阶段一 · 前期筹备与视听基准",
      badge: "核心抽核 & 雷达门控",
      badgeColor: "border-emerald-500/30 text-emerald-400 bg-emerald-500/10",
      summary: "从万字长篇或网络大纲中提炼核心戏剧对抗，四象限过滤剧情水分，并通过 Gate 2 爽点节拍算法严控全剧节奏断崖。",
      inputDesc: "网文长篇小说 / 故事梗概 / 商业剧本大纲 (万字级自动抽核与矛盾提取)",
      aiCapabilities: [
        "四象限结构取舍 (保留高光、砍掉说教、合并角色、预警制作风险)",
        "Gate 2 爽点节拍门控 (强制 maxBeatGap ≤ 3 集，杜绝冷场断流)",
        "一键智能推演并填补真空期爽点高潮",
        "生成标准化剧本围读会审通告 (Markdown 格式)",
      ],
      outputDesc: "多集结构化剧情节拍树 · 爽点雷达诊断评估分 · 会审通告文件",
      actionText: "打开爽点雷达与改编工作台",
      actionHandler: () => {
        onClose();
        if (onOpenRadar) onOpenRadar();
        else if (onOpenTradeoff) onOpenTradeoff();
      },
    },
    {
      id: 2,
      stageCode: "STAGE 02",
      title: "剧组前期视觉设定集 (Visual Bible)",
      phaseId: 1,
      phaseName: "阶段一 · 前期筹备与视听基准",
      badge: "单一真实源 & 视觉DNA",
      badgeColor: "border-sky-500/30 text-sky-400 bg-sky-500/10",
      summary: "作为全剧 Single Source of Truth，沉淀角色、场景与道具的视觉 DNA 提示词基准，解决跨镜头跨集漂移与换脸痛点。",
      inputDesc: "全剧主要登场角色 / 核心地理场景 / 关键手持与家具道具",
      aiCapabilities: [
        "角色定妆档案 (16:9 特写/全身/动态姿势三区定妆图 + 纯英文 Visual DNA)",
        "场景空间锚点 (固化建筑透视灭点，日景/夜戏光影变体，3-5处实物锚点)",
        "道具特写规范 (手持级、桌面级、家具级三级尺度与开/合/破损状态)",
        "4套好莱坞导演画风矩阵切换 (王家卫、古典国风、赛博暗黑、现代商业)",
      ],
      outputDesc: "剧组视听设定集 Bible · 跨镜头绘图自动注入的视觉基准模型",
      actionText: "打开剧组视觉设定集 (Bible)",
      actionHandler: () => {
        onClose();
        if (onOpenBible) onOpenBible("bible");
      },
    },
    {
      id: 3,
      stageCode: "STAGE 03",
      title: "文学母本与分镜双向自愈工作台",
      phaseId: 2,
      phaseName: "阶段二 · 中期创作与制片排期",
      badge: "剧本即代码 & 双向自愈",
      badgeColor: "border-indigo-500/30 text-indigo-400 bg-indigo-500/10",
      summary: "左侧文学剧本流与右侧分镜头毫秒级增量联动。单句超 35 字符自动亮黄防说教，改动原位脏状态自愈，保留已确认镜头。",
      inputDesc: "结构化文学台词与动作节拍",
      aiCapabilities: [
        "双栏响应式联动 (左文学流 ➔ 右分镜状态树毫秒级增量同步)",
        "短剧呼吸感监控 (台词超过 35 字符自动黄色高亮警告，杜绝长篇说教)",
        "一节拍智能拆镜 (将单节拍智能一分为二，切分为景别互补的双镜头组合)",
        "增量脏状态检测 (仅标记改动关联镜头待重绘，支持原位原图快速重冲印)",
      ],
      outputDesc: "可执行分镜状态树 (Executable State Tree) · 毫秒级双向自愈",
      actionText: "进入双栏自愈工作台",
      actionHandler: () => {
        onClose();
        if (onSelectViewMode) onSelectViewMode("grid");
      },
    },
    {
      id: 4,
      stageCode: "STAGE 04",
      title: "故事板画板与机位 HUD 工坊",
      phaseId: 2,
      phaseName: "阶段二 · 中期创作与制片排期",
      badge: "多画幅适配 & 运镜HUD",
      badgeColor: "border-amber-500/30 text-amber-400 bg-amber-500/10",
      summary: "专业故事板网格工坊，支持 4:3、16:9 与 9:16 短剧画幅自由切换，搭载景别运镜 HUD 参数与单镜锁定保护。",
      inputDesc: "分镜头画面序列与机位属性",
      aiCapabilities: [
        "多模态比例切换 (9:16 竖屏短剧 / 16:9 电影横屏 / 4:3 经典比例)",
        "镜头 HUD 参数矩阵 (特写/中景/全景景别、推/拉/摇/移/升降运镜参数)",
        "单镜锁定防护 (Lock Guard，支持单镜锁定保护或一键全选锁定/解锁)",
        "抽屉式深度调镜工坊 (微调台词、色温氛围、视线对齐与重新冲印)",
      ],
      outputDesc: "视觉化故事板九宫格画板 · 精细化机位控制参数",
      actionText: "浏览故事板网格画板",
      actionHandler: () => {
        onClose();
        if (onSelectViewMode) onSelectViewMode("grid");
      },
    },
    {
      id: 5,
      stageCode: "STAGE 05",
      title: "顺场表制片管理 (Call Sheet)",
      phaseId: 2,
      phaseName: "阶段二 · 中期创作与制片排期",
      badge: "智能排期 & 视频编译器",
      badgeColor: "border-emerald-500/30 text-emerald-400 bg-emerald-500/10",
      summary: "按「空间地点 + 光影氛围」聚类归并生产批次（B1, B2...），统计每批时长与镜数，一键导出 CSV 与 Hailuo H3 连贯视频指令。",
      inputDesc: "分镜空间地点、日夜戏与光影标注",
      aiCapabilities: [
        "地点光影智能聚类 (将同一场景日景/夜戏分镜自动聚类为连拍生产批次)",
        "MiniMax Hailuo H3 多模态视频提示词一键生成并复制",
        "可灵 Kling / Runway 运镜连贯性指令编译",
        "标准剧组制片排期表 (CSV / Excel) 秒级格式化导出",
      ],
      outputDesc: "剧组顺场拍摄排期表 (CSV) · 多模态视频生成连贯指令集合",
      actionText: "切换至顺场表制片视图",
      actionHandler: () => {
        onClose();
        if (onSelectViewMode) onSelectViewMode("callsheet");
      },
    },
    {
      id: 6,
      stageCode: "STAGE 06",
      title: "好莱坞级放映影院 (Cinema Theater)",
      phaseId: 3,
      phaseName: "阶段三 · 预演审片与工业交付",
      badge: "纯黑场预演 & 声画同步",
      badgeColor: "border-rose-500/30 text-rose-400 bg-rose-500/10",
      summary: "全屏纯净黑场动态预演，搭载 Ken Burns 运镜动态视差与台词打字机字幕对齐，以 0 拍摄成本验证全片节奏。",
      inputDesc: "已完成分镜头序列与对白节奏",
      aiCapabilities: [
        "Ken Burns 运镜动态视差渲染 (模拟真实摄影机缓慢推拉摇移视差)",
        "多模态台词打字机字幕与画面毫秒级精确同步",
        "好莱坞级分段胶囊进度条 (Segmented Scrubber 直观指引镜号与单镜流速)",
        "导演键盘快捷键操盘 (Space播放、左右方向键快速切镜、C打字机开关、B连播)",
      ],
      outputDesc: "沉浸式黑场动态动态样片试映 · 退出时精准反选高亮工作台对应镜头",
      actionText: "启动好莱坞放映厅试映",
      actionHandler: () => {
        onClose();
        if (onOpenTheater) onOpenTheater();
      },
    },
    {
      id: 7,
      stageCode: "STAGE 07",
      title: "工业级制片交付物分卷打包",
      phaseId: 3,
      phaseName: "阶段三 · 预演审片与工业交付",
      badge: "5大交付物 & 全量归档",
      badgeColor: "border-purple-500/30 text-purple-400 bg-purple-500/10",
      summary: "提供 16:9 PNG 打样单、Markdown 分卷台本、Midjourney 总控词、可灵 Kling 视频清单与全工程资产 ZIP 压缩包。",
      inputDesc: "全工程所有集数、分镜高清图纸与制片元数据",
      aiCapabilities: [
        "16:9 故事板工作草图打样单 (PNG Draft 客户端 Canvas 秒级离线合成)",
        "导演多集分卷分镜头工业台本 (Markdown 格式，含集尾卡点与片长汇总)",
        "Midjourney / DALL-E 3 导演全局总控提示词 (Global Prompt)",
        "可灵 Kling / Runway Gen-3 视频生成清单 (AI Video Manifest)",
        "制片工程全量资产打包 (ZIP Archive 按集数子目录归档全部分辨率素材)",
      ],
      outputDesc: "标准化 5 大工业级交付物 · 直接提交出品人与线下实拍剧组",
      actionText: "打开交付物导出中心",
      actionHandler: () => {
        onClose();
        if (onOpenExport) onOpenExport();
      },
    },
  ];

  const activeStage = STAGES.find((s) => s.id === selectedStageId) || STAGES[0];

  const handleDownloadMap = () => {
    // Trigger download of the SVG architecture map
    const link = document.createElement("a");
    link.href = "/assets/system_architecture_map.svg";
    link.download = `StoryBoarding_系统全景架构与工作流导图_${new Date().toISOString().slice(0, 10)}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    notify.success("🗺️ 全局功能引导地图 (2K 矢量 SVG) 已触发下载！");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="relative w-full max-w-7xl max-h-[94vh] flex flex-col rounded-2xl bg-zinc-950 border border-zinc-800 shadow-2xl shadow-black/90 overflow-hidden">
        {/* ================= MODAL HEADER ================= */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/80 bg-zinc-900/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 via-amber-500/10 to-transparent border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner">
              <Workflow className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">
                  全局功能引导地图 · 商业短剧制片工作流全景
                </h2>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                  7大工序闭环
                </span>
                <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-zinc-800 text-zinc-300 border border-zinc-700">
                  剧本即代码
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                从文学抽核、视觉设定集到双向自愈工作台、顺场表排期、放映预演与5大资产分卷交付
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenTour && (
              <button
                onClick={() => {
                  onClose();
                  onOpenTour();
                }}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition-all"
                title="启动界面交互漫游向导"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>新手漫游向导</span>
              </button>
            )}

            <button
              onClick={handleDownloadMap}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-200 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-zinc-600 transition-all"
              title="下载高清 2K 架构图矢量文件"
            >
              <Download className="w-3.5 h-3.5 text-zinc-300" />
              <span className="hidden sm:inline">下载高清架构图</span>
              <span className="sm:hidden">下载</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ================= MODAL BODY: PIPELINE OVERVIEW ================= */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Three Phases Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* PHASE 1: PRE-PRODUCTION */}
            <div className="flex flex-col rounded-xl bg-zinc-900/40 border border-emerald-500/20 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-emerald-950/40 to-transparent border-b border-emerald-500/20">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded text-[11px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                    P1
                  </span>
                  <span className="text-sm font-bold text-emerald-400">阶段一 · 前期筹备与视听基准</span>
                </div>
                <span className="text-[10px] text-emerald-500/80 uppercase font-mono tracking-wider">Pre-Production</span>
              </div>

              <div className="p-3 space-y-3 flex-1 flex flex-col justify-between">
                {/* Stage 01 */}
                <div
                  onClick={() => setSelectedStageId(1)}
                  className={cn(
                    "cursor-pointer rounded-lg p-3.5 border transition-all relative",
                    selectedStageId === 1
                      ? "bg-emerald-950/30 border-emerald-500 shadow-md shadow-emerald-950/50"
                      : "bg-zinc-900/60 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900"
                  )}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-mono font-bold tracking-wider text-emerald-400">STAGE 01</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                      雷达诊断
                    </span>
                  </div>
                  <h4 className="text-sm font-semibold text-white">大纲改编与爽点雷达工作室</h4>
                  <p className="text-xs text-zinc-400 mt-1 line-clamp-2">
                    四象限结构取舍（保留/砍掉/合并/风险），Gate 2 爽点真空间隔强制 ≤ 3集。
                  </p>
                  <div className="mt-2.5 flex items-center justify-between text-[11px] text-zinc-500">
                    <span>产出：会审通告 · 剧情节拍树</span>
                    <span className="text-emerald-400 flex items-center gap-0.5">
                      详情 <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>

                {/* Stage 02 */}
                <div
                  onClick={() => setSelectedStageId(2)}
                  className={cn(
                    "cursor-pointer rounded-lg p-3.5 border transition-all relative",
                    selectedStageId === 2
                      ? "bg-sky-950/30 border-sky-500 shadow-md shadow-sky-950/50"
                      : "bg-zinc-900/60 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900"
                  )}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-mono font-bold tracking-wider text-sky-400">STAGE 02</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-300 border border-sky-500/20">
                      单一真实源
                    </span>
                  </div>
                  <h4 className="text-sm font-semibold text-white">剧组前期视觉设定集 (Visual Bible)</h4>
                  <p className="text-xs text-zinc-400 mt-1 line-clamp-2">
                    16:9 角色 DNA 锁脸、场景空间光影锚点、道具尺度与4大导演风格矩阵。
                  </p>
                  <div className="mt-2.5 flex items-center justify-between text-[11px] text-zinc-500">
                    <span>产出：Character DNA · 空间锚点</span>
                    <span className="text-sky-400 flex items-center gap-0.5">
                      详情 <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* PHASE 2: PRODUCTION & SCHEDULING */}
            <div className="flex flex-col rounded-xl bg-zinc-900/40 border border-indigo-500/20 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-indigo-950/40 to-transparent border-b border-indigo-500/20">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded text-[11px] font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/40">
                    P2
                  </span>
                  <span className="text-sm font-bold text-indigo-400">阶段二 · 中期创作与制片排期</span>
                </div>
                <span className="text-[10px] text-indigo-500/80 uppercase font-mono tracking-wider">Production</span>
              </div>

              <div className="p-3 space-y-3 flex-1 flex flex-col justify-between">
                {/* Stage 03 */}
                <div
                  onClick={() => setSelectedStageId(3)}
                  className={cn(
                    "cursor-pointer rounded-lg p-3.5 border transition-all relative",
                    selectedStageId === 3
                      ? "bg-indigo-950/30 border-indigo-500 shadow-md shadow-indigo-950/50"
                      : "bg-zinc-900/60 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900"
                  )}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-mono font-bold tracking-wider text-indigo-400">STAGE 03</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                      双向自愈
                    </span>
                  </div>
                  <h4 className="text-sm font-semibold text-white">文学母本与分镜双向自愈工作台</h4>
                  <p className="text-xs text-zinc-400 mt-1 line-clamp-2">
                    双栏毫秒级协同、35字呼吸感防说教警告、一键拆镜与脏状态原位重绘。
                  </p>
                  <div className="mt-2.5 flex items-center justify-between text-[11px] text-zinc-500">
                    <span>产出：分镜状态树 · 增量修复</span>
                    <span className="text-indigo-400 flex items-center gap-0.5">
                      详情 <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>

                {/* Sub-grid for Stage 04 and 05 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Stage 04 */}
                  <div
                    onClick={() => setSelectedStageId(4)}
                    className={cn(
                      "cursor-pointer rounded-lg p-3 border transition-all relative",
                      selectedStageId === 4
                        ? "bg-amber-950/30 border-amber-500 shadow-md shadow-amber-950/50"
                        : "bg-zinc-900/60 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900"
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-mono font-bold text-amber-400">STAGE 04</span>
                      <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                        画板
                      </span>
                    </div>
                    <h4 className="text-xs font-semibold text-white line-clamp-1">故事板网格与HUD</h4>
                    <p className="text-[11px] text-zinc-400 mt-0.5 line-clamp-2">
                      9:16/16:9 画幅、景别运镜参数与单镜防误触锁定。
                    </p>
                  </div>

                  {/* Stage 05 */}
                  <div
                    onClick={() => setSelectedStageId(5)}
                    className={cn(
                      "cursor-pointer rounded-lg p-3 border transition-all relative",
                      selectedStageId === 5
                        ? "bg-emerald-950/30 border-emerald-500 shadow-md shadow-emerald-950/50"
                        : "bg-zinc-900/60 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900"
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-mono font-bold text-emerald-400">STAGE 05</span>
                      <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                        排期
                      </span>
                    </div>
                    <h4 className="text-xs font-semibold text-white line-clamp-1">顺场表制片管理</h4>
                    <p className="text-[11px] text-zinc-400 mt-0.5 line-clamp-2">
                      地点光影批次归并、Hailuo H3 视频指令与 CSV 导出。
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* PHASE 3: POST-PRODUCTION & ASSETS */}
            <div className="flex flex-col rounded-xl bg-zinc-900/40 border border-rose-500/20 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-rose-950/40 to-transparent border-b border-rose-500/20">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded text-[11px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/40">
                    P3
                  </span>
                  <span className="text-sm font-bold text-rose-400">阶段三 · 预演审片与工业交付</span>
                </div>
                <span className="text-[10px] text-rose-500/80 uppercase font-mono tracking-wider">Delivery</span>
              </div>

              <div className="p-3 space-y-3 flex-1 flex flex-col justify-between">
                {/* Stage 06 */}
                <div
                  onClick={() => setSelectedStageId(6)}
                  className={cn(
                    "cursor-pointer rounded-lg p-3.5 border transition-all relative",
                    selectedStageId === 6
                      ? "bg-rose-950/30 border-rose-500 shadow-md shadow-rose-950/50"
                      : "bg-zinc-900/60 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900"
                  )}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-mono font-bold tracking-wider text-rose-400">STAGE 06</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-300 border border-rose-500/20">
                      动态试映
                    </span>
                  </div>
                  <h4 className="text-sm font-semibold text-white">好莱坞级放映影院 (Cinema Theater)</h4>
                  <p className="text-xs text-zinc-400 mt-1 line-clamp-2">
                    纯黑场大屏预演、Ken Burns 动效、打字机台词字幕与好莱坞胶囊进度条。
                  </p>
                  <div className="mt-2.5 flex items-center justify-between text-[11px] text-zinc-500">
                    <span>产出：全屏预演 · 0成本声画对齐</span>
                    <span className="text-rose-400 flex items-center gap-0.5">
                      详情 <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>

                {/* Stage 07 */}
                <div
                  onClick={() => setSelectedStageId(7)}
                  className={cn(
                    "cursor-pointer rounded-lg p-3.5 border transition-all relative",
                    selectedStageId === 7
                      ? "bg-purple-950/30 border-purple-500 shadow-md shadow-purple-950/50"
                      : "bg-zinc-900/60 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900"
                  )}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-mono font-bold tracking-wider text-purple-400">STAGE 07</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20">
                      全量交付
                    </span>
                  </div>
                  <h4 className="text-sm font-semibold text-white">工业级制片交付物分卷打包</h4>
                  <p className="text-xs text-zinc-400 mt-1 line-clamp-2">
                    16:9 PNG 打样单、Markdown 分卷台本、Midjourney 提示词、可灵清单与 ZIP 归档。
                  </p>
                  <div className="mt-2.5 flex items-center justify-between text-[11px] text-zinc-500">
                    <span>产出：5大工业交付物 · ZIP 打包</span>
                    <span className="text-purple-400 flex items-center gap-0.5">
                      详情 <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ================= SELECTED STAGE DETAIL INSPECTOR ================= */}
          <div className="rounded-xl bg-zinc-900/70 border border-zinc-800 p-4 sm:p-5 relative overflow-hidden">
            <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-amber-500/5 blur-3xl pointer-events-none" />

            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                    {activeStage.stageCode}
                  </span>
                  <span className="text-xs text-zinc-400">{activeStage.phaseName}</span>
                  <span className={cn("text-xs px-2 py-0.5 rounded border font-medium", activeStage.badgeColor)}>
                    {activeStage.badge}
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-bold text-white">{activeStage.title}</h3>
                <p className="text-xs text-zinc-300 max-w-3xl">{activeStage.summary}</p>
              </div>

              {activeStage.actionHandler && (
                <button
                  onClick={activeStage.actionHandler}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-zinc-950 bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 hover:from-amber-300 hover:to-amber-500 shadow-lg shadow-amber-500/20 transition-all shrink-0"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{activeStage.actionText || "立即打开此模块"}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Tri-column I/O Specs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 text-xs">
              {/* Input */}
              <div className="rounded-lg bg-zinc-950/60 border border-zinc-800/80 p-3.5 space-y-1.5">
                <div className="flex items-center gap-1.5 text-zinc-400 font-semibold">
                  <span>📥</span>
                  <span>前置制片输入</span>
                </div>
                <p className="text-zinc-300 leading-relaxed">{activeStage.inputDesc}</p>
              </div>

              {/* AI Capabilities */}
              <div className="rounded-lg bg-zinc-950/60 border border-zinc-800/80 p-3.5 space-y-1.5">
                <div className="flex items-center gap-1.5 text-amber-400 font-semibold">
                  <Zap className="w-3.5 h-3.5" />
                  <span>AI 导演协同能力</span>
                </div>
                <ul className="space-y-1 text-zinc-300">
                  {activeStage.aiCapabilities.map((cap, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-amber-500 shrink-0 mt-0.5">•</span>
                      <span>{cap}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Output */}
              <div className="rounded-lg bg-zinc-950/60 border border-zinc-800/80 p-3.5 space-y-1.5">
                <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                  <span>📤</span>
                  <span>阶段输出与交付物</span>
                </div>
                <p className="text-zinc-300 leading-relaxed">{activeStage.outputDesc}</p>
              </div>
            </div>
          </div>

          {/* ================= BOTTOM AI CO-PILOT ENGINE BANNER ================= */}
          <div className="rounded-xl bg-zinc-900/30 border border-zinc-800 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <span className="text-xs font-bold text-amber-400 tracking-wide uppercase">
                  🧠 AI 导演协同中枢 (AI Director Co-pilot &amp; Production Engine)
                </span>
              </div>
              <span className="text-[11px] text-zinc-500">贯穿全流程四大智能支撑 · 替代繁复手动操作</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="p-2.5 rounded-lg bg-zinc-950/40 border border-zinc-800/60">
                <div className="font-semibold text-emerald-400 mb-1">01. 矛盾抽核与爽点风控</div>
                <div className="text-zinc-400 text-[11px]">
                  万字大纲长篇秒级抽核，四象限过滤冗余，Gate 2 算法杜绝剧情断流。
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-zinc-950/40 border border-zinc-800/60">
                <div className="font-semibold text-sky-400 mb-1">02. 视觉 DNA 与空间锁脸</div>
                <div className="text-zinc-400 text-[11px]">
                  16:9 角色 DNA，场景空间光影锚点，4套导演画风，杜绝跨镜头跳戏。
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-zinc-950/40 border border-zinc-800/60">
                <div className="font-semibold text-indigo-400 mb-1">03. 可执行状态树与自愈</div>
                <div className="text-zinc-400 text-[11px]">
                  双向联动，35字呼吸感预警，单节拍智能拆镜，改动台词原位增量冲印。
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-zinc-950/40 border border-zinc-800/60">
                <div className="font-semibold text-rose-400 mb-1">04. 制片排期与连贯视频指令</div>
                <div className="text-zinc-400 text-[11px]">
                  地点光影批次智能聚类，编译 Hailuo H3 与 Kling 连贯提示词，CSV 导出。
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ================= MODAL FOOTER ================= */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-zinc-800/80 bg-zinc-900/60 text-xs text-zinc-400 shrink-0">
          <div className="flex items-center gap-4">
            <span>💡 提示：按键盘 <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 font-mono text-zinc-200">M</kbd> 键可随时唤起此功能地图</span>
            <span className="hidden sm:inline text-zinc-600">|</span>
            <span className="hidden sm:inline">按 <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 font-mono text-zinc-200">Esc</kbd> 退出</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 transition-colors"
          >
            关闭导图
          </button>
        </div>
      </div>
    </div>
  );
};
