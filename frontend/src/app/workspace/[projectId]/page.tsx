import React from "react";
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
  return <WorkspaceClient projectId={params.projectId} />;
}
