"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { CheckCircle2, AlertTriangle, Info, X, Sparkles, Loader2 } from "lucide-react";
import { AuthModal } from "@/components/modals/AuthModal";
import { SettingsModal } from "@/components/modals/SettingsModal";
import { useAuthStore } from "@/stores/authStore";

export type ToastType = "success" | "info" | "error" | "loading";

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextType {
  toast: (message: string, type?: ToastType, duration?: number) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

let globalToastEmitter: ((item: ToastItem) => void) | null = null;

export const notify = {
  show: (message: string, type: ToastType = "info", duration = 3000) => {
    if (globalToastEmitter) {
      globalToastEmitter({ id: `toast-${Date.now()}-${Math.random()}`, message, type, duration });
    }
  },
  success: (message: string) => notify.show(message, "success", 3000),
  error: (message: string) => notify.show(message, "error", 4500),
  info: (message: string) => notify.show(message, "info", 3000),
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const { initAuth, isSettingsModalOpen, closeSettingsModal, openSettingsModal } = useAuthStore();

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  const addToast = useCallback((item: ToastItem) => {
    setToasts((prev) => [...prev, item]);
    if (item.duration && item.duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== item.id));
      }, item.duration);
    }
  }, []);

  globalToastEmitter = addToast;

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const toast = (message: string, type: ToastType = "info", duration = 3000) => {
    addToast({ id: `toast-${Date.now()}-${Math.random()}`, message, type, duration });
  };

  return (
    <ToastContext.Provider
      value={{
        toast,
        success: (m) => toast(m, "success"),
        error: (m) => toast(m, "error", 4500),
        info: (m) => toast(m, "info"),
      }}
    >
      {children}

      {/* Global Modals */}
      <AuthModal />
      <SettingsModal isOpen={isSettingsModalOpen} onClose={closeSettingsModal} />

      {/* Floating Toast Notification Container */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2.5 max-w-sm pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border shadow-xl backdrop-blur-md animate-in slide-in-from-top-3 fade-in duration-200 transition-all ${
              t.type === "success"
                ? "bg-emerald-950/90 border-emerald-500/40 text-emerald-100"
                : t.type === "error"
                ? "bg-destructive/90 border-destructive text-destructive-foreground"
                : t.type === "loading"
                ? "bg-card/90 border-primary/40 text-foreground"
                : "bg-card/90 border-border text-foreground"
            }`}
          >
            <div className="shrink-0">
              {t.type === "success" && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
              {t.type === "error" && <AlertTriangle className="w-4 h-4 text-amber-400" />}
              {t.type === "loading" && <Loader2 className="w-4 h-4 text-primary animate-spin" />}
              {t.type === "info" && <Sparkles className="w-4 h-4 text-primary" />}
            </div>

            <p className="text-xs font-medium leading-snug flex-1">{t.message}</p>

            <button
              onClick={() => removeToast(t.id)}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      toast: notify.show,
      success: notify.success,
      error: notify.error,
      info: notify.info,
    };
  }
  return ctx;
};
