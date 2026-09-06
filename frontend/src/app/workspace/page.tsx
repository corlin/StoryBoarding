import React, { Suspense } from "react";
import { WorkspaceClient } from "./[projectId]/WorkspaceClient";
import { WorkspaceLoadingScreen } from "@/components/workspace/WorkspaceLoadingScreen";

export default function WorkspaceMainPage() {
  return (
    <Suspense fallback={<WorkspaceLoadingScreen />}>
      <WorkspaceClient />
    </Suspense>
  );
}
