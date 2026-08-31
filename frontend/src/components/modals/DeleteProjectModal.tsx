import React, { useState } from "react";
import { AlertTriangle, Trash2, Loader2 } from "lucide-react";

interface DeleteProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: {
    id: string;
    title: string;
    shot_count?: number;
  } | null;
  onConfirmDelete: (projectId: string) => Promise<void>;
}

export const DeleteProjectModal: React.FC<DeleteProjectModalProps> = ({
  isOpen,
  onClose,
  project,
  onConfirmDelete,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen || !project) return null;

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onConfirmDelete(project.id);
      onClose();
    } catch (err) {
      console.error("Delete project failed:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-destructive/40 rounded-xl p-6 max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-full bg-destructive/15 text-destructive border border-destructive/30">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground">确认删除项目</h3>
            <p className="text-xs text-muted-foreground">此操作不可逆，请谨慎确认</p>
          </div>
        </div>

        {/* Project Target Box */}
        <div className="p-3.5 rounded-lg border border-border bg-background/60 mb-4">
          <p className="text-xs text-muted-foreground mb-1">待删除项目：</p>
          <p className="text-sm font-semibold text-foreground break-all">{project.title}</p>
          <div className="flex items-center gap-2 mt-2 text-[11px] text-muted-foreground">
            <span>镜头总数: {project.shot_count || 0} 个</span>
            <span>•</span>
            <span className="font-mono text-muted-foreground/70">ID: {project.id.slice(0, 12)}...</span>
          </div>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed mb-6">
          确认删除后，该项目下包含的<strong>所有场次数据、分镜头台本、导演提示词及故事板图片资产</strong>都将被立即从云端永久销毁。
        </p>

        <div className="flex items-center justify-end gap-2.5">
          <button
            type="button"
            disabled={isDeleting}
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors disabled:opacity-50"
          >
            取消
          </button>
          <button
            type="button"
            disabled={isDeleting}
            onClick={handleDelete}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors shadow-sm disabled:opacity-50"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>正在销毁数据...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                <span>确认永久删除</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
