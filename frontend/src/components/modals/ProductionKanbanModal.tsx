"use client";

import React, { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { normalizeAssetUrl } from "@/lib/api";

interface ProductionKanbanModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectTitle: string;
}

type ShotStatus = "待生成" | "生成中" | "失败" | "待审" | "退回" | "已采用";

interface KanbanShot {
  shot_id: string;
  order: number;
  shot_size: string;
  duration: number;
  action: string;
  dialogue: string;
  status: ShotStatus;
  has_image: boolean;
  takes_count: number;
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

const STATUS_COLORS: Record<ShotStatus, string> = {
  "待生成": "#64748b",
  "生成中": "#3b82f6",
  "失败": "#ef4444",
  "待审": "#f59e0b",
  "退回": "#a855f7",
  "已采用": "#22c55e",
};

export default function ProductionKanbanModal({ isOpen, onClose, projectId, projectTitle }: ProductionKanbanModalProps) {
  const [shots, setShots] = useState<KanbanShot[]>([]);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [selectedShot, setSelectedShot] = useState<KanbanShot | null>(null);
  const [takes, setTakes] = useState<Take[]>([]);
  const [loading, setLoading] = useState(false);
  const [takesLoading, setTakesLoading] = useState(false);
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

  useEffect(() => {
    if (isOpen) {
      loadKanban();
    }
  }, [isOpen, loadKanban]);

  useEffect(() => {
    if (selectedShot) {
      loadTakes(selectedShot.shot_id);
    } else {
      setTakes([]);
    }
  }, [selectedShot, loadTakes]);

  const handleAdopt = async (takeId: string) => {
    try {
      await api.adoptTake(takeId);
      showToast("已采用该候选");
      if (selectedShot) loadTakes(selectedShot.shot_id);
      loadKanban();
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
              onClick={loadKanban}
              className="rounded-md bg-[#21262d] px-3 py-1.5 text-xs text-gray-300 hover:bg-[#30363d]"
            >
              刷新
            </button>
            <button onClick={onClose} className="rounded-md bg-[#21262d] px-3 py-1.5 text-sm text-gray-300 hover:bg-[#30363d]">
              关闭
            </button>
          </div>
        </div>

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
                      <span className="text-xs font-mono text-gray-400">SHOT {String(shot.order).padStart(2, "0")}</span>
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
                      <span>候选 {shot.takes_count}</span>
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
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white">
                    SHOT {String(selectedShot.order).padStart(2, "0")} · 候选素材
                  </h3>
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

                {takesLoading ? (
                  <div className="py-8 text-center text-sm text-gray-500">加载候选中...</div>
                ) : takes.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-[#30363d] py-12 text-center">
                    <p className="text-sm text-gray-500">暂无候选素材</p>
                    <p className="mt-1 text-xs text-gray-600">生成图片或上传外部素材后将显示在这里</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {takes.map((take) => (
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
                            ) : take.take_type === "video" ? (
                              <div className="flex h-full items-center justify-center text-gray-500">
                                <span className="text-2xl">🎬</span>
                              </div>
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
                              {new Date(take.created_at).toLocaleString()}
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
