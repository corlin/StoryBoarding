import React, { Suspense } from "react";
import { WorkspaceClient } from "./[projectId]/WorkspaceClient";

export default function WorkspaceMainPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-background">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <WorkspaceClient />
    </Suspense>
  );
}
