"use client";

import React, { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { normalizeAssetUrl } from "@/lib/api";
import {
  compareProductionShots,
  deriveDialogueLineFromShot,
  planVideoGeneration,
  productionMediaFileBase,
  productionShotLabel,
} from "@/lib/productionKanban";

interface ProductionKanbanModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectTitle: string;
}

type ShotStatus = "待生成" | "生成中" | "失败" | "待审" | "退回" | "已采用";

interface KanbanShot {
  shot_id: string;
  sequence_id: string;
  episode_number: number;
  episode_title: string;
  order: number;
  shot_size: string;
  duration: number;
  action: string;
  dialogue: string;
  status: ShotStatus;
  has_image: boolean;
  takes_count: number;
  visual_takes_count?: number;
  audio_takes_count?: number;
  pending_takes: number;
  adopted_take_id: string | null;
  latest_failure: string;
}

interface Take {
  id: string;
  shot_id: string;
  job_id: string | null;
  take_type: string;
  source: string;
  media_url: string;
  thumbnail_url: string;
  duration: number;
  review_status: string;
  rejection_reason: string;
  is_adopted: boolean;
  adopted_at: string | null;
  metadata: string;
  created_at: string;
}

interface VideoJob {
  id: string;
  status: string;
  provider: string;
  model: string;
  externalTaskId: string;
  failureReason: string;
  costAmount: number | null;
  costCurrency: string;
  createdAt: string;
  updatedAt: string;
}

interface EditVersion {
  id: string;
  version_tag: string;
  version_name: string;
  total_duration: number;
  is_current: boolean;
  created_at: string;
  export_result: {
    mp4_url?: string;
    srt_url?: string;
    manifest_url?: string;
    episode_mp4_urls?: string[];
    episode_srt_urls?: string[];
    subtitle_mode?: string;
  };
}

const STATUS_COLORS: Record<ShotStatus, string> = {
  "待生成": "#64748b",
  "生成中": "#3b82f6",
  "失败": "#ef4444",
  "待审": "#f59e0b",
  "退回": "#a855f7",
  "已采用": "#22c55e",
};

/** Parse SQLite datetime "YYYY-MM-DD HH:MM:SS" (no TZ) into a Date, falling back gracefully. */
function parseDbDate(s: string | null | undefined): Date | null {
  if (!s) return null;
  // SQLite returns "2026-09-08 11:45:24"; replace space with T for ISO parsing
  const iso = s.includes("T") ? s : s.replace(" ", "T");
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
}

function formatDbDate(s: string | null | undefined): string {
  const d = parseDbDate(s);
  return d ? d.toLocaleString() : "—";
}

