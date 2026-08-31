import axios from "axios";
import { ProjectModel, ShotModel } from "@/types/shot";

export type ProjectListItem = ProjectModel;

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8787";

const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    "Content-Type": "application/json",
  },
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

export interface BatchImageResponse {
  status: string;
  rendered_count: number;
}

export const api = {
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

  async generateProjectImages(projectId: string): Promise<BatchImageResponse> {
    const { data } = await apiClient.post(`/generate/images/project/${projectId}`);
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

  // Export URLs
  getExportSheetUrl(projectId: string): string {
    return `${API_BASE_URL}/api/export/storyboard-sheet/${projectId}`;
  },

  getExportScriptUrl(projectId: string): string {
    return `${API_BASE_URL}/api/export/script-markdown/${projectId}`;
  },

  getExportDirectorGlobalPromptUrl(projectId: string): string {
    return `${API_BASE_URL}/api/export/director-global-prompt/${projectId}`;
  },

  async fetchDirectorGlobalPrompt(projectId: string): Promise<string> {
    const { data } = await apiClient.get(`/export/director-global-prompt/${projectId}`);
    return data;
  },

  getExportImagesZipUrl(projectId: string): string {
    return `${API_BASE_URL}/api/export/images-zip/${projectId}`;
  },

  getExportPackageUrl(projectId: string): string {
    return `${API_BASE_URL}/api/export/package-zip/${projectId}`;
  },
};
