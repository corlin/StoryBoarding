import React, { Suspense } from "react";
import { WorkspaceClient } from "./WorkspaceClient";

interface WorkspacePageProps {
  params: {
    projectId: string;
  };
}

export function generateStaticParams() {
  return [{ projectId: "demo" }];
}

export default function WorkspacePage({ params }: WorkspacePageProps) {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-background">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <WorkspaceClient projectId={params.projectId} />
    </Suspense>
  );
}
