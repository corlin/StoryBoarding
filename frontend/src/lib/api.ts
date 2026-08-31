import axios from "axios";
import { ProjectModel, ShotModel } from "@/types/shot";

export type ProjectListItem = ProjectModel;

export function getApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    const custom = localStorage.getItem("storyboard_api_url");
    if (custom && custom.trim()) {
      return custom.replace(/\/+$/, "");
    }
  }
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  if (envUrl && envUrl.trim()) {
    return envUrl.replace(/\/+$/, "");
  }
  if (typeof window !== "undefined") {
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
      return "http://localhost:8787";
    }
  }
  return "";
}

export function setApiBaseUrl(url: string) {
  if (typeof window !== "undefined") {
    if (!url || !url.trim()) {
      localStorage.removeItem("storyboard_api_url");
    } else {
      localStorage.setItem("storyboard_api_url", url.trim().replace(/\/+$/, ""));
    }
  }
}

const apiClient = axios.create({
  headers: {
    "Content-Type": "application/json",
  },
});

// Dynamically inject latest base URL on every request
apiClient.interceptors.request.use((config) => {
  const baseUrl = getApiBaseUrl();
  config.baseURL = baseUrl ? `${baseUrl}/api` : "/api";
  return config;
});

export interface GenerationResponse {
  status: string;
  theme?: string;
  shots_count: number;
  target_duration?: number;
  continuity_issues?: any[];
}

export interface ShotImageResponse {
  status: string;
  shot_id: string;
  storyboard_image_url: string;
}

export const api = {
  // Test Health
  async checkHealth(): Promise<{ status: string; runtime: string }> {
    const { data } = await apiClient.get("/health");
    return data;
  },

  // Projects
  async getProjects(): Promise<ProjectModel[]> {
    const { data } = await apiClient.get("/projects");
    return data;
  },

  async getProject(id: string): Promise<ProjectModel> {
    const { data } = await apiClient.get(`/projects/${id}`);
    return data;
  },

  async createProject(payload: { title: string; story?: string; target_duration?: number }): Promise<ProjectModel> {
    const { data } = await apiClient.post("/projects", payload);
    return data;
  },

  async updateProject(id: string, payload: Partial<ProjectModel>): Promise<ProjectModel> {
    const { data } = await apiClient.put(`/projects/${id}`, payload);
    return data;
  },

  async deleteProject(id: string): Promise<void> {
    await apiClient.delete(`/projects/${id}`);
  },

  // Shots
  async createShot(payload: Partial<ShotModel> & { sequence_id: string }): Promise<ShotModel> {
    const { data } = await apiClient.post("/shots", payload);
    return data;
  },

  async updateShot(id: string, payload: Partial<ShotModel>): Promise<ShotModel> {
    const { data } = await apiClient.put(`/shots/${id}`, payload);
    return data;
  },

  async deleteShot(id: string): Promise<void> {
    await apiClient.delete(`/shots/${id}`);
  },

  // AI Director Generation
  async generateFromStory(payload: {
    project_id: string;
    story: string;
    target_duration?: number;
  }): Promise<GenerationResponse> {
    const { data } = await apiClient.post("/generate/from-story", payload);
    return data;
  },

  async generateFromScript(payload: {
    project_id: string;
    script_text: string;
  }): Promise<GenerationResponse> {
    const { data } = await apiClient.post("/generate/from-script", payload);
    return data;
  },

  async generateShotImage(shotId: string): Promise<ShotImageResponse> {
    const { data } = await apiClient.post(`/generate/images/${shotId}`);
    return data;
  },

  // Settings
  async getProviderConfig() {
    const { data } = await apiClient.get("/settings/providers");
    return data;
  },

  async updateProviderConfig(payload: any) {
    const { data } = await apiClient.put("/settings/providers", payload);
    return data;
  },

  // Versions & Time Machine
  async getProjectVersions(projectId: string): Promise<any[]> {
    const { data } = await apiClient.get(`/projects/${projectId}/versions`);
    return data;
  },

  async createProjectVersion(projectId: string, payload: { version_name?: string; version_tag?: string; trigger_type?: string }) {
    const { data } = await apiClient.post(`/projects/${projectId}/versions`, payload);
    return data;
  },

  async rollbackProjectVersion(projectId: string, versionId: string) {
    const { data } = await apiClient.post(`/projects/${projectId}/versions/${versionId}/rollback`);
    return data;
  },

  async forkProjectVersion(projectId: string, versionId: string): Promise<{ id: string; title: string }> {
    const { data } = await apiClient.post(`/projects/${projectId}/versions/${versionId}/fork`);
    return data;
  },

  // Export URLs
  getExportSheetUrl(projectId: string): string {
    const base = getApiBaseUrl();
    return base ? `${base}/api/export/storyboard-sheet/${projectId}` : `/api/export/storyboard-sheet/${projectId}`;
  },

  getExportScriptUrl(projectId: string): string {
    const base = getApiBaseUrl();
    return base ? `${base}/api/export/script-markdown/${projectId}` : `/api/export/script-markdown/${projectId}`;
  },

  getExportDirectorGlobalPromptUrl(projectId: string): string {
    const base = getApiBaseUrl();
    return base ? `${base}/api/export/director-global-prompt/${projectId}` : `/api/export/director-global-prompt/${projectId}`;
  },

  async fetchDirectorGlobalPrompt(projectId: string): Promise<string> {
    const { data } = await apiClient.get(`/export/director-global-prompt/${projectId}`);
    return data;
  },

  getExportImagesZipUrl(projectId: string): string {
    const base = getApiBaseUrl();
    return base ? `${base}/api/export/images-zip/${projectId}` : `/api/export/images-zip/${projectId}`;
  },

  getExportPackageUrl(projectId: string): string {
    const base = getApiBaseUrl();
    return base ? `${base}/api/export/package-zip/${projectId}` : `/api/export/package-zip/${projectId}`;
  },
};
