import axios from "axios";
import { ProjectModel, ShotModel, LocationModel, BeatModel } from "@/types/shot";

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
  // Default Official Production Cloudflare Worker Backend (Zero-Config Auto-Connect)
  return "https://storyboarding-api.caifu.social";
}

export function normalizeAssetUrl(url: string | null | undefined): string {
  if (!url) return "";
  if (url.startsWith("/api/assets/")) {
    return `https://storyboarding-api.caifu.social${url}`;
  }
  if (url.startsWith("https://storyboarding.caifu.social/api/assets/")) {
    return url.replace("https://storyboarding.caifu.social/api/assets/", "https://storyboarding-api.caifu.social/api/assets/");
  }
  return url;
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

// Dynamically inject latest base URL and Authorization Bearer Token on every request
apiClient.interceptors.request.use((config) => {
  const baseUrl = getApiBaseUrl();
  config.baseURL = baseUrl ? `${baseUrl}/api` : "/api";
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("storyboard_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
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

  // Auth & User System
  async register(email: string, username: string, pass: string): Promise<{ token: string; user: any }> {
    const { data } = await apiClient.post("/auth/register", { email, username, password: pass });
    return data;
  },

  async login(account: string, pass: string): Promise<{ token: string; user: any }> {
    const { data } = await apiClient.post("/auth/login", { account, password: pass });
    return data;
  },

  async getMe(): Promise<any> {
    const { data } = await apiClient.get("/auth/me");
    return data;
  },

  async updateProfile(payload: any): Promise<any> {
    const { data } = await apiClient.put("/auth/profile", payload);
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

  async createProject(payload: {
    title: string;
    story?: string;
    target_duration?: number;
    aspect_ratio?: "9:16" | "16:9";
    narrative_mode?: "hollywood" | "drama_5min" | "commercial";
    structural_archetype?: string;
    narrative_center?: "character" | "creative" | "plot";
  }): Promise<ProjectModel> {
    const { data } = await apiClient.post("/projects", payload);
    return data;
  },

  // Stage 1: Macro Narrative Series Scanner
  async analyzeSeries(payload: { text: string; target_episodes?: number }): Promise<{
    series_title: string;
    logline: string;
    characters: Array<{
      name: string;
      role: "protagonist" | "antagonist" | "supporting";
      personality: string;
      visual_anchor: string;
    }>;
    episodes: Array<{
      episode_number: number;
      title: string;
      act_type: string;
      target_duration: number;
      synopsis: string;
      cliffhanger_hook: string;
      featured_characters: string[];
    }>;
  }> {
    const { data } = await apiClient.post("/projects/analyze-series", payload);
    return data;
  },

  // Stage 2: Create Multi-Episode Series Project
  async createSeries(payload: {
    title: string;
    story?: string;
    characters: any[];
    episodes: any[];
  }): Promise<ProjectModel> {
    const { data } = await apiClient.post("/projects/create-series", payload);
    return data;
  },

  // Add Next Episode in Workspace (inheriting global character Visual DNA)
  async addEpisode(
    projectId: string,
    payload: {
      title?: string;
      story: string;
      target_duration?: number;
      cliffhanger_summary?: string;
      narrative_mode?: "hollywood" | "drama_5min" | "commercial";
      structural_archetype?: string;
      narrative_center?: "character" | "creative" | "plot";
    }
  ): Promise<{ status: string; episode_id: string; episode_number: number; episode_title: string; shots_count: number }> {
    const { data } = await apiClient.post(`/projects/${projectId}/episodes`, payload);
    return data;
  },

  // Expand Single-Scene Project into a Multi-Episode Series
  async expandToSeries(
    projectId: string,
    payload: { continuation_prompt?: string; episodes_to_add?: number }
  ): Promise<{ status: string; message: string; created_episodes: any[] }> {
    const { data } = await apiClient.post(`/projects/${projectId}/expand-to-series`, payload);
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

  async reorderShots(sequenceId: string, shotIds: string[]): Promise<void> {
    await apiClient.post(`/shots/reorder`, { sequence_id: sequenceId, shot_ids: shotIds });
  },

  // Generation & AI Director
  async generateFromStory(payload: {
    project_id: string;
    story: string;
    target_duration?: number;
    narrative_mode?: "hollywood" | "drama_5min" | "commercial";
    structural_archetype?: string;
    narrative_center?: "character" | "creative" | "plot";
  }): Promise<GenerationResponse> {
    const { data } = await apiClient.post(`/generate/storyboard`, payload);
    return data;
  },

  async generateFromScript(payload: { project_id: string; script_text: string }): Promise<GenerationResponse> {
    const { data } = await apiClient.post(`/generate/storyboard`, {
      project_id: payload.project_id,
      story: payload.script_text,
    });
    return data;
  },

  async generateShotImage(shotId: string): Promise<ShotImageResponse> {
    const { data } = await apiClient.post(`/generate/shot-image/${shotId}`);
    return data;
  },

  // AI & Provider Settings
  async getProviderConfig() {
    const { data } = await apiClient.get("/settings/providers");
    return data;
  },

  async updateProviderConfig(payload: any) {
    const { data } = await apiClient.post("/settings/providers", payload);
    return data;
  },

  async testLlm(payload: { api_key: string; api_base?: string; model?: string }): Promise<{ ok: boolean; latency_ms?: number; model?: string; reply?: string; error?: string }> {
    const { data } = await apiClient.post("/settings/test-llm", payload);
    return data;
  },

  async testImage(payload: { api_key: string; api_base?: string; model?: string }): Promise<{ ok: boolean; latency_ms?: number; model?: string; error?: string }> {
    const { data } = await apiClient.post("/settings/test-image", payload);
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

  // Pitch Ideas Generator (One-line idea to 3 short drama proposals)
  async generatePitchIdeas(payload: {
    prompt: string;
    genre?: "female_lead" | "male_lead" | "realistic";
    catharsis_level?: "restrained" | "commercial" | "extreme";
    strict_cast?: boolean;
    must_have_beats?: string[];
  }): Promise<{ status: string; proposals: any[] }> {
    const { data } = await apiClient.post("/generate/pitch-ideas", payload);
    return data;
  },

  // Master Literary Screenplay & Beat Stream Management
  async updateSequenceScreenplay(
    projectId: string,
    seqId: string,
    payload: {
      screenplay_text?: string;
      hook_summary?: string;
      cliffhanger_summary?: string;
      payoff_summary?: string;
      target_duration?: number;
      beats_data?: BeatModel[];
    } | string
  ): Promise<{ status: string; sequence_id: string; [key: string]: any }> {
    const body = typeof payload === "string" ? { screenplay_text: payload } : payload;
    const { data } = await apiClient.put(`/projects/${projectId}/sequences/${seqId}/screenplay`, body);
    return data;
  },

  async syncSequenceScreenplayToShots(
    projectId: string,
    seqId: string,
    screenplayText: string
  ): Promise<{
    status: string;
    message: string;
    diff: {
      updated: number;
      created: number;
      locked_preserved: number;
      changes: { shot_order: number; status: string; detail: string }[];
    };
  }> {
    const { data } = await apiClient.post(`/projects/${projectId}/sequences/${seqId}/sync-screenplay`, {
      screenplay_text: screenplayText,
    });
    return data;
  },

  async diagnoseHook(projectId: string, seqId: string, screenplayText?: string): Promise<{ success: boolean; diagnosis: any }> {
    const { data } = await apiClient.post(`/projects/${projectId}/sequences/${seqId}/diagnose-hook`, {
      screenplay_text: screenplayText,
    });
    return data;
  },

  // Characters & Locations & Props
  async getTurnaroundPresets(): Promise<{ presets: any[] }> {
    const { data } = await apiClient.get("/characters/turnaround-presets");
    return data;
  },

  async generateCharacterAvatar(charId: string, payload?: { prompt?: string; preset_id?: string }): Promise<{ success: boolean; character: any }> {
    const { data } = await apiClient.post(`/characters/${charId}/generate-avatar`, payload || {});
    return data;
  },

  async setCharacterAvatarFromShot(charId: string, payload: { shot_id?: string; image_url?: string }): Promise<{ success: boolean; character: any }> {
    const { data } = await apiClient.post(`/characters/${charId}/set-from-shot`, payload);
    return data;
  },

  async generateLocationConcept(locId: string): Promise<{ success: boolean; location: any }> {
    const { data } = await apiClient.post(`/locations/${locId}/generate-concept`);
    return data;
  },

  // Narrative Props Library (Reelbench Standard)
  async getProps(projectId: string): Promise<{ props: any[] }> {
    const { data } = await apiClient.get(`/props/project/${projectId}`);
    return data;
  },

  async createProp(payload: {
    project_id: string;
    name: string;
    category?: "weapon" | "token" | "document" | "general";
    visual_anchor?: string;
    reference_image_url?: string;
    description?: string;
  }): Promise<{ success: boolean; prop: any }> {
    const { data } = await apiClient.post("/props", payload);
    return data;
  },

  async updateProp(propId: string, payload: any): Promise<{ success: boolean; prop: any }> {
    const { data } = await apiClient.put(`/props/${propId}`, payload);
    return data;
  },

  async deleteProp(propId: string): Promise<{ success: boolean }> {
    const { data } = await apiClient.delete(`/props/${propId}`);
    return data;
  },

  async generatePropConcept(propId: string): Promise<{ success: boolean; prop: any }> {
    const { data } = await apiClient.post(`/props/${propId}/generate-concept`);
    return data;
  },

  // Reelbench User-Level Global Cross-Project Asset Library
  async getGlobalAssets(type?: "character" | "location" | "prop"): Promise<{ total: number; assets: any[] }> {
    const url = type ? `/global-assets?type=${type}` : "/global-assets";
    const { data } = await apiClient.get(url);
    return data;
  },

  async collectGlobalAsset(payload: {
    asset_type: "character" | "location" | "prop";
    name: string;
    visual_anchor?: string;
    reference_image_url?: string;
    metadata?: any;
  }): Promise<{ status: string; message: string; asset: any }> {
    const { data } = await apiClient.post("/global-assets/collect", payload);
    return data;
  },

  async importGlobalAssetToProject(assetId: string, projectId: string): Promise<{ status: string; message: string; imported_entity: any }> {
    const { data } = await apiClient.post(`/global-assets/${assetId}/import-to-project`, { project_id: projectId });
    return data;
  },

  async deleteGlobalAsset(assetId: string): Promise<{ status: string; message: string }> {
    const { data } = await apiClient.delete(`/global-assets/${assetId}`);
    return data;
  },

  // Export URLs
  getExportScriptUrl(projectId: string): string {
    const base = getApiBaseUrl();
    return base ? `${base}/api/export/script-markdown/${projectId}` : `/api/export/script-markdown/${projectId}`;
  },

  getExportBibleUrl(projectId: string): string {
    const base = getApiBaseUrl();
    return base ? `${base}/api/export/bible-markdown/${projectId}` : `/api/export/bible-markdown/${projectId}`;
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

  // Reelbench Project Media Library & Asset Recycle Bin
  async getProjectMediaLibrary(projectId: string): Promise<any> {
    const { data } = await apiClient.get(`/projects/${projectId}/media-library`);
    return data;
  },

  async restoreLibraryImage(projectId: string, shotId: string, imageUrl: string): Promise<any> {
    const { data } = await apiClient.post(`/projects/${projectId}/media-library/restore-image`, {
      shot_id: shotId,
      image_url: imageUrl,
    });
    return data;
  },

  async cleanProjectOrphanAssets(projectId: string): Promise<any> {
    const { data } = await apiClient.post(`/projects/${projectId}/media-library/clean-orphans`);
    return data;
  },

  // Adaptation Tradeoffs & Payoff Radar Studio
  async updateProjectAdaptationTradeoffs(projectId: string, tradeoffs: any): Promise<any> {
    const { data } = await apiClient.put(`/projects/${projectId}`, {
      adaptation_tradeoffs: tradeoffs,
    });
    return data;
  },
};
