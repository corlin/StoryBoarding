import React from "react";
import { ShotModel, ShotSize, CameraAngle, CharacterModel } from "@/types/shot";
import { Trash2, Camera, AlertTriangle, MessageSquare, Volume2, Music, SlidersHorizontal, Lock, Unlock, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface ShotScriptCardProps {
  shot: ShotModel;
  index: number;
  isSelected: boolean;
  characters?: CharacterModel[];
  onSelect: () => void;
  onUpdate: (updates: Partial<ShotModel>) => void;
  onDelete: () => void;
  onOpenDrawer?: () => void;
}

const SHOT_SIZES: { value: ShotSize; label: string }[] = [
  { value: "extreme_wide_shot", label: "大远景 (EWS)" },
  { value: "wide_shot", label: "远景 (WS)" },
  { value: "full_shot", label: "全景 (FS)" },
  { value: "medium_shot", label: "中景 (MS)" },
  { value: "medium_close_up", label: "中近景 (MCU)" },
  { value: "close_up", label: "特写 (CU)" },
  { value: "extreme_close_up", label: "大特写 (ECU)" },
];

const CAMERA_ANGLES: { value: CameraAngle; label: string }[] = [
  { value: "eye_level", label: "平视 (Eye Level)" },
  { value: "low_angle", label: "低机位/仰拍 (Low Angle)" },
  { value: "high_angle", label: "高机位/俯拍 (High Angle)" },
  { value: "dutch_angle", label: "倾斜机位 (Dutch Angle)" },
  { value: "birds_eye", label: "鸟瞰 (Bird's Eye)" },
  { value: "worms_eye", label: "极低视角 (Worm's Eye)" },
];

export const ShotScriptCard: React.FC<ShotScriptCardProps> = ({
  shot,
  index,
  isSelected,
  characters = [],
  onSelect,
  onUpdate,
  onDelete,
  onOpenDrawer,
}) => {
  const isLocked = Boolean(shot.is_locked);

  const handleToggleLock = (e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdate({ is_locked: !isLocked });
  };

  // Extract featured characters in this shot
  const featuredChars = characters.filter((ch) => {
    const q = ch.name.trim().toLowerCase();
    if (!q) return false;
    return (
      (shot.subject && shot.subject.toLowerCase().includes(q)) ||
      (shot.action && shot.action.toLowerCase().includes(q)) ||
      (shot.dialogue && shot.dialogue.toLowerCase().includes(q))
    );
  });

  // Helper to extract audio sfx/music strings
  const sfxText =
    typeof shot.audio === "object"
      ? Array.isArray(shot.audio?.sfx)
        ? shot.audio.sfx.join("、")
        : (shot.audio as any)?.sfx || ""
      : typeof shot.audio === "string"
      ? shot.audio
      : "";

  const musicText = typeof shot.audio === "object" ? shot.audio?.music || "" : "";

  const handleAudioChange = (sfx: string, music: string) => {
    onUpdate({
      audio: {
        ...(typeof shot.audio === "object" ? shot.audio : {}),
        sfx: sfx ? sfx.split(/[、,，\s]+/).filter(Boolean) : [],
        music: music || "",
      },
    });
  };

  return (
    <div
      onClick={onSelect}
      className={cn(
        "group relative p-4 rounded-xl border transition-all duration-150 cursor-pointer bg-card/50 hover:bg-card/90",
        isSelected
          ? "border-primary ring-2 ring-primary/40 bg-card shadow-lg"
          : "border-border/70 hover:border-border"
      )}
    >
      {/* Header Info Bar */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono font-bold text-xs px-2.5 py-1 rounded-md bg-primary/15 text-primary border border-primary/30 shrink-0">
            SHOT {String(index + 1).padStart(2, "0")}
          </span>

          {/* Character Presence Micro Pills */}
          {featuredChars.map((ch) => (
            <span
              key={ch.id}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-sky-300 bg-sky-500/10 px-2 py-0.5 rounded-md border border-sky-500/25 shrink-0"
              title={`出镜角色: ${ch.name} (${ch.role})\nVisual DNA: ${ch.visual_anchor || ch.visualAnchor || ""}`}
            >
              <User className="w-3 h-3 text-sky-400" />
              <span>{ch.name}</span>
            </span>
          ))}

          {/* 5-Min Drama Act Progression & Hook Phase Badges */}
          {shot.act_progression && (
            <span className="inline-flex items-center gap-1 text-[10px] font-mono font-medium text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 shrink-0">
              <span>{shot.act_progression}</span>
            </span>
          )}

          {shot.hook_phase && (
            <span className="inline-flex items-center gap-1 text-[10px] font-mono font-medium text-rose-300 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20 shrink-0">
              <span>{shot.hook_phase}</span>
            </span>
          )}

          {isLocked && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
              <Lock className="w-3 h-3" />
              <span>已锁定</span>
            </span>
          )}

          {shot.is_dirty && (
            <span
              className="inline-flex items-center gap-1 text-xs font-medium text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20"
              title="画面内容已修改，等待重新生成"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>待刷新</span>
            </span>
          )}
        </div>

        {/* Action buttons (Lock, Inspect Drawer, Delete) */}
        <div className="flex items-center gap-1">
          {/* Lock / Unlock button */}
          <button
            onClick={handleToggleLock}
            className={cn(
              "p-1.5 rounded-md transition-all text-xs",
              isLocked
                ? "text-amber-400 bg-amber-500/15 border border-amber-500/30"
                : "text-muted-foreground hover:text-amber-400 hover:bg-secondary opacity-0 group-hover:opacity-100"
            )}
            title={isLocked ? "镜头已锁定保护（点击解锁）" : "锁定镜头（防止 AI 重拆时被覆盖）"}
          >
            {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
          </button>

          {onOpenDrawer && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenDrawer();
              }}
              className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
              title="展开深度编辑抽屉"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>详细参数</span>
            </button>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="opacity-0 group-hover:opacity-100 p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-all"
            title="删除该镜头"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Metadata Row (Duration, Shot Size, Camera Angle) */}
      <div className="grid grid-cols-3 gap-2.5 mb-3" onClick={(e) => e.stopPropagation()}>
        {/* Shot Size Selector */}
        <div>
          <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
            景别
          </label>
          <select
            value={shot.shot_size}
            onChange={(e) => onUpdate({ shot_size: e.target.value as ShotSize })}
            className="w-full bg-background border border-border/80 rounded-md px-2 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary font-medium"
          >
            {SHOT_SIZES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        {/* Camera Angle Selector */}
        <div>
          <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
            机位角度
          </label>
          <select
            value={shot.camera_angle}
            onChange={(e) => onUpdate({ camera_angle: e.target.value as CameraAngle })}
            className="w-full bg-background border border-border/80 rounded-md px-2 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary font-medium"
          >
            {CAMERA_ANGLES.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </select>
        </div>

        {/* Duration Input */}
        <div>
          <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
            时长 (秒)
          </label>
          <input
            type="number"
            step="0.5"
            min="0.5"
            max="60"
            value={shot.duration}
            onChange={(e) => onUpdate({ duration: parseFloat(e.target.value) || 1.0 })}
            className="w-full bg-background border border-border/80 rounded-md px-2 py-1.5 text-xs font-mono text-foreground focus:outline-none focus:border-primary font-medium"
          />
        </div>
      </div>

      {/* Action / Visual Narrative Field */}
      <div className="mb-2.5" onClick={(e) => e.stopPropagation()}>
        <label className="text-[11px] font-semibold text-foreground/90 flex items-center gap-1.5 mb-1">
          <span>🎬 画面动作与视听调度</span>
        </label>
        <textarea
          rows={2}
          value={shot.action}
          onChange={(e) => onUpdate({ action: e.target.value })}
          placeholder="描述角色动作、画面构图、运动轨迹与空间调度..."
          className="w-full bg-background border border-border/80 rounded-md p-2 text-xs md:text-sm text-foreground focus:outline-none focus:border-primary resize-none leading-relaxed font-medium"
        />
      </div>

      {/* Dialogue / Voiceover Field */}
      <div className="mb-2.5" onClick={(e) => e.stopPropagation()}>
        <label className="text-[11px] font-semibold text-sky-400/90 flex items-center gap-1 mb-1">
          <MessageSquare className="w-3 h-3 text-sky-400" />
          <span>角色对白 / 旁白台词 (Dialogue)</span>
        </label>
        <input
          type="text"
          value={shot.dialogue || ""}
          onChange={(e) => onUpdate({ dialogue: e.target.value })}
          placeholder="例如：孟姜女：“夫君，无论千山万水，我定要寻到你……”"
          className="w-full bg-background border border-border/80 rounded-md px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-sky-400 placeholder:text-muted-foreground/50 font-medium"
        />
      </div>

      {/* Sound Design & Audio Field */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2" onClick={(e) => e.stopPropagation()}>
        <div>
          <label className="text-[11px] font-semibold text-emerald-400/90 flex items-center gap-1 mb-1">
            <Volume2 className="w-3 h-3 text-emerald-400" />
            <span>现场音效 (SFX)</span>
          </label>
          <input
            type="text"
            value={sfxText}
            onChange={(e) => handleAudioChange(e.target.value, musicText)}
            placeholder="如：呼啸北风声、城墙崩塌轰鸣"
            className="w-full bg-background border border-border/80 rounded-md px-2.5 py-1 text-xs text-foreground focus:outline-none focus:border-emerald-400 placeholder:text-muted-foreground/40"
          />
        </div>

        <div>
          <label className="text-[11px] font-semibold text-purple-400/90 flex items-center gap-1 mb-1">
            <Music className="w-3 h-3 text-purple-400" />
            <span>配乐情绪 (Music)</span>
          </label>
          <input
            type="text"
            value={musicText}
            onChange={(e) => handleAudioChange(sfxText, e.target.value)}
            placeholder="如：凄清悲凉的古箫与大提琴"
            className="w-full bg-background border border-border/80 rounded-md px-2.5 py-1 text-xs text-foreground focus:outline-none focus:border-purple-400 placeholder:text-muted-foreground/40"
          />
        </div>
      </div>
    </div>
  );
};
