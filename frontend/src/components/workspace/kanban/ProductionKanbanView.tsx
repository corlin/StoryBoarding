"use client";

import React, { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { normalizeAssetUrl } from "@/lib/api";
import { notify } from "@/components/ui/ToastNotification";
import {
  buildPreviewAssemblyPlan,
  buildVideoAssemblyPlan,
  compareProductionShots,
  configuredTtsVoiceOptions,
  deriveDialogueLineFromShot,
  planVideoGeneration,
  productionMediaFileBase,
  productionShotLabel,
  previewSubtitlesToSrt,
} from "@/lib/productionKanban";
import { assemblePreviewMp4 } from "@/lib/browserPreviewAssembler";
import type { ProviderConfigApiResponse } from "@/types/modelConfig";

interface ProductionKanbanViewProps {
  projectId: string;
  projectTitle: string;
  onBackToDeliverables?: () => void;
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
  audio_strategy: "native_av" | "reference_audio_av" | "post_dub" | "performance_lipsync" | "silent_broll";
  lip_sync_status: "not_applicable" | "required" | "pending" | "verified" | "failed";
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
  parameters?: string;
  resultMetadata?: string;
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
    episode_outputs?: Array<{ episode_number: number; mp4_url: string; srt_url: string }>;
    assembly_mode?: "preview" | "video";
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

function measureAudioDuration(url: string, timeoutMs = 12000): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    const timer = window.setTimeout(() => finish(new Error("读取音频时长超时")), timeoutMs);
    const finish = (error?: Error) => {
      const duration = audio.duration;
      window.clearTimeout(timer);
      audio.onloadedmetadata = null;
      audio.onerror = null;
      audio.removeAttribute("src");
      audio.load();
      if (error) reject(error);
      else if (Number.isFinite(duration) && duration > 0) resolve(duration);
      else reject(new Error("音频时长无效"));
    };
    audio.preload = "metadata";
    audio.crossOrigin = "anonymous";
    audio.onloadedmetadata = () => finish();
    audio.onerror = () => finish(new Error("无法读取音频元数据"));
    audio.src = normalizeAssetUrl(url);
  });
}

function takeMetadata(take: Take): Record<string, any> {
  if (typeof take.metadata !== "string") return (take.metadata || {}) as Record<string, any>;
  try {
    return JSON.parse(take.metadata);
  } catch {
    return {};
  }
}

function jsonMetadata(value: string | undefined): Record<string, any> {
  try { return JSON.parse(value || "{}"); } catch { return {}; }
}

interface ProductionTakeCardProps {
  take: Take;
  isRejecting: boolean;
  rejectReason: string;
  onRejectReasonChange: (val: string) => void;
  onAdopt: (id: string) => void;
  onStartReject: (id: string) => void;
  onConfirmReject: (id: string) => void;
  onCancelReject: () => void;
}

