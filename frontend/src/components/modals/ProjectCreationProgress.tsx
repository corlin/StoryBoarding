import React from "react";
import { DirectorPipelineProgress, DirectorPipelineProgressProps } from "./DirectorPipelineProgress";

export type ProjectCreationProgressProps = DirectorPipelineProgressProps;

export const ProjectCreationProgress: React.FC<DirectorPipelineProgressProps> = (props) => {
  return <DirectorPipelineProgress {...props} />;
};
