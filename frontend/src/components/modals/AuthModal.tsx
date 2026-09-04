"use client";

import React, { useState } from "react";
import { X, Mail, User, Lock, Eye, EyeOff, Loader2, Film, Sparkles, ArrowRight } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { notify } from "@/components/ui/ToastNotification";

export const AuthModal: React.FC = () => {
  const { isAuthModalOpen, authModalTab, closeAuthModal, openAuthModal, login, register } = useAuthStore();

  const [account, setAccount] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isAuthModalOpen) return null;

  const isLogin = authModalTab === "login";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (isLogin) {
      if (!account.trim()) {
        notify.error("请输入邮箱或导演昵称");
        return;
      }
      if (!password) {
        notify.error("请输入密码");
        return;
      }
      try {
        setIsSubmitting(true);
        await login(account.trim(), password);
        notify.success("🎬 欢迎回来，导演！已成功登录。");
      } catch (err: any) {
        console.error("Login failed:", err);
        const detail = err?.response?.data?.detail || err?.response?.data?.error || err?.message;
        notify.error(detail || "登录失败，请检查账号与密码");
      } finally {
        setIsSubmitting(false);
      }
    } else {
      if (!email.trim() || !email.includes("@")) {
        notify.error("请输入有效的电子邮箱");
        return;
      }
      if (!username.trim() || username.trim().length < 2) {
        notify.error("导演昵称不能少于 2 个字符");
        return;
      }
      if (!password || password.length < 6) {
        notify.error("密码长度至少需 6 位");
        return;
      }
      if (password !== confirmPassword) {
        notify.error("两次输入的密码不一致");
        return;
      }
      try {
        setIsSubmitting(true);
        await register(email.trim(), username.trim(), password);
        notify.success("🎉 账号创建成功！已自动登录。");
      } catch (err: any) {
        console.error("Register failed:", err);
        const detail = err?.response?.data?.detail || err?.response?.data?.error || err?.message;
        notify.error(detail || "注册失败，请更换其他邮箱或昵称");
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleQuickDemoLogin = async () => {
    try {
      setIsSubmitting(true);
      setAccount("demo@caifu.social");
      setPassword("demo123");
      await login("demo@caifu.social", "demo123");
      notify.success("🎬 欢迎使用 Demo 官方演示账号！已成功登录。");
    } catch (err: any) {
      console.error("Demo login failed:", err);
      const detail = err?.response?.data?.detail || err?.response?.data?.error || err?.message;
      notify.error(detail || "Demo 账号登录失败，请检查账号状态");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-card border border-border/80 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150 relative">
        {/* Close Button */}
        <button
          onClick={closeAuthModal}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header Branding */}
        <div className="text-center space-y-1 pt-1">
          <div className="inline-flex items-center justify-center p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20 mb-2">
            <Film className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-foreground">
            {isLogin ? "登录导演工作台" : "加入好莱坞 AI 故事板"}
          </h2>
          <p className="text-xs text-muted-foreground">
            {isLogin ? "登录以同步您的云端故事板项目与多端设置" : "创建专属导演账号，开启工业级 AI 视听创作"}
          </p>
        </div>

        {/* Demo Fast-Pass VIP Card */}
        <div className="p-3 rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent flex items-center justify-between gap-3 shadow-inner">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span>官方演示 Demo 体验通道</span>
            </div>
            <p className="text-[11px] text-muted-foreground truncate mt-0.5">
              内置官方样本工程，免输入账号密码直接体验
            </p>
          </div>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleQuickDemoLogin}
            className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-black shadow-sm shadow-amber-500/20 active:scale-95 transition-all disabled:opacity-50"
          >
            {isSubmitting ? "登入中..." : "一键登入"}
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-secondary/50 p-1 rounded-xl border border-border/50">
          <button
            type="button"
            onClick={() => openAuthModal("login")}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              isLogin
                ? "bg-card text-foreground shadow-xs border border-border/40"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            密码登录
          </button>
          <button
            type="button"
            onClick={() => openAuthModal("register")}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              !isLogin
                ? "bg-card text-foreground shadow-xs border border-border/40"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            创建新账号
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {isLogin ? (
            // Login Fields
            <>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-sky-400" />
                  <span>邮箱 或 导演昵称</span>
                </label>
                <input
                  type="text"
                  value={account}
                  onChange={(e) => setAccount(e.target.value)}
                  placeholder="name@example.com 或 您的昵称"
                  autoFocus
                  required
                  className="w-full bg-background border border-border/80 rounded-xl px-3 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary transition-colors"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-sky-400" />
                  <span>登录密码</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full bg-background border border-border/80 rounded-xl px-3 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary transition-colors pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </>
          ) : (
            // Register Fields
            <>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-sky-400" />
                  <span>电子邮箱</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="director@studio.com"
                  autoFocus
                  required
                  className="w-full bg-background border border-border/80 rounded-xl px-3 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary transition-colors"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-sky-400" />
                  <span>导演昵称</span>
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="例如：诺兰导演 / 墨客"
                  required
                  className="w-full bg-background border border-border/80 rounded-xl px-3 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-sky-400" />
                    <span>设置密码</span>
                  </label>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="至少 6 位"
                    required
                    className="w-full bg-background border border-border/80 rounded-xl px-3 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary transition-colors"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-sky-400" />
                    <span>确认密码</span>
                  </label>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="重复密码"
                    required
                    className="w-full bg-background border border-border/80 rounded-xl px-3 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-2 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs flex items-center justify-center gap-2 shadow-md hover:shadow-primary/20 transition-all disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>正在验证中...</span>
              </>
            ) : (
              <>
                <span>{isLogin ? "立即登录工作台" : "完成注册并进入"}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>

        {/* Footer info */}
        <p className="text-[11px] text-center text-muted-foreground/80">
          💡 支持游客免登录浏览官方演示 Demo。注册后享无限私有故事板云端存储。
        </p>
      </div>
    </div>
  );
};