export default function ProductionKanbanModal({ isOpen, onClose, projectId, projectTitle }: ProductionKanbanModalProps) {
  const [shots, setShots] = useState<KanbanShot[]>([]);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [projectAspectRatio, setProjectAspectRatio] = useState("9:16");
  const [selectedShot, setSelectedShot] = useState<KanbanShot | null>(null);
  const [takes, setTakes] = useState<Take[]>([]);
  const [videoJobs, setVideoJobs] = useState<VideoJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [takesLoading, setTakesLoading] = useState(false);
  const [generatingVideo, setGeneratingVideo] = useState(false);
  const [pollingJobId, setPollingJobId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<ShotStatus | "全部">("全部");
  const [rejectingTakeId, setRejectingTakeId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [uploadingShotId, setUploadingShotId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadKanban = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const res = await api.getProductionKanban(projectId);
      setShots((res.shots || []) as KanbanShot[]);
      setStatusCounts(res.status_counts || {});
      setProjectAspectRatio(res.project_aspect_ratio || "9:16");
    } catch (e: any) {
      showToast(`看板加载失败: ${e?.response?.data?.detail || e.message}`, "error");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const loadTakes = useCallback(async (shotId: string) => {
    setTakesLoading(true);
    try {
      const res = await api.getShotTakes(shotId);
      setTakes(res.takes || []);
    } catch (e: any) {
      showToast(`候选加载失败: ${e?.response?.data?.detail || e.message}`, "error");
    } finally {
      setTakesLoading(false);
    }
  }, []);

  const loadVideoJobs = useCallback(async (shotId: string) => {
    try {
      const res = await api.getVideoJobs(shotId);
      setVideoJobs(res.jobs || []);
    } catch (e: any) {
      showToast(`任务加载失败: ${e?.response?.data?.detail || e.message}`, "error");
    }
  }, []);

  // P0-4: Dialogue & timeline state
  const [activeRightTab, setActiveRightTab] = useState<"takes" | "dialogue">("takes");
  const [dialogueLines, setDialogueLines] = useState<any[]>([]);
  const [dialogueLoading, setDialogueLoading] = useState(false);
  const [newLine, setNewLine] = useState({ speaker: "", text: "", performance: "", planned_duration: 0 });

  // P0-6: Cost summary
  const [costData, setCostData] = useState<any>(null);
  const [editVersions, setEditVersions] = useState<EditVersion[]>([]);

  // P0-5: Export panel
  const [showExport, setShowExport] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [playerShotIndex, setPlayerShotIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const loadCosts = useCallback(async () => {
    if (!projectId) return;
    try {
      const res = await api.getCostSummary(projectId);
      setCostData(res);
    } catch (e: any) {
      console.warn("Cost load failed:", e?.message);
    }
  }, [projectId]);

  const loadEditVersions = useCallback(async () => {
    if (!projectId) return;
    try {
      const res = await api.getEditVersions(projectId);
      setEditVersions(res.edit_versions || []);
    } catch (e: any) {
      console.warn("Edit version load failed:", e?.message);
    }
  }, [projectId]);

  // P0-5: Get adopted takes in shot order for export
  const getExportSequence = useCallback(async () => {
    const adoptedShots = shots.filter((s) => s.adopted_take_id);
    const sequence: any[] = [];
    for (const shot of adoptedShots.sort(compareProductionShots)) {
      const res = await api.getShotTakes(shot.shot_id);
      const take = (res.takes || []).find((t: any) => t.id === shot.adopted_take_id);
      if (take) {
        sequence.push({ shot, take });
      }
    }
    return sequence;
  }, [shots]);

  const handleCreateEditVersion = async () => {
    setExporting(true);
    try {
      const sequence = await getExportSequence();
      const totalDuration = sequence.reduce((a, item) => a + (item.take.duration || 0), 0);
      await api.createEditVersion({
        project_id: projectId,
        version_tag: `v${Date.now()}`,
        version_name: `导出 ${new Date().toLocaleString()}`,
        assembly_data: {
          shots: sequence.map((item) => ({
            shot_id: item.shot.shot_id,
            sequence_id: item.shot.sequence_id,
            episode_number: item.shot.episode_number,
            order: item.shot.order,
            take_id: item.take.id,
            media_url: item.take.media_url,
            duration: item.take.duration,
            take_type: item.take.take_type,
          })),
        },
        total_duration: totalDuration,
        is_current: true,
      });
      await loadEditVersions();
      showToast(`已创建剪辑版本（${sequence.length}镜，${totalDuration.toFixed(1)}s）`);
    } catch (e: any) {
      showToast(`创建失败: ${e?.response?.data?.detail || e.message}`, "error");
    } finally {
      setExporting(false);
    }
  };

  const downloadFfmpegScript = async () => {
    const sequence = await getExportSequence();
    if (sequence.length === 0) {
      showToast("没有已采用的素材可导出", "error");
      return;
    }
    const lines = [
      "#!/bin/bash",
      "# FFmpeg concat script - run in a directory with the media files",
      `# Generated: ${new Date().toISOString()}`,
      `# Total: ${sequence.length} shots, ${sequence.reduce((a, i) => a + (i.take.duration || 0), 0).toFixed(1)}s`,
      "",
    ];
    sequence.forEach((item, i) => {
      const ext = item.take.take_type === "video" ? "mp4" : item.take.take_type === "audio" ? "mp3" : "jpg";
      lines.push(`# ${productionShotLabel(item.shot)}: ${item.shot.action?.slice(0, 40) || ""}`);
      lines.push(`file '${productionMediaFileBase(item.shot)}.${ext}'`);
      lines.push(`duration ${item.take.duration || 2}`);
      lines.push("");
    });
    lines.push("");
    lines.push("# To concatenate:");
    lines.push("# ffmpeg -f concat -safe 0 -i concat.txt -c copy output.mp4");
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "concat.txt";
    a.click();
    URL.revokeObjectURL(url);
    showToast("FFmpeg concat 脚本已下载");
  };

  const downloadManifest = async () => {
    const sequence = await getExportSequence();
    const manifest = {
      project_id: projectId,
      project_title: projectTitle,
      exported_at: new Date().toISOString(),
      total_shots: sequence.length,
      total_duration: sequence.reduce((a, i) => a + (i.take.duration || 0), 0),
      shots: sequence.map((item) => ({
        episode_number: item.shot.episode_number,
        episode_title: item.shot.episode_title,
        order: item.shot.order,
        shot_id: item.shot.shot_id,
        action: item.shot.action,
        dialogue: item.shot.dialogue,
        take: {
          id: item.take.id,
          type: item.take.take_type,
          source: item.take.source,
          media_url: item.take.media_url,
          duration: item.take.duration,
        },
      })),
    };
    const blob = new Blob([JSON.stringify(manifest, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `edit_manifest_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("素材清单 JSON 已下载");
  };

  const loadDialogue = useCallback(async (shotId: string) => {
    setDialogueLoading(true);
    try {
      const res = await api.getDialogueLines(projectId);
      const shotLines = (res.dialogue_lines || []).filter((l: any) => l.shotId === shotId);
      if (shotLines.length > 0) {
        setDialogueLines(shotLines);
      } else {
        const shot = shots.find((item) => item.shot_id === shotId);
        const derived = shot ? deriveDialogueLineFromShot(shot) : null;
        setDialogueLines(derived ? [derived] : []);
      }
    } catch (e: any) {
      showToast(`台词加载失败: ${e?.response?.data?.detail || e.message}`, "error");
    } finally {
      setDialogueLoading(false);
    }
  }, [projectId, shots]);

  const handleSaveLine = async (line: any) => {
    try {
      await api.saveDialogueLine({
        id: line.id || undefined,
        project_id: projectId,
        shot_id: selectedShot?.shot_id,
        speaker: line.speaker,
        text: line.text,
        performance: line.performance,
        planned_duration: line.planned_duration || 0,
        actual_duration: line.actual_duration || 0,
        order_index: line.order_index || dialogueLines.length,
      });
      showToast("台词已保存");
      if (selectedShot) loadDialogue(selectedShot.shot_id);
    } catch (e: any) {
      showToast(`保存失败: ${e?.response?.data?.detail || e.message}`, "error");
    }
  };

  const handleAddLine = async () => {
    if (!newLine.text.trim() && !newLine.speaker.trim()) {
      showToast("请填写说话人或台词", "error");
      return;
    }
    await handleSaveLine({ ...newLine, order_index: dialogueLines.length });
    setNewLine({ speaker: "", text: "", performance: "", planned_duration: 0 });
  };

  useEffect(() => {
    if (isOpen) {
      loadKanban();
      loadCosts();
      loadEditVersions();
    }
  }, [isOpen, loadKanban, loadCosts, loadEditVersions]);

  useEffect(() => {
    if (selectedShot) {
      loadTakes(selectedShot.shot_id);
      loadVideoJobs(selectedShot.shot_id);
      loadDialogue(selectedShot.shot_id);
    } else {
      setTakes([]);
      setVideoJobs([]);
      setDialogueLines([]);
    }
  }, [selectedShot, loadTakes, loadVideoJobs, loadDialogue]);

  useEffect(() => {
    if (!selectedShot || !videoJobs.some((job) => job.status === "submitted" || job.status === "processing")) return;
    const timer = window.setInterval(() => loadVideoJobs(selectedShot.shot_id), 8000);
    return () => window.clearInterval(timer);
  }, [selectedShot, videoJobs, loadVideoJobs]);

  const handleGenerateVideo = async () => {
    if (!selectedShot) return;
    const estimate = planVideoGeneration(projectAspectRatio, selectedShot.has_image, selectedShot.duration);
    const modeDescription = estimate.generationMode === "image_to_video"
      ? `图生视频 · 使用当前 ${projectAspectRatio} 分镜图作为首帧`
      : "文生视频 · 没有首帧约束";
    const aspectWarning = estimate.requiresLandscapeFallbackConfirmation
      ? "\n\n⚠ 当前是 9:16 工程，但该镜头没有首帧。MiniMax 文生视频不接受画幅参数，可能返回横屏。建议取消并先生成或上传 9:16 分镜图。"
      : "";
    const confirmed = window.confirm(
      `将调用已配置的视频供应商生成 ${productionShotLabel(selectedShot)}。\n` +
      `${modeDescription}\n最低可用档：768P · ${estimate.billableDuration}s。具体扣费取决于供应商套餐或按量账单。` +
      aspectWarning +
      "\n\n确认提交付费任务？"
    );
    if (!confirmed) return;
    setGeneratingVideo(true);
    try {
      const result = await api.generateVideo(selectedShot.shot_id, {
        allow_landscape_fallback: estimate.requiresLandscapeFallbackConfirmation,
      });
      showToast(result.status === "existing" ? result.message : "视频任务已提交");
      await loadVideoJobs(selectedShot.shot_id);
      loadKanban();
      loadCosts();
    } catch (e: any) {
      showToast(`生成失败: ${e?.response?.data?.detail || e.message}`, "error");
    } finally {
      setGeneratingVideo(false);
    }
  };

  const handlePollVideo = async (jobId: string) => {
    if (!selectedShot) return;
    setPollingJobId(jobId);
    try {
      const result = await api.pollVideo(jobId);
      showToast(result.status === "succeeded" ? "视频已生成，候选素材已刷新" : `任务状态：${result.status}`);
      await Promise.all([loadVideoJobs(selectedShot.shot_id), loadTakes(selectedShot.shot_id)]);
      loadKanban();
      loadCosts();
    } catch (e: any) {
      showToast(`状态刷新失败: ${e?.response?.data?.detail || e.message}`, "error");
    } finally {
      setPollingJobId(null);
    }
  };

  const handleAdopt = async (takeId: string) => {
    try {
      await api.adoptTake(takeId);
      showToast("已采用该候选");
      if (selectedShot) loadTakes(selectedShot.shot_id);
      loadKanban();
      loadCosts();
    } catch (e: any) {
      showToast(`采用失败: ${e?.response?.data?.detail || e.message}`, "error");
    }
  };

  const handleReject = async (takeId: string) => {
    if (!rejectReason.trim()) {
      showToast("请填写退回原因", "error");
      return;
    }
    try {
      await api.rejectTake(takeId, rejectReason);
      showToast("已退回该候选");
      setRejectingTakeId(null);
      setRejectReason("");
      if (selectedShot) loadTakes(selectedShot.shot_id);
      loadKanban();
      loadCosts();
    } catch (e: any) {
      showToast(`退回失败: ${e?.response?.data?.detail || e.message}`, "error");
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, shotId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingShotId(shotId);
    try {
      const takeType = file.type.startsWith("video") ? "video" : file.type.startsWith("audio") ? "audio" : "image";
      await api.uploadTake(shotId, file, takeType);
      showToast(`已上传 ${file.name}`);
      if (selectedShot) loadTakes(selectedShot.shot_id);
      loadKanban();
      loadCosts();
    } catch (e: any) {
      showToast(`上传失败: ${e?.response?.data?.detail || e.message}`, "error");
    } finally {
      setUploadingShotId(null);
      e.target.value = "";
    }
  };

  if (!isOpen) return null;

  const filteredShots = activeFilter === "全部" ? shots : shots.filter((s) => s.status === activeFilter);
  const statuses: (ShotStatus | "全部")[] = ["全部", "待生成", "生成中", "失败", "待审", "退回", "已采用"];
  const visualTakes = takes.filter((take) => take.take_type !== "audio");
  const currentEditVersion = editVersions.find((version) => version.is_current) || editVersions[0];
  const currentExport = currentEditVersion?.export_result || {};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="relative flex h-[90vh] w-full max-w-7xl flex-col rounded-xl bg-[#0d1117] border border-[#21262d] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#21262d] px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-white">生产看板 · Production Kanban</h2>
            <p className="text-xs text-gray-400">{projectTitle} · 共 {shots.length} 镜</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowExport(!showExport)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                showExport ? "bg-green-600 text-white" : "bg-[#21262d] text-gray-300 hover:bg-[#30363d]"
              }`}
            >
              导出整集
            </button>
            <button
              onClick={() => {
                loadKanban();
                loadCosts();
                loadEditVersions();
              }}
              className="rounded-md bg-[#21262d] px-3 py-1.5 text-xs text-gray-300 hover:bg-[#30363d]"
            >
              刷新
            </button>
            <button onClick={onClose} className="rounded-md bg-[#21262d] px-3 py-1.5 text-sm text-gray-300 hover:bg-[#30363d]">
              关闭
            </button>
          </div>
        </div>

        {/* Cost summary bar (P0-6) */}
        {costData && (
          <div className="flex items-center gap-4 border-b border-[#21262d] bg-[#161b22] px-6 py-2 text-[11px] overflow-x-auto">
            <span className="text-gray-400">
              任务 <span className="font-bold text-white">{costData.total_jobs}</span>
            </span>
            <span className="text-gray-400">
              视频候选 <span className="font-bold text-white">{costData.total_visual_takes ?? costData.total_takes}</span>
            </span>
            <span className="text-gray-400">
              配音 <span className="font-bold text-white">{costData.total_audio_takes ?? 0}</span>
            </span>
            <span className="text-gray-400">
              视频已采用 <span className="font-bold text-green-400">{costData.approved_visual_takes ?? costData.approved_takes}</span>
            </span>
            <span className="text-gray-400">
              视频待审 <span className="font-bold text-amber-400">{costData.pending_visual_review ?? costData.pending_review}</span>
            </span>
            <span className="text-gray-400">
              视频采用率 <span className="font-bold text-white">{((costData.visual_adoption_rate ?? costData.adoption_rate ?? 0) * 100).toFixed(0)}%</span>
            </span>
            {Object.entries(costData.costs_by_currency || {}).map(([currency, data]: [string, any]) => (
              <span key={currency} className="text-gray-400">
                {currency === "unknown" ? "未知费用" : `${currency}费用`}: <span className="font-bold text-white">{data.total || 0}</span>
                <span className="text-gray-600"> ({data.count}次, 成功{data.succeeded}/失败{data.failed})</span>
              </span>
            ))}
            {costData.has_unknown_cost && (
              <span className="text-amber-500">⚠ 存在未记录费用，成本不完整</span>
            )}
          </div>
        )}

        {/* Export panel (P0-5) */}
        {showExport && (
          <div className="border-b border-[#21262d] bg-[#161b22] px-6 py-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-bold text-white">整集导出 · Export</span>
              <span className="text-[10px] text-gray-500">
                已采用 {shots.filter((s) => s.adopted_take_id).length} / {shots.length} 镜
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleCreateEditVersion}
                disabled={exporting}
                className="rounded bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                {exporting ? "创建中..." : "创建剪辑版本"}
              </button>
              <button
                onClick={downloadFfmpegScript}
                className="rounded bg-[#21262d] px-3 py-1.5 text-xs text-gray-300 hover:bg-[#30363d]"
              >
                下载 FFmpeg 脚本
              </button>
              <button
                onClick={downloadManifest}
                className="rounded bg-[#21262d] px-3 py-1.5 text-xs text-gray-300 hover:bg-[#30363d]"
              >
                下载素材清单 JSON
              </button>
              <span className="text-[10px] text-gray-600">
                {currentExport.mp4_url ? "当前完整成片已回收到 R2，可直接下载" : "提示：完整 MP4 合成需本地 FFmpeg 或浏览器端 ffmpeg.wasm"}
              </span>
            </div>
            {currentEditVersion && (
              <div className="mt-3 rounded-lg border border-green-500/30 bg-green-500/5 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold text-green-300">当前交付 · {currentEditVersion.version_tag}</p>
                    <p className="mt-0.5 text-[10px] text-gray-400">
                      {currentEditVersion.version_name || "未命名剪辑版本"} · {Number(currentEditVersion.total_duration || 0).toFixed(1)}s · {formatDbDate(currentEditVersion.created_at)}
                    </p>
                  </div>
                  {currentExport.mp4_url && (
                    <a href={normalizeAssetUrl(currentExport.mp4_url)} target="_blank" rel="noopener noreferrer" className="rounded bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700">
                      下载完整 MP4
                    </a>
                  )}
                </div>
                <div className="mt-2 flex flex-wrap gap-2 text-[10px]">
                  {(currentExport.episode_mp4_urls || []).map((url, index) => (
                    <a key={url} href={normalizeAssetUrl(url)} target="_blank" rel="noopener noreferrer" className="rounded bg-[#21262d] px-2 py-1 text-blue-300 hover:text-white">EP{String(index + 1).padStart(2, "0")} MP4</a>
                  ))}
                  {(currentExport.episode_srt_urls || []).map((url, index) => (
                    <a key={url} href={normalizeAssetUrl(url)} target="_blank" rel="noopener noreferrer" className="rounded bg-[#21262d] px-2 py-1 text-blue-300 hover:text-white">EP{String(index + 1).padStart(2, "0")} SRT</a>
                  ))}
                  {currentExport.srt_url && <a href={normalizeAssetUrl(currentExport.srt_url)} target="_blank" rel="noopener noreferrer" className="rounded bg-[#21262d] px-2 py-1 text-blue-300 hover:text-white">完整 SRT</a>}
                  {currentExport.manifest_url && <a href={normalizeAssetUrl(currentExport.manifest_url)} target="_blank" rel="noopener noreferrer" className="rounded bg-[#21262d] px-2 py-1 text-blue-300 hover:text-white">交付清单</a>}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Status filter bar */}
        <div className="flex items-center gap-2 border-b border-[#21262d] px-6 py-3 overflow-x-auto">
          {statuses.map((s) => (
            <button
              key={s}
              onClick={() => setActiveFilter(s)}
              className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition ${
                activeFilter === s
                  ? "bg-blue-600 text-white"
                  : "bg-[#21262d] text-gray-400 hover:bg-[#30363d]"
              }`}
            >
              {s}
              {s !== "全部" && statusCounts[s] ? ` (${statusCounts[s]})` : s === "全部" ? ` (${shots.length})` : ""}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">
          {/* Shot list */}
          <div className="w-1/2 overflow-y-auto border-r border-[#21262d] p-4">
            {loading ? (
              <div className="py-12 text-center text-sm text-gray-500">加载中...</div>
            ) : filteredShots.length === 0 ? (
              <div className="py-12 text-center text-sm text-gray-500">该状态下暂无镜头</div>
            ) : (
              <div className="space-y-2">
                {filteredShots.map((shot) => (
                  <div
                    key={shot.shot_id}
                    onClick={() => setSelectedShot(shot)}
                    className={`cursor-pointer rounded-lg border p-3 transition ${
                      selectedShot?.shot_id === shot.shot_id
                        ? "border-blue-500 bg-blue-500/10"
                        : "border-[#21262d] bg-[#161b22] hover:border-[#30363d]"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-mono text-gray-400">{productionShotLabel(shot)}</span>
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
                        style={{ backgroundColor: STATUS_COLORS[shot.status] }}
                      >
                        {shot.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-300 line-clamp-2 mb-1">{shot.action || "（无动作描述）"}</p>
                    <div className="flex items-center gap-3 text-[10px] text-gray-500">
                      <span>{shot.shot_size?.replace(/_/g, " ")}</span>
                      <span>{shot.duration}s</span>
                      <span>视频 {shot.visual_takes_count ?? shot.takes_count}</span>
                      {(shot.audio_takes_count || 0) > 0 && <span>配音 {shot.audio_takes_count}</span>}
                      {shot.pending_takes > 0 && <span className="text-amber-400">待审 {shot.pending_takes}</span>}
                      {shot.has_image && <span className="text-green-400">✓ 有图</span>}
                    </div>
                    {shot.latest_failure && (
                      <p className="mt-1 text-[10px] text-red-400 line-clamp-1">失败: {shot.latest_failure}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Take detail panel */}
          <div className="w-1/2 overflow-y-auto p-4">
            {!selectedShot ? (
              <div className="flex h-full items-center justify-center text-sm text-gray-500">
                选择左侧镜头查看候选素材
              </div>
            ) : (
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white">
                    {productionShotLabel(selectedShot)}
                  </h3>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setActiveRightTab("takes")}
                      className={`rounded px-2.5 py-1 text-xs font-medium ${
                        activeRightTab === "takes" ? "bg-blue-600 text-white" : "bg-[#21262d] text-gray-400 hover:text-white"
                      }`}
                    >
                      候选素材
                    </button>
                    <button
                      onClick={() => setActiveRightTab("dialogue")}
                      className={`rounded px-2.5 py-1 text-xs font-medium ${
                        activeRightTab === "dialogue" ? "bg-blue-600 text-white" : "bg-[#21262d] text-gray-400 hover:text-white"
                      }`}
                    >
                      台词时间线
                    </button>
                  </div>
                </div>

                {activeRightTab === "takes" && (
                <>
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-xs text-gray-400">共 {visualTakes.length} 个视频/图片候选</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleGenerateVideo}
                      disabled={generatingVideo || videoJobs.some((job) => job.status === "submitted" || job.status === "processing")}
                      className="rounded-md bg-green-600 px-3 py-1.5 text-xs text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                      title="提交前会显示预计费用并要求确认"
                    >
                      {generatingVideo ? "提交中..." : videoJobs.some((job) => job.status === "submitted" || job.status === "processing") ? "已有任务进行中" : "生成视频"}
                    </button>
                    <label className="cursor-pointer rounded-md bg-blue-600 px-3 py-1.5 text-xs text-white hover:bg-blue-700">
                      {uploadingShotId === selectedShot.shot_id ? "上传中..." : "上传外部素材"}
                      <input
                        type="file"
                        className="hidden"
                        accept="video/*,audio/*,image/*"
                        onChange={(e) => handleUpload(e, selectedShot.shot_id)}
                        disabled={uploadingShotId === selectedShot.shot_id}
                      />
                    </label>
                  </div>
                </div>

                {videoJobs.length > 0 && (
                  <div className="mb-4 space-y-2 rounded-lg border border-[#21262d] bg-[#161b22] p-3">
                    <div className="text-xs font-medium text-gray-300">视频生成任务</div>
                    {videoJobs.map((job) => {
                      const active = job.status === "submitted" || job.status === "processing";
                      return (
                        <div key={job.id} className="flex items-start justify-between gap-3 rounded border border-[#30363d] bg-[#0d1117] p-2">
                          <div className="min-w-0 text-[10px] text-gray-500">
                            <p><span className={job.status === "succeeded" ? "text-green-400" : job.status === "failed" ? "text-red-400" : "text-blue-400"}>{job.status}</span> · {job.model || job.provider || "视频模型"}</p>
                            <p>{formatDbDate(job.updatedAt || job.createdAt)}</p>
                            {job.costCurrency && <p>已记录费用：{job.costCurrency} {job.costAmount || 0}</p>}
                            {job.failureReason && <p className="text-red-400">{job.failureReason}</p>}
                          </div>
                          {active && (
                            <button
                              onClick={() => handlePollVideo(job.id)}
                              disabled={pollingJobId === job.id}
                              className="shrink-0 rounded bg-blue-600 px-2 py-1 text-[10px] text-white hover:bg-blue-700 disabled:opacity-50"
                            >
                              {pollingJobId === job.id ? "刷新中..." : "刷新状态"}
                            </button>
                          )}
                        </div>
                      );
                    })}
                    <p className="text-[10px] text-gray-600">关闭页面后任务仍会保留；重新进入看板可继续刷新并恢复结果。</p>
                  </div>
                )}

                {takesLoading ? (
                  <div className="py-8 text-center text-sm text-gray-500">加载候选中...</div>
                ) : visualTakes.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-[#30363d] py-12 text-center">
                    <p className="text-sm text-gray-500">暂无候选素材</p>
                    <p className="mt-1 text-xs text-gray-600">生成视频、图片或上传外部素材后将显示在这里</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {visualTakes.map((take) => (
                      <div
                        key={take.id}
                        className={`rounded-lg border p-3 ${
                          take.is_adopted ? "border-green-500 bg-green-500/5" : "border-[#21262d] bg-[#161b22]"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {/* Media preview */}
                          <div className="h-20 w-32 flex-shrink-0 overflow-hidden rounded bg-[#0d1117]">
                            {take.take_type === "image" && take.media_url ? (
                              <img
                                src={normalizeAssetUrl(take.media_url)}
                                alt="take"
                                className="h-full w-full object-cover"
                              />
                            ) : take.take_type === "video" && take.media_url ? (
                              <video
                                src={normalizeAssetUrl(take.media_url)}
                                className="h-full w-full object-cover"
                                controls
                                muted
                                playsInline
                              />
                            ) : take.take_type === "video" ? (
                              <div className="flex h-full items-center justify-center text-gray-500">
                                <span className="text-2xl">🎬</span>
                              </div>
                            ) : take.take_type === "audio" && take.media_url ? (
                              <audio
                                src={normalizeAssetUrl(take.media_url)}
                                className="h-full w-full"
                                controls
                              />
                            ) : take.take_type === "audio" ? (
                              <div className="flex h-full items-center justify-center text-gray-500">
                                <span className="text-2xl">🎵</span>
                              </div>
                            ) : (
                              <div className="flex h-full items-center justify-center text-gray-600">无预览</div>
                            )}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[10px] font-bold uppercase text-gray-400">
                                {take.take_type}
                              </span>
                              <span className="text-[10px] text-gray-500">
                                {take.source === "external_upload" ? "外部上传" : "AI生成"}
                              </span>
                              {take.is_adopted && (
                                <span className="rounded bg-green-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                                  已采用
                                </span>
                              )}
                              {take.review_status === "rejected" && (
                                <span className="rounded bg-purple-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                                  已退回
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-gray-500 mb-2">
                              {formatDbDate(take.created_at)}
                              {take.duration > 0 && ` · ${take.duration.toFixed(1)}s`}
                            </p>
                            {take.rejection_reason && (
                              <p className="text-[10px] text-purple-400 mb-2">退回原因: {take.rejection_reason}</p>
                            )}

                            {/* Actions */}
                            <div className="flex items-center gap-2">
                              {!take.is_adopted && take.review_status !== "rejected" && (
                                <>
                                  <button
                                    onClick={() => handleAdopt(take.id)}
                                    className="rounded bg-green-600 px-2 py-1 text-[10px] font-bold text-white hover:bg-green-700"
                                  >
                                    采用
                                  </button>
                                  <button
                                    onClick={() => {
                                      setRejectingTakeId(take.id);
                                      setRejectReason("");
                                    }}
                                    className="rounded bg-purple-600 px-2 py-1 text-[10px] font-bold text-white hover:bg-purple-700"
                                  >
                                    退回
                                  </button>
                                </>
                              )}
                              {take.is_adopted && (
                                <button
                                  onClick={() => setSelectedShot(selectedShot)}
                                  className="rounded bg-[#21262d] px-2 py-1 text-[10px] text-gray-400 hover:bg-[#30363d]"
                                >
                                  当前采用版本
                                </button>
                              )}
                              {take.media_url && (
                                <a
                                  href={normalizeAssetUrl(take.media_url)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="rounded bg-[#21262d] px-2 py-1 text-[10px] text-gray-400 hover:bg-[#30363d]"
                                >
                                  查看
                                </a>
                              )}
                            </div>

                            {/* Reject reason input */}
                            {rejectingTakeId === take.id && (
                              <div className="mt-2 flex items-center gap-2">
                                <input
                                  type="text"
                                  value={rejectReason}
                                  onChange={(e) => setRejectReason(e.target.value)}
                                  placeholder="退回原因..."
                                  className="flex-1 rounded border border-[#30363d] bg-[#0d1117] px-2 py-1 text-[10px] text-white placeholder-gray-600"
                                />
                                <button
                                  onClick={() => handleReject(take.id)}
                                  className="rounded bg-purple-600 px-2 py-1 text-[10px] font-bold text-white"
                                >
                                  确认
                                </button>
                                <button
                                  onClick={() => setRejectingTakeId(null)}
                                  className="rounded bg-[#21262d] px-2 py-1 text-[10px] text-gray-400"
                                >
                                  取消
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                </>
                )}

                {activeRightTab === "dialogue" && (
                  <div>
                    {/* Timeline bar */}
                    <div className="mb-4 rounded-lg border border-[#21262d] bg-[#161b22] p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-300">时间线</span>
                        <span className="text-[10px] text-gray-500">
                          镜头 {selectedShot.duration}s · 台词 {dialogueLines.reduce((a, l) => a + (l.actualDuration || l.plannedDuration || 0), 0).toFixed(1)}s
                        </span>
                      </div>
                      <div className="relative h-6 w-full overflow-hidden rounded bg-[#0d1117]">
                        {dialogueLines.length === 0 ? (
                          <div className="flex h-full items-center justify-center text-[10px] text-gray-600">暂无台词</div>
                        ) : (
                          dialogueLines.map((line, i) => {
                            const dur = line.actualDuration || line.plannedDuration || 2;
                            const pct = Math.min((dur / selectedShot.duration) * 100, 100);
                            const colors = ["#3b82f6", "#22c55e", "#f59e0b", "#a855f7", "#ef4444", "#06b6d4"];
                            return (
                              <div
                                key={line.id || i}
                                className="absolute top-0 h-full flex items-center justify-center overflow-hidden"
                                style={{
                                  left: `${(i / dialogueLines.length) * 100}%`,
                                  width: `${pct / dialogueLines.length}%`,
                                  backgroundColor: colors[i % colors.length],
                                  opacity: 0.7,
                                }}
                                title={`${line.speaker || "旁白"}: ${line.text}`}
                              >
                                <span className="truncate px-1 text-[8px] text-white">{line.speaker || "旁白"}</span>
                              </div>
                            );
                          })
                        )}
                      </div>
                      {dialogueLines.reduce((a, l) => a + (l.actualDuration || l.plannedDuration || 0), 0) > selectedShot.duration && (
                        <p className="mt-1.5 text-[10px] text-red-400">⚠ 台词总时长超过镜头时长，存在音画冲突</p>
                      )}
                    </div>

                    {/* Add new line */}
                    <div className="mb-4 rounded-lg border border-[#21262d] bg-[#161b22] p-3">
                      <div className="mb-2 text-xs font-medium text-gray-300">添加台词</div>
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newLine.speaker}
                            onChange={(e) => setNewLine({ ...newLine, speaker: e.target.value })}
                            placeholder="说话人（林夏/周明/旁白）"
                            className="w-1/3 rounded border border-[#30363d] bg-[#0d1117] px-2 py-1.5 text-xs text-white placeholder-gray-600"
                          />
                          <input
                            type="number"
                            value={newLine.planned_duration || ""}
                            onChange={(e) => setNewLine({ ...newLine, planned_duration: parseFloat(e.target.value) || 0 })}
                            placeholder="计划时长(s)"
                            className="w-24 rounded border border-[#30363d] bg-[#0d1117] px-2 py-1.5 text-xs text-white placeholder-gray-600"
                          />
                        </div>
                        <textarea
                          value={newLine.text}
                          onChange={(e) => setNewLine({ ...newLine, text: e.target.value })}
                          placeholder="台词内容..."
                          rows={2}
                          className="w-full rounded border border-[#30363d] bg-[#0d1117] px-2 py-1.5 text-xs text-white placeholder-gray-600"
                        />
                        <input
                          type="text"
                          value={newLine.performance}
                          onChange={(e) => setNewLine({ ...newLine, performance: e.target.value })}
                          placeholder="表演要求（低声/愤怒/犹豫...）"
                          className="w-full rounded border border-[#30363d] bg-[#0d1117] px-2 py-1.5 text-xs text-white placeholder-gray-600"
                        />
                        <button
                          onClick={handleAddLine}
                          className="rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                        >
                          添加
                        </button>
                      </div>
                    </div>

                    {/* Existing lines */}
                    {dialogueLoading ? (
                      <div className="py-8 text-center text-sm text-gray-500">加载台词中...</div>
                    ) : dialogueLines.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-[#30363d] py-8 text-center">
                        <p className="text-sm text-gray-500">暂无台词</p>
                        <p className="mt-1 text-xs text-gray-600">添加台词以规划对白与时长</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {dialogueLines.map((line, i) => (
                          <div key={line.id || `derived-${selectedShot.shot_id}-${i}`} className="rounded-lg border border-[#21262d] bg-[#161b22] p-3">
                            <div className="mb-1 flex items-center justify-between">
                              <span className="text-xs font-bold text-blue-400">{line.speaker || "旁白"}</span>
                              <span className="text-[10px] text-gray-500">
                                {line.actualDuration ? `实际 ${line.actualDuration}s` : `计划 ${line.plannedDuration || 0}s`}
                              </span>
                            </div>
                            <p className="text-xs text-gray-300">{line.text}</p>
                            {line.performance && <p className="mt-1 text-[10px] text-gray-500">表演: {line.performance}</p>}
                            {line.derivedFromShot && (
                              <p className="mt-1 text-[10px] text-amber-400">来自分镜台词；录入实际时长后建立可追踪台词记录</p>
                            )}
                            <div className="mt-2 flex gap-2">
                              <input
                                type="number"
                                defaultValue={line.actualDuration || 0}
                                onBlur={(e) => handleSaveLine({ ...line, actual_duration: parseFloat(e.target.value) || 0 })}
                                placeholder="实际时长(s)"
                                className="w-24 rounded border border-[#30363d] bg-[#0d1117] px-2 py-1 text-[10px] text-white"
                              />
                              <span className="text-[10px] text-gray-600 self-center">输入实际音频时长后自动保存</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Toast */}
        {toast && (
          <div
            className={`absolute bottom-4 left-1/2 -translate-x-1/2 rounded-lg px-4 py-2 text-sm text-white shadow-lg ${
              toast.type === "success" ? "bg-green-600" : "bg-red-600"
            }`}
          >
            {toast.msg}
          </div>
        )}
      </div>
    </div>
  );
}
