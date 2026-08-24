import React from "react";
import { ShotModel, ShotSize, CameraAngle } from "@/types/shot";
import { Trash2, Camera, AlertTriangle, ExternalLink, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

interface ShotScriptCardProps {
  shot: ShotModel;
  index: number;
  isSelected: boolean;
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
  onSelect,
  onUpdate,
  onDelete,
  onOpenDrawer,
}) => {
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
        <div className="flex items-center gap-2">
          <span className="font-mono font-bold text-xs px-2.5 py-1 rounded-md bg-primary/15 text-primary border border-primary/30">
            SHOT {String(index + 1).padStart(2, "0")}
          </span>

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

        {/* Action buttons (Inspect Drawer & Delete) */}
        <div className="flex items-center gap-1">
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
            className="w-full text-xs font-medium bg-background border border-border rounded-md px-2 py-1.5 focus:outline-none focus:border-primary"
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
            机位视角
          </label>
          <select
            value={shot.camera_angle}
            onChange={(e) => onUpdate({ camera_angle: e.target.value as CameraAngle })}
            className="w-full text-xs font-medium bg-background border border-border rounded-md px-2 py-1.5 focus:outline-none focus:border-primary"
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
          <div className="flex items-center relative">
            <input
              type="number"
              step="0.5"
              min="0.1"
              max="60"
              value={shot.duration}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                if (!isNaN(val)) {
                  onUpdate({ duration: val });
                }
              }}
              className="w-full text-xs font-mono font-medium bg-background border border-border rounded-md px-2 py-1.5 focus:outline-none focus:border-primary"
            />
            <span className="absolute right-2 text-xs text-muted-foreground pointer-events-none">s</span>
          </div>
        </div>
      </div>

      {/* Action / Script Description Field (Scaled to 14px comfortable reading size) */}
      <div className="space-y-1.5" onClick={(e) => e.stopPropagation()}>
        <label className="text-[11px] font-semibold text-muted-foreground block">
          画面动作与调度
        </label>
        <textarea
          rows={2}
          value={shot.action || ""}
          onChange={(e) => onUpdate({ action: e.target.value })}
          placeholder="描述角色动作、主体走向与戏剧行为..."
          className="w-full text-sm font-medium bg-background/70 border border-border rounded-lg p-2.5 focus:outline-none focus:border-primary focus:bg-background resize-none leading-relaxed text-foreground"
        />
      </div>

      {/* Camera Movement summary */}
      <div className="mt-2.5 flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/50">
        <span className="flex items-center gap-1.5 font-mono text-sky-400/90 font-medium">
          <Camera className="w-3.5 h-3.5" />
          <span>运镜: {shot.camera_movement?.type || "static"}</span>
        </span>
        <span className="text-muted-foreground/70 font-medium">{shot.narrative_function || "主叙事"}</span>
      </div>
    </div>
  );
};
