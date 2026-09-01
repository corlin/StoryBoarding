import React from "react";
import { DirectorPipelineProgress } from "@/components/modals/DirectorPipelineProgress";

interface DirectorPipelineModalProps {
  isOpen: boolean;
  storyPreview?: string;
  targetDuration?: number;
  modelName?: string;
}

export const DirectorPipelineModal: React.FC<DirectorPipelineModalProps> = ({
  isOpen,
  storyPreview,
  targetDuration = 30,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-background/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-primary/40 rounded-2xl p-6 md:p-8 max-w-lg w-full shadow-2xl relative overflow-hidden">
        <DirectorPipelineProgress
          isOpen={true}
          title="AI 导演智能拆镜中"
          story={storyPreview}
          targetDuration={targetDuration}
        />
      </div>
    </div>
  );
};