function ProductionTakeCard({
  take,
  isRejecting,
  rejectReason,
  onRejectReasonChange,
  onAdopt,
  onStartReject,
  onConfirmReject,
  onCancelReject,
}: ProductionTakeCardProps) {
  return (
    <div
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
            {take.take_type === "video" && takeMetadata(take).native_audio && (
              <span className="rounded bg-cyan-700 px-1.5 py-0.5 text-[10px] font-bold text-white">原生音轨（内容待验）</span>
            )}
            {take.take_type === "video" && takeMetadata(take).speech_expected && takeMetadata(take).dialogue_verification_status !== "verified" && (
              <span className="rounded bg-amber-700 px-1.5 py-0.5 text-[10px] font-bold text-white">对白待验</span>
            )}
            {take.take_type === "video" && takeMetadata(take).audio_strategy === "reference_audio_av" && (
              <span className="rounded bg-blue-700 px-1.5 py-0.5 text-[10px] font-bold text-white">参考音频驱动</span>
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
                  onClick={() => onAdopt(take.id)}
                  className="rounded bg-green-600 px-2 py-1 text-[10px] font-bold text-white hover:bg-green-700"
                >
                  采用
                </button>
                <button
                  onClick={() => onStartReject(take.id)}
                  className="rounded bg-purple-600 px-2 py-1 text-[10px] font-bold text-white hover:bg-purple-700"
                >
                  退回
                </button>
              </>
            )}
            {take.is_adopted && (
              <span className="rounded bg-[#21262d] px-2 py-1 text-[10px] text-gray-400">
                当前采用版本
              </span>
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
          {isRejecting && (
            <div className="mt-2 flex items-center gap-2">
              <input
                type="text"
                value={rejectReason}
                onChange={(e) => onRejectReasonChange(e.target.value)}
                placeholder="退回原因..."
                className="flex-1 rounded border border-[#30363d] bg-[#0d1117] px-2 py-1 text-[10px] text-white placeholder-gray-600"
              />
              <button
                onClick={() => onConfirmReject(take.id)}
                className="rounded bg-purple-600 px-2 py-1 text-[10px] font-bold text-white"
              >
                确认
              </button>
              <button
                onClick={onCancelReject}
                className="rounded bg-[#21262d] px-2 py-1 text-[10px] text-gray-400"
              >
                取消
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ProductionKanbanView({ projectId, projectTitle, onBackToDeliverables }: ProductionKanbanViewProps) {
  const [shots, setShots] = useState<KanbanShot[]>([]);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [projectAspectRatio, setProjectAspectRatio] = useState("9:16");
  const [selectedShot, setSelectedShot] = useState<KanbanShot | null>(null);
  const [takes, setTakes] = useState<Take[]>([]);
  const [videoJobs, setVideoJobs] = useState<VideoJob[]>([]);
  const [projectVideoJobs, setProjectVideoJobs] = useState<VideoJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [takesLoading, setTakesLoading] = useState(false);
  const [generatingVideo, setGeneratingVideo] = useState(false);
  const [pollingJobId, setPollingJobId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<ShotStatus | "全部">("全部");
  const [rejectingTakeId, setRejectingTakeId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [uploadingShotId, setUploadingShotId] = useState<string | null>(null);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    if (type === "error") {
      notify.error(msg);
    } else {
      notify.success(msg);
    }
  };

  const loadKanban = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const res = await api.getProductionKanban(projectId);
      const freshShots = (res.shots || []) as KanbanShot[];
      setShots(freshShots);
      setSelectedShot((current) => current
        ? freshShots.find((shot) => shot.shot_id === current.shot_id) || null
        : current);
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

  const loadProjectVideoJobs = useCallback(async () => {
    if (!projectId) return;
    try {
      const res = await api.getProjectVideoJobs(projectId);
      setProjectVideoJobs(res.jobs || []);
    } catch (e: any) {
      console.warn("Project video jobs load failed:", e?.message);
    }
  }, [projectId]);

  // P0-4: Dialogue & timeline state
  const [activeRightTab, setActiveRightTab] = useState<"takes" | "dialogue">("takes");
  const [dialogueLines, setDialogueLines] = useState<any[]>([]);
  const [dialogueLoading, setDialogueLoading] = useState(false);
  const [newLine, setNewLine] = useState({
    speaker: "", text: "", performance: "", planned_duration: 0,
    language: "zh-CN", is_voiceover: false, voice_source: "", voice_consent_status: "unverified",
  });
  const [generatingTtsKey, setGeneratingTtsKey] = useState<string | null>(null);
  const [ttsVoiceOverrides, setTtsVoiceOverrides] = useState<Record<string, string>>({});
  const [ttsConfig, setTtsConfig] = useState({
    model: "",
    voiceFemale: "",
    voiceMale: "",
    voiceNarrator: "",
    videoProvider: "minimax",
    videoModel: "MiniMax-H3",
  });

  // P0-6: Cost summary
  const [costData, setCostData] = useState<any>(null);
  const [editVersions, setEditVersions] = useState<EditVersion[]>([]);

  // P0-5: Export panel
  const [showExport, setShowExport] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [assembling, setAssembling] = useState(false);
  const [assemblyProgress, setAssemblyProgress] = useState("");
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

  const loadTtsConfig = useCallback(async () => {
    try {
      const res = await api.getProviderConfig() as ProviderConfigApiResponse;
      setTtsConfig({
        model: res.tts_model || "",
        voiceFemale: res.tts_voice_female || "",
        voiceMale: res.tts_voice_male || "",
        voiceNarrator: res.tts_voice_narrator || "",
        videoProvider: res.video_provider || "minimax",
        videoModel: res.video_model || "MiniMax-H3",
      });
    } catch (e: any) {
      console.warn("TTS config load failed:", e?.message);
    }
  }, []);

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
            audio_strategy: item.shot.audio_strategy,
            lip_sync_status: item.shot.lip_sync_status,
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
        audio_strategy: item.shot.audio_strategy,
        lip_sync_status: item.shot.lip_sync_status,
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

  const handleAssembly = async (mode: "preview" | "video") => {
    const isVideoMerge = mode === "video";
    const actionLabel = isVideoMerge ? "合并已采用视频" : "合成预演片";
    const buildPlan = isVideoMerge ? buildVideoAssemblyPlan : buildPreviewAssemblyPlan;
    const confirmation = isVideoMerge
      ? "只会合并每个镜头已采用的真实视频片段；静态分镜图不会参与。缺少已采用视频时将直接阻止合并。是否继续？"
      : "将在浏览器中加载约 31MB 的合成引擎，并读取已采用画面生成完整及分集预演 MP4。合成期间请保持页面打开，是否继续？";
    if (!window.confirm(confirmation)) return;
    setAssembling(true);
    setAssemblyProgress(`正在整理${isVideoMerge ? "已采用视频" : "已采用画面"}...`);
    try {
      const takeResponses = await Promise.all(shots.map((shot) => api.getShotTakes(shot.shot_id)));
      const allTakes = takeResponses.flatMap((response) => response.takes || []).map((take: any) => ({
        ...take,
        media_url: normalizeAssetUrl(take.media_url),
      }));
      const dialogueResponse = await api.getDialogueLines(projectId);
      const dialogue = dialogueResponse.dialogue_lines || [];
      const fullPlan = buildPlan(shots, allTakes, dialogue);
      const episodeNumbers = Array.from(new Set(shots.map((shot) => shot.episode_number || 1))).sort((a, b) => a - b);
      const episodePlans = episodeNumbers.map((episodeNumber) => ({
        episodeNumber,
        plan: buildPlan(shots.filter((shot) => (shot.episode_number || 1) === episodeNumber), allTakes, dialogue),
      }));
      const updateProgress = (label: string) => (progress: { message: string; percent: number }) => {
        setAssemblyProgress(`${label} · ${progress.message} · ${progress.percent}%`);
      };

      const episodeMp4Urls: string[] = [];
      const episodeSrtUrls: string[] = [];
      const episodeOutputs: Array<{ episode_number: number; mp4_url: string; srt_url: string }> = [];
      for (const { episodeNumber, plan } of episodePlans) {
        const label = `EP${String(episodeNumber).padStart(2, "0")}`;
        const mp4 = await assemblePreviewMp4(plan, projectAspectRatio, updateProgress(label));
        setAssemblyProgress(`${label} · 正在上传 MP4 与字幕`);
        const mp4Upload = await api.uploadDelivery(projectId, new File([mp4], `${label}_${mode}.mp4`, { type: "video/mp4" }), `episode_${episodeNumber}_${mode}_mp4`);
        const srtBlob = new Blob([previewSubtitlesToSrt(plan.subtitles)], { type: "application/x-subrip;charset=utf-8" });
        const srtUpload = await api.uploadDelivery(projectId, new File([srtBlob], `${label}_${mode}.srt`, { type: "application/x-subrip" }), `episode_${episodeNumber}_${mode}_srt`);
        episodeMp4Urls.push(mp4Upload.media_url);
        episodeSrtUrls.push(srtUpload.media_url);
        episodeOutputs.push({ episode_number: episodeNumber, mp4_url: mp4Upload.media_url, srt_url: srtUpload.media_url });
      }

      const fullMp4 = await assemblePreviewMp4(fullPlan, projectAspectRatio, updateProgress("全片"));
      setAssemblyProgress("全片 · 正在上传 MP4、字幕与清单");
      const fullMp4Upload = await api.uploadDelivery(projectId, new File([fullMp4], `${projectTitle}_${mode}.mp4`, { type: "video/mp4" }), `full_${mode}_mp4`);
      const fullSrt = previewSubtitlesToSrt(fullPlan.subtitles);
      const fullSrtUpload = await api.uploadDelivery(projectId, new File([new Blob([fullSrt], { type: "application/x-subrip;charset=utf-8" })], `${projectTitle}_${mode}.srt`, { type: "application/x-subrip" }), `full_${mode}_srt`);
      const manifest = {
        project_id: projectId,
        project_title: projectTitle,
        generated_at: new Date().toISOString(),
        aspect_ratio: projectAspectRatio,
        total_duration: fullPlan.totalDuration,
        lip_sync_gate: isVideoMerge ? "passed" : "preview_not_enforced",
        audio_strategy_summary: fullPlan.clips.reduce((summary: Record<string, number>, clip) => {
          summary[clip.audioStrategy] = (summary[clip.audioStrategy] || 0) + 1;
          return summary;
        }, {}),
        clips: fullPlan.clips,
        subtitles: fullPlan.subtitles,
        episode_mp4_urls: episodeMp4Urls,
        episode_srt_urls: episodeSrtUrls,
        episode_outputs: episodeOutputs,
        mp4_url: fullMp4Upload.media_url,
        srt_url: fullSrtUpload.media_url,
      };
      const manifestFile = new File([JSON.stringify(manifest, null, 2)], `${projectTitle}_manifest.json`, { type: "application/json" });
      const manifestUpload = await api.uploadDelivery(projectId, manifestFile, `${mode}_manifest`);
      await api.createEditVersion({
        project_id: projectId,
        version_tag: `${mode}-${Date.now()}`,
        version_name: `${isVideoMerge ? "真实视频合并版" : "自动预演片"} ${new Date().toLocaleString()}`,
        assembly_data: { shots: fullPlan.clips },
        subtitle_data: fullPlan.subtitles,
        export_result: {
          mp4_url: fullMp4Upload.media_url,
          srt_url: fullSrtUpload.media_url,
          manifest_url: manifestUpload.media_url,
          episode_mp4_urls: episodeMp4Urls,
          episode_srt_urls: episodeSrtUrls,
          episode_outputs: episodeOutputs,
          assembly_mode: mode,
          subtitle_mode: "mov_text+sidecar_srt",
        },
        total_duration: fullPlan.totalDuration,
        is_current: true,
      });
      await loadEditVersions();
      setAssemblyProgress("");
      showToast(`${actionLabel}完成：${episodePlans.length} 集 + 完整版`);
    } catch (error: any) {
      setAssemblyProgress("");
      showToast(`合成失败: ${error?.response?.data?.detail || error?.message || error}`, "error");
    } finally {
      setAssembling(false);
    }
  };

  const handleAssemblePreview = () => handleAssembly("preview");
  const handleAssembleVideo = () => handleAssembly("video");

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
        planned_duration: line.planned_duration ?? line.plannedDuration ?? 0,
        actual_duration: line.actual_duration ?? line.actualDuration ?? 0,
        is_voiceover: line.is_voiceover ?? line.isVoiceover ?? false,
        language: line.language || "zh-CN",
        voice_source: line.voice_source ?? line.voiceSource ?? "",
        voice_consent_status: line.voice_consent_status ?? line.voiceConsentStatus ?? "unverified",
        order_index: line.order_index ?? line.orderIndex ?? dialogueLines.length,
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
    await handleSaveLine({
      ...newLine,
      is_voiceover: newLine.is_voiceover || /^(旁白|画外音|narrator|voice[- ]?over)$/i.test(newLine.speaker.trim()),
      order_index: dialogueLines.length,
    });
    setNewLine({
      speaker: "", text: "", performance: "", planned_duration: 0,
      language: "zh-CN", is_voiceover: false, voice_source: "", voice_consent_status: "unverified",
    });
  };

  const handleGenerateTts = async (line: any, index: number) => {
    if (!selectedShot) return;
    const lineKey = line.id || `derived-${selectedShot.shot_id}-${index}`;
    const spokenLength = (line.text || "").trim().length;
    if (!spokenLength) {
      showToast("台词内容为空", "error");
      return;
    }
    const selectedVoice = ttsVoiceOverrides[lineKey]?.trim();
    const confirmed = window.confirm(
      `将通过 ${ttsConfig.model || "当前 Speech 模型"} 为 ${line.speaker || "旁白"} 生成配音（${spokenLength} 字符）。\n` +
      `声线：${selectedVoice || "按角色使用设置中的默认声线"}\n` +
      "生成结果会保存到 R2 并进入音频候选，费用按 OpenRouter 实际账单结算。\n\n确认提交付费 TTS？"
    );
    if (!confirmed) return;

    setGeneratingTtsKey(lineKey);
    try {
      let dialogueId = line.id;
      if (!dialogueId) {
        const saved = await api.saveDialogueLine({
          project_id: projectId,
          shot_id: selectedShot.shot_id,
          speaker: line.speaker,
          text: line.text,
          performance: line.performance || "",
          planned_duration: line.plannedDuration || selectedShot.duration || 0,
          actual_duration: 0,
          is_voiceover: line.isVoiceover || false,
          language: line.language || "zh-CN",
          voice_consent_status: line.voiceConsentStatus || "unverified",
          order_index: line.orderIndex || index,
        });
        dialogueId = saved.dialogue_id;
      }
      const voice = selectedVoice || undefined;
      const result = await api.generateTts(dialogueId, { voice, speed: 1 });
      await api.saveDialogueLine({
        id: dialogueId,
        project_id: projectId,
        shot_id: selectedShot.shot_id,
        voice_source: `${result.model}:${result.voice}`,
        voice_consent_status: "provider_preset",
      });
      try {
        const actualDuration = await measureAudioDuration(result.media_url);
        await api.saveDialogueLine({
          id: dialogueId,
          project_id: projectId,
          shot_id: selectedShot.shot_id,
          actual_duration: actualDuration,
        });
      } catch (durationError) {
        console.warn("TTS duration probe failed:", durationError);
      }
      showToast(`配音已生成 · ${result.model} · ${result.voice}`);
      await Promise.all([
        loadTakes(selectedShot.shot_id),
        loadDialogue(selectedShot.shot_id),
        loadKanban(),
        loadCosts(),
      ]);
      setActiveRightTab("dialogue");
    } catch (e: any) {
      showToast(`配音生成失败: ${e?.response?.data?.detail || e.message}`, "error");
    } finally {
      setGeneratingTtsKey(null);
    }
  };

  const handleUploadDialogueAudio = async (e: React.ChangeEvent<HTMLInputElement>, line: any, index: number) => {
    const file = e.target.files?.[0];
    if (!file || !selectedShot) return;
    setUploadingShotId(selectedShot.shot_id);
    try {
      let dialogueId = line.id;
      if (!dialogueId) {
        const saved = await api.saveDialogueLine({
          project_id: projectId,
          shot_id: selectedShot.shot_id,
          speaker: line.speaker,
          text: line.text,
          performance: line.performance || "",
          planned_duration: line.plannedDuration || selectedShot.duration || 0,
          is_voiceover: line.isVoiceover || false,
          language: line.language || "zh-CN",
          voice_consent_status: line.voiceConsentStatus || "unverified",
          order_index: line.orderIndex || index,
        });
        dialogueId = saved.dialogue_id;
      }
      const upload = await api.uploadTake(selectedShot.shot_id, file, "audio", dialogueId);
      const source = line.voiceSource || line.voice_source || `external:${file.name}`;
      let actualDuration = line.actualDuration || line.actual_duration || 0;
      try { actualDuration = await measureAudioDuration(upload.media_url); } catch { /* user can enter it manually */ }
      await api.saveDialogueLine({
        id: dialogueId,
        project_id: projectId,
        shot_id: selectedShot.shot_id,
        voice_source: source,
        actual_duration: actualDuration,
      });
      showToast(`对白音频已上传 · ${file.name}`);
      await Promise.all([loadTakes(selectedShot.shot_id), loadDialogue(selectedShot.shot_id), loadCosts()]);
    } catch (error: any) {
      showToast(`对白音频上传失败: ${error?.response?.data?.detail || error.message}`, "error");
    } finally {
      setUploadingShotId(null);
      e.target.value = "";
    }
  };

  useEffect(() => {
    if (projectId) {
      loadKanban();
      loadCosts();
      loadEditVersions();
      loadTtsConfig();
      loadProjectVideoJobs();
      setTtsVoiceOverrides({});
    }
  }, [projectId, loadKanban, loadCosts, loadEditVersions, loadTtsConfig, loadProjectVideoJobs]);

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
    const activeProjectJobs = projectVideoJobs.filter((job) => job.status === "submitted" || job.status === "processing");
    if (!activeProjectJobs.length) return;
    const reconcile = async () => {
      await Promise.allSettled(activeProjectJobs.map((job) => api.pollVideo(job.id)));
      await Promise.all([
        loadProjectVideoJobs(),
        loadKanban(),
        loadCosts(),
        ...(selectedShot ? [loadVideoJobs(selectedShot.shot_id), loadTakes(selectedShot.shot_id)] : []),
      ]);
    };
    const timer = window.setInterval(reconcile, 8000);
    return () => window.clearInterval(timer);
  }, [selectedShot, projectVideoJobs, loadProjectVideoJobs, loadVideoJobs, loadTakes, loadKanban, loadCosts]);

  const handleGenerateVideo = async () => {
    if (!selectedShot) return;
    const providerSpeechExpected = ["native_av", "reference_audio_av", "performance_lipsync"].includes(selectedShot.audio_strategy);
    const visibleDialogueLines = dialogueLines.filter((line) =>
      String(line.text || "").trim() && !(line.is_voiceover ?? line.isVoiceover ?? false));
    const unresolvedDialogueLines = visibleDialogueLines.filter((line) =>
      !String(line.speaker || "").trim() || String(line.speaker || "").includes("待确认"));
    if (providerSpeechExpected && unresolvedDialogueLines.length > 0) {
      showToast("请先在台词时间线确认说话人，再生成带对白的视频", "error");
      setActiveRightTab("dialogue");
      return;
    }
    const estimate = planVideoGeneration(projectAspectRatio, selectedShot.has_image, selectedShot.duration, ttsConfig.videoModel);
    const strategyLabels: Record<KanbanShot["audio_strategy"], string> = {
      native_av: "模型原生音视频",
      reference_audio_av: "已采用对白音频驱动画面",
      post_dub: "静音画面 + 后期配音",
      performance_lipsync: "参考音频驱动的表演 / 口型专项",
      silent_broll: "无对白 B-roll",
    };
    const modeDescription = selectedShot.audio_strategy === "reference_audio_av" || selectedShot.audio_strategy === "performance_lipsync"
      ? "参考音频联合生成 · 使用已采用对白音频驱动画面与表演"
      : estimate.generationMode === "image_to_video"
      ? "图生视频 · 使用当前分镜图作为首帧画幅约束"
      : "文生视频 · 没有首帧约束";
    const aspectWarning = estimate.requiresLandscapeFallbackConfirmation
      ? "\n\n⚠ 当前是 9:16 工程，但该镜头没有首帧。MiniMax 文生视频不接受画幅参数，可能返回横屏。建议取消并先生成或上传 9:16 分镜图。"
      : "";
    const dialoguePreview = providerSpeechExpected && visibleDialogueLines.length > 0
      ? `\n对白（将逐字写入模型请求）：\n${visibleDialogueLines.map((line) => `- ${line.speaker}：${line.text}`).join("\n")}`
      : selectedShot.audio_strategy === "post_dub"
        ? "\n本次不让视频模型说台词；采用后由外部配音与字幕合成。"
        : "";
    const confirmed = window.confirm(
      `将调用 ${ttsConfig.videoModel || ttsConfig.videoProvider} 生成 ${productionShotLabel(selectedShot)}。\n` +
      `音频策略：${strategyLabels[selectedShot.audio_strategy]}。\n` +
      `${modeDescription}\n请求时长：${estimate.billableDuration}s。分辨率与扣费取决于当前模型及供应商账单。` +
      dialoguePreview +
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
      loadProjectVideoJobs();
      loadKanban();
      loadCosts();
    } catch (e: any) {
      showToast(`生成失败: ${e?.response?.data?.detail || e.message}`, "error");
    } finally {
      setGeneratingVideo(false);
    }
  };

  const handleUpdateAudioWorkflow = async (patch: Partial<Pick<KanbanShot, "audio_strategy" | "lip_sync_status">>) => {
    if (!selectedShot) return;
    try {
      await api.updateShot(selectedShot.shot_id, patch);
      const next = { ...selectedShot, ...patch };
      setSelectedShot(next);
      setShots((current) => current.map((shot) => shot.shot_id === next.shot_id ? { ...shot, ...patch } : shot));
      showToast("音频与口型流程已更新");
    } catch (e: any) {
      showToast(`更新失败: ${e?.response?.data?.detail || e.message}`, "error");
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
      if (selectedShot) {
        await Promise.all([
          loadTakes(selectedShot.shot_id),
          loadDialogue(selectedShot.shot_id),
          loadKanban(),
          loadCosts(),
        ]);
      }
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
      if (selectedShot) {
        await Promise.all([
          loadTakes(selectedShot.shot_id),
          loadDialogue(selectedShot.shot_id),
          loadKanban(),
          loadCosts(),
        ]);
      }
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

  const filteredShots = activeFilter === "全部" ? shots : shots.filter((s) => s.status === activeFilter);
  const statuses: (ShotStatus | "全部")[] = ["全部", "待生成", "生成中", "失败", "待审", "退回", "已采用"];
  const visualTakes = takes.filter((take) => take.take_type !== "audio");
  const audioTakes = takes.filter((take) => take.take_type === "audio");
  const audioTakesForLine = (line: any) => audioTakes.filter((take) => {
    const metadata = takeMetadata(take);
    return (line.id && metadata.dialogue_id === line.id) || (line.audioVersion && take.id === line.audioVersion);
  });
  const currentEditVersion = editVersions.find((version) => version.is_current) || editVersions[0];
  const currentExport = currentEditVersion?.export_result || {};
  const currentEpisodeOutputs = currentExport.episode_outputs || (currentExport.episode_mp4_urls || []).map((mp4Url, index) => ({
    episode_number: index + 1,
    mp4_url: mp4Url,
    srt_url: currentExport.episode_srt_urls?.[index] || "",
  }));

  return (
    <div className="relative flex-1 flex flex-col h-full w-full bg-[#0d1117] overflow-hidden">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#21262d] px-4 py-3 sm:px-6 shrink-0 bg-[#161b22]/50">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <span>实拍镜头与成片生产看板 (Production Kanban)</span>
          </h2>
          <p className="text-xs text-gray-400">{projectTitle} · 共 {shots.length} 镜流水状态与候选 Take 采用</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button
            onClick={() => setShowExport(!showExport)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium cursor-pointer transition-colors ${
              showExport ? "bg-green-600 text-white" : "bg-[#21262d] text-gray-300 hover:bg-[#30363d]"
            }`}
          >
            导出整集与字幕
          </button>
          <button
            onClick={() => {
              loadKanban();
              loadCosts();
              loadEditVersions();
            }}
            className="rounded-md bg-[#21262d] px-3 py-1.5 text-xs text-gray-300 hover:bg-[#30363d] cursor-pointer"
          >
            刷新数据
          </button>
          {onBackToDeliverables && (
            <button
              onClick={onBackToDeliverables}
              className="rounded-md bg-primary/20 border border-primary/40 px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/30 cursor-pointer"
            >
              返回母盘清单
            </button>
          )}
        </div>
      </div>

        {/* Cost summary bar (P0-6) */}
        {costData && (
          <div className="flex items-center gap-4 border-b border-[#21262d] bg-[#161b22] px-3 py-2 text-[11px] overflow-x-auto sm:px-6">
            <span className="text-gray-400">
              任务 <span className="font-bold text-white">{costData.total_jobs}</span>
            </span>
            <span className="text-gray-400">
              视频候选 <span className="font-bold text-white">{costData.total_video_takes ?? 0}</span>
            </span>
            <span className="text-gray-400">
              配音 <span className="font-bold text-white">{costData.total_audio_takes ?? 0}</span>
            </span>
            <span className="text-gray-400">
              视频已采用 <span className="font-bold text-green-400">{costData.approved_video_takes ?? 0}</span>
            </span>
            <span className="text-gray-400">
              视频待审 <span className="font-bold text-amber-400">{costData.pending_video_review ?? 0}</span>
            </span>
            <span className="text-gray-400">
              视频采用率 <span className="font-bold text-white">{((costData.video_adoption_rate ?? 0) * 100).toFixed(0)}%</span>
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
          <div className="border-b border-[#21262d] bg-[#161b22] px-3 py-3 sm:px-6">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-bold text-white">整集导出 · Export</span>
              <span className="text-[10px] text-gray-500">
                已采用 {shots.filter((s) => s.adopted_take_id).length} / {shots.length} 镜
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleCreateEditVersion}
                disabled={exporting || assembling}
                className="rounded bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                {exporting ? "创建中..." : "创建剪辑版本"}
              </button>
              <button
                onClick={handleAssemblePreview}
                disabled={assembling || exporting}
                className="rounded bg-[#21262d] px-3 py-1.5 text-xs font-medium text-gray-200 hover:bg-[#30363d] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {assembling ? "正在合成..." : "一键合成预演片"}
              </button>
              <button
                onClick={handleAssembleVideo}
                disabled={assembling || exporting}
                className="rounded bg-amber-500 px-3 py-1.5 text-xs font-semibold text-black hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {assembling ? "正在合并..." : "合并已采用视频"}
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
              <span className="text-[10px] text-gray-500">
                {assemblyProgress || (currentExport.mp4_url
                  ? `当前${currentExport.assembly_mode === "video" ? "视频合并版" : "预演片"}已保存到 R2，可直接下载`
                  : "预演片可用静态画面；视频合并版只接受已采用视频片段")}
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
                  {currentEpisodeOutputs.map((output) => (
                    <React.Fragment key={output.episode_number}>
                      <a href={normalizeAssetUrl(output.mp4_url)} target="_blank" rel="noopener noreferrer" className="rounded bg-[#21262d] px-2 py-1 text-blue-300 hover:text-white">EP{String(output.episode_number).padStart(2, "0")} MP4</a>
                      {output.srt_url && <a href={normalizeAssetUrl(output.srt_url)} target="_blank" rel="noopener noreferrer" className="rounded bg-[#21262d] px-2 py-1 text-blue-300 hover:text-white">EP{String(output.episode_number).padStart(2, "0")} SRT</a>}
                    </React.Fragment>
                  ))}
                  {currentExport.srt_url && <a href={normalizeAssetUrl(currentExport.srt_url)} target="_blank" rel="noopener noreferrer" className="rounded bg-[#21262d] px-2 py-1 text-blue-300 hover:text-white">完整 SRT</a>}
                  {currentExport.manifest_url && <a href={normalizeAssetUrl(currentExport.manifest_url)} target="_blank" rel="noopener noreferrer" className="rounded bg-[#21262d] px-2 py-1 text-blue-300 hover:text-white">交付清单</a>}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Status filter bar */}
        <div className="flex items-center gap-2 border-b border-[#21262d] px-3 py-3 overflow-x-auto sm:px-6">
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
        <div className="flex flex-1 flex-col overflow-hidden md:flex-row">
          {/* Shot list */}
          <div className="h-2/5 w-full overflow-y-auto border-b border-[#21262d] p-3 md:h-auto md:w-1/2 md:border-b-0 md:border-r md:p-4">
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
          <div className="h-3/5 w-full overflow-y-auto p-3 md:h-auto md:w-1/2 md:p-4">
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
                <div className="mb-4 grid gap-3 rounded-lg border border-[#21262d] bg-[#161b22] p-3 sm:grid-cols-2">
                  <label className="text-[10px] text-gray-400">
                    音频生成策略
                    <select
                      value={selectedShot.audio_strategy}
                      onChange={(e) => handleUpdateAudioWorkflow({ audio_strategy: e.target.value as KanbanShot["audio_strategy"] })}
                      className="mt-1 w-full rounded border border-[#30363d] bg-[#0d1117] px-2 py-1.5 text-xs text-white"
                    >
                      <option value="native_av">模型原生音视频</option>
                      <option value="reference_audio_av">参考音频驱动画面</option>
                      <option value="post_dub">后期配音</option>
                      <option value="performance_lipsync">参考音频表演 / 口型专项</option>
                      <option value="silent_broll">无对白 B-roll</option>
                    </select>
                  </label>
                  <label className="text-[10px] text-gray-400">
                    口型验收
                    <select
                      value={selectedShot.lip_sync_status}
                      onChange={(e) => handleUpdateAudioWorkflow({ lip_sync_status: e.target.value as KanbanShot["lip_sync_status"] })}
                      className="mt-1 w-full rounded border border-[#30363d] bg-[#0d1117] px-2 py-1.5 text-xs text-white"
                    >
                      <option value="not_applicable">不适用（旁白 / 无对白）</option>
                      <option value="required">需要处理</option>
                      <option value="pending">待人工验收</option>
                      <option value="verified">已验收通过</option>
                      <option value="failed">验收失败</option>
                    </select>
                  </label>
                  <p className="sm:col-span-2 text-[10px] leading-4 text-gray-500">
                    参考音频会在生成前送入支持该能力的模型；单纯把外部配音混入 MP4 不会自动产生口型同步。含可见对白的镜头只有“已验收通过”后才能进入成片合并。
                  </p>
                </div>
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
                      const parameters = jsonMetadata(job.parameters);
                      const resultMetadata = jsonMetadata(job.resultMetadata);
                      return (
                        <div key={job.id} className="flex items-start justify-between gap-3 rounded border border-[#30363d] bg-[#0d1117] p-2">
                          <div className="min-w-0 text-[10px] text-gray-500">
                            <p><span className={job.status === "succeeded" ? "text-green-400" : job.status === "failed" ? "text-red-400" : "text-blue-400"}>{job.status}</span> · {job.model || job.provider || "视频模型"}</p>
                            <p>{formatDbDate(job.updatedAt || job.createdAt)}</p>
                            {job.costCurrency && job.costCurrency !== "unknown" ? (
                              <p>已记录费用：{job.costCurrency} {job.costAmount || 0}</p>
                            ) : (
                              <p className="text-amber-500">费用待账单回填</p>
                            )}
                            {job.failureReason && <p className="text-red-400">{job.failureReason}</p>}
                            {parameters.speech_expected && (
                              <p className={parameters.dialogue_in_prompt ? "text-green-500" : "text-red-400"}>
                                {parameters.dialogue_in_prompt ? "对白已写入模型请求 · 生成后待验收" : "对白未写入模型请求"}
                              </p>
                            )}
                            {resultMetadata.usage && <p>供应商用量：{JSON.stringify(resultMetadata.usage)}</p>}
                            {parameters.provider_prompt && (
                              <details className="mt-1 max-w-xl">
                                <summary className="cursor-pointer text-gray-400">查看实际提交提示词</summary>
                                <pre className="mt-1 max-h-36 overflow-auto whitespace-pre-wrap rounded bg-black/30 p-2 text-[9px] text-gray-400">{parameters.provider_prompt}</pre>
                              </details>
                            )}
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
                      <ProductionTakeCard
                        key={take.id}
                        take={take}
                        isRejecting={rejectingTakeId === take.id}
                        rejectReason={rejectReason}
                        onRejectReasonChange={setRejectReason}
                        onAdopt={handleAdopt}
                        onStartReject={(id) => {
                          setRejectingTakeId(id);
                          setRejectReason("");
                        }}
                        onConfirmReject={handleReject}
                        onCancelReject={() => setRejectingTakeId(null)}
                      />
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
                          <select
                            value={newLine.language}
                            onChange={(e) => setNewLine({ ...newLine, language: e.target.value })}
                            className="rounded border border-[#30363d] bg-[#0d1117] px-2 py-1.5 text-xs text-white"
                          >
                            <option value="zh-CN">普通话</option>
                            <option value="zh-HK">粤语</option>
                            <option value="en-US">英语</option>
                            <option value="ja-JP">日语</option>
                          </select>
                        </div>
                        <label className="flex items-center gap-2 text-[10px] text-gray-400">
                          <input
                            type="checkbox"
                            checked={newLine.is_voiceover}
                            onChange={(e) => setNewLine({ ...newLine, is_voiceover: e.target.checked })}
                          />
                          旁白 / 画外音（无需口型）
                        </label>
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
                            <div className="mt-2 flex flex-wrap gap-2">
                              <select
                                value={line.language || "zh-CN"}
                                onChange={(e) => handleSaveLine({ ...line, language: e.target.value })}
                                className="rounded border border-[#30363d] bg-[#0d1117] px-2 py-1 text-[10px] text-white"
                              >
                                <option value="zh-CN">普通话</option>
                                <option value="zh-HK">粤语</option>
                                <option value="en-US">英语</option>
                                <option value="ja-JP">日语</option>
                              </select>
                              <select
                                value={line.voiceConsentStatus || line.voice_consent_status || "unverified"}
                                onChange={(e) => handleSaveLine({ ...line, voice_consent_status: e.target.value })}
                                className="rounded border border-[#30363d] bg-[#0d1117] px-2 py-1 text-[10px] text-white"
                                aria-label="声音授权状态"
                              >
                                <option value="unverified">声音授权待确认</option>
                                <option value="self">本人声音</option>
                                <option value="licensed">已获授权</option>
                                <option value="provider_preset">供应商预设音色</option>
                              </select>
                              <input
                                type="text"
                                defaultValue={line.voiceSource || line.voice_source || ""}
                                onBlur={(e) => handleSaveLine({ ...line, voice_source: e.target.value.trim() })}
                                placeholder="声音来源 / 授权凭据"
                                className="min-w-40 flex-1 rounded border border-[#30363d] bg-[#0d1117] px-2 py-1 text-[10px] text-white placeholder-gray-600"
                              />
                              <label className="flex items-center gap-1 text-[10px] text-gray-400">
                                <input
                                  type="checkbox"
                                  checked={Boolean(line.isVoiceover ?? line.is_voiceover)}
                                  onChange={(e) => handleSaveLine({ ...line, is_voiceover: e.target.checked })}
                                />旁白
                              </label>
                            </div>
                            {line.derivedFromShot && (
                              <p className="mt-1 text-[10px] text-amber-400">来自分镜台词；录入实际时长后建立可追踪台词记录</p>
                            )}
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <input
                                list={`tts-voices-${line.id || i}`}
                                value={ttsVoiceOverrides[line.id || `derived-${selectedShot.shot_id}-${i}`] || ""}
                                onChange={(e) => setTtsVoiceOverrides((current) => ({
                                  ...current,
                                  [line.id || `derived-${selectedShot.shot_id}-${i}`]: e.target.value,
                                }))}
                                className="rounded border border-[#30363d] bg-[#0d1117] px-2 py-1 text-[10px] text-white"
                                aria-label={`${line.speaker || "旁白"} 配音音色`}
                                placeholder="留空则按角色自动选声"
                              />
                              <datalist id={`tts-voices-${line.id || i}`}>
                                {configuredTtsVoiceOptions(ttsConfig).map((option) => (
                                  <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                              </datalist>
                              <button
                                onClick={() => handleGenerateTts(line, i)}
                                disabled={generatingTtsKey !== null}
                                className="rounded bg-emerald-600 px-2.5 py-1 text-[10px] font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {generatingTtsKey === (line.id || `derived-${selectedShot.shot_id}-${i}`) ? "生成配音中..." : "OpenRouter 配音"}
                              </button>
                              <label className="cursor-pointer rounded bg-blue-600 px-2.5 py-1 text-[10px] font-bold text-white hover:bg-blue-700">
                                上传演员 / 外部配音
                                <input
                                  type="file"
                                  accept="audio/*"
                                  className="hidden"
                                  disabled={uploadingShotId === selectedShot.shot_id}
                                  onChange={(e) => handleUploadDialogueAudio(e, line, i)}
                                />
                              </label>
                              <input
                                type="number"
                                defaultValue={line.actualDuration || 0}
                                onBlur={(e) => handleSaveLine({ ...line, actual_duration: parseFloat(e.target.value) || 0 })}
                                placeholder="实际时长(s)"
                                className="w-24 rounded border border-[#30363d] bg-[#0d1117] px-2 py-1 text-[10px] text-white"
                              />
                              <span className="text-[10px] text-gray-600 self-center">实际音频时长</span>
                            </div>
                            <p className="mt-1 text-[10px] text-gray-600">
                              {ttsConfig.model
                                ? `留空时由 ${ttsConfig.model} 按角色使用设置中的女声、男声或旁白声线`
                                : "留空时按设置中的 Speech 模型与角色默认声线生成"}
                            </p>
                            {audioTakesForLine(line).length > 0 && (
                              <div className="mt-3 space-y-2 border-t border-[#30363d] pt-3">
                                <p className="text-[10px] font-medium text-gray-400">配音候选 {audioTakesForLine(line).length}</p>
                                {audioTakesForLine(line).map((take) => {
                                  const metadata = takeMetadata(take);
                                  return (
                                    <div key={take.id} className={`rounded border p-2 ${take.is_adopted ? "border-green-500/60 bg-green-500/5" : "border-[#30363d] bg-[#0d1117]"}`}>
                                      {take.media_url && (
                                        <audio
                                          src={normalizeAssetUrl(take.media_url)}
                                          className="h-8 w-full"
                                          controls
                                          preload="metadata"
                                        />
                                      )}
                                      <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-gray-500">
                                        <span>{take.source === "external_upload" ? "外部上传" : "AI 生成"}</span>
                                        {metadata.voice && <span>{metadata.voice}</span>}
                                        {metadata.model && <span>{metadata.model}</span>}
                                        <span>{formatDbDate(take.created_at)}</span>
                                        {take.is_adopted && <span className="rounded bg-green-600 px-1.5 py-0.5 font-bold text-white">已采用</span>}
                                        {take.review_status === "rejected" && <span className="rounded bg-purple-600 px-1.5 py-0.5 font-bold text-white">已退回</span>}
                                      </div>
                                      <div className="mt-2 flex items-center gap-2">
                                        {!take.is_adopted && take.review_status !== "rejected" && (
                                          <>
                                            <button onClick={() => handleAdopt(take.id)} className="rounded bg-green-600 px-2 py-1 text-[10px] font-bold text-white hover:bg-green-700">采用</button>
                                            <button onClick={() => { setRejectingTakeId(take.id); setRejectReason(""); }} className="rounded bg-purple-600 px-2 py-1 text-[10px] font-bold text-white hover:bg-purple-700">退回</button>
                                          </>
                                        )}
                                        {take.media_url && <a href={normalizeAssetUrl(take.media_url)} target="_blank" rel="noopener noreferrer" className="rounded bg-[#21262d] px-2 py-1 text-[10px] text-gray-400 hover:text-white">查看</a>}
                                      </div>
                                      {rejectingTakeId === take.id && (
                                        <div className="mt-2 flex items-center gap-2">
                                          <input value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="退回原因..." className="flex-1 rounded border border-[#30363d] bg-[#161b22] px-2 py-1 text-[10px] text-white" />
                                          <button onClick={() => handleReject(take.id)} className="rounded bg-purple-600 px-2 py-1 text-[10px] font-bold text-white">确认</button>
                                          <button onClick={() => setRejectingTakeId(null)} className="rounded bg-[#21262d] px-2 py-1 text-[10px] text-gray-400">取消</button>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
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
      </div>
  );
}
