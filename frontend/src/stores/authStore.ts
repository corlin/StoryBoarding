import { create } from "zustand";
import { api } from "@/lib/api";

export interface UserProfile {
  id: string;
  email: string;
  username: string;
  avatar_url?: string;
  custom_settings?: {
    llmApiKey?: string;
    llmApiBase?: string;
    llmModel?: string;
    imageApiKey?: string;
    imageApiBase?: string;
    imageModel?: string;
  };
  created_at?: string;
}

interface AuthState {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAuthModalOpen: boolean;
  authModalTab: "login" | "register";
  isProfileModalOpen: boolean;

  openAuthModal: (tab?: "login" | "register") => void;
  closeAuthModal: () => void;
  openProfileModal: () => void;
  closeProfileModal: () => void;

  initAuth: () => Promise<void>;
  login: (account: string, pass: string) => Promise<void>;
  register: (email: string, username: string, pass: string) => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  isAuthModalOpen: false,
  authModalTab: "login",
  isProfileModalOpen: false,

  openAuthModal: (tab = "login") => set({ isAuthModalOpen: true, authModalTab: tab }),
  closeAuthModal: () => set({ isAuthModalOpen: false }),
  openProfileModal: () => set({ isProfileModalOpen: true }),
  closeProfileModal: () => set({ isProfileModalOpen: false }),

  initAuth: async () => {
    if (typeof window === "undefined") {
      set({ isLoading: false });
      return;
    }
    const token = localStorage.getItem("storyboard_token");
    if (!token) {
      set({ user: null, token: null, isAuthenticated: false, isLoading: false });
      return;
    }
    try {
      set({ isLoading: true });
      const user = await api.getMe();
      set({ user, token, isAuthenticated: true, isLoading: false });
    } catch (e) {
      console.warn("Auth token expired or invalid:", e);
      localStorage.removeItem("storyboard_token");
      set({ user: null, token: null, isAuthenticated: false, isLoading: false });
    }
  },

  login: async (account: string, pass: string) => {
    const data = await api.login(account, pass);
    localStorage.setItem("storyboard_token", data.token);
    set({
      user: data.user,
      token: data.token,
      isAuthenticated: true,
      isAuthModalOpen: false,
    });
  },

  register: async (email: string, username: string, pass: string) => {
    const data = await api.register(email, username, pass);
    localStorage.setItem("storyboard_token", data.token);
    set({
      user: data.user,
      token: data.token,
      isAuthenticated: true,
      isAuthModalOpen: false,
    });
  },

  updateProfile: async (data: Partial<UserProfile>) => {
    const updated = await api.updateProfile(data);
    set({ user: updated });
  },

  logout: () => {
    localStorage.removeItem("storyboard_token");
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      isProfileModalOpen: false,
    });
  },
}));
