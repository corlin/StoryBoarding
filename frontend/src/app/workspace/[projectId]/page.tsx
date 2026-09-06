import React, { Suspense } from "react";
import { WorkspaceClient } from "./WorkspaceClient";
import { WorkspaceLoadingScreen } from "@/components/workspace/WorkspaceLoadingScreen";

interface WorkspacePageProps {
  params: {
    projectId: string;
  };
}

export function generateStaticParams() {
  return [{ projectId: "default" }];
}

export default function WorkspacePage({ params }: WorkspacePageProps) {
  return (
    <Suspense fallback={<WorkspaceLoadingScreen />}>
      <WorkspaceClient projectId={params.projectId} />
    </Suspense>
  );
}
