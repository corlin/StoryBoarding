import React from "react";
import { Key, Loader2, Check, AlertCircle } from "lucide-react";
import type { ModelChannelConfig, TestStatus, ModelOption } from "@/types/modelConfig";
import { cn } from "@/lib/utils";

interface ModelProviderCardProps {
  /** 通道标识: llm | image | video */
  channel: "llm" | "image" | "video";
  /** 标题图标 */
  icon: React.ReactNode;
  /** 标题文字 */
  title: string;
  /** 右上角推荐标签文字 */
  badge?: string;
  /** 主题色 (emerald / sky / purple) */
  accentColor: "emerald" | "sky" | "purple";
  /** 当前配置 */
  config: ModelChannelConfig;
  /** Provider 选项列表 */
  providerOptions: Array<{ value: string; label: string }>;
  /** 模型选项列表 */
  modelOptions: ModelOption[];
  /** 测试按钮文字 */
  testButtonLabel: string;
  /** 测试按钮图标 */
  testButtonIcon: React.ReactNode;
  /** 测试状态 */
  testStatus: TestStatus;
  /** 测试消息 */
  testMessage: string;
  /** 是否显示"复用 LLM Key"复选框 (仅图像通道) */
  showSyncKeyCheckbox?: boolean;
  /** 是否复用 LLM Key */
  syncKeyWithLlm?: boolean;
  /** 密钥输入框 placeholder */
  keyPlaceholder?: string;
  /** 底部说明文字 */
  footerNote?: React.ReactNode;
  /** 配置变更回调 */
  onChange: (patch: Partial<ModelChannelConfig>) => void;
  /** 测试按钮回调 */
  onTest: () => void;
  /** 复用 Key 开关回调 (仅图像通道) */
  onSyncKeyToggle?: (checked: boolean) => void;
}

const ACCENT_STYLES = {
  emerald: {
    icon: "text-emerald-400",
    badge: "text-emerald-400/90 bg-emerald-500/10 border-emerald-500/20",
    button: "bg-emerald-600 hover:bg-emerald-500",
    keyBadge: "text-emerald-400",
  },
  sky: {
    icon: "text-sky-400",
    badge: "text-sky-400/90 bg-sky-500/10 border-sky-500/20",
    button: "bg-sky-600 hover:bg-sky-500",
    keyBadge: "text-sky-400",
  },
  purple: {
    icon: "text-purple-400",
    badge: "text-purple-400/90 bg-purple-500/10 border-purple-500/20",
    button: "bg-purple-600 hover:bg-purple-500",
    keyBadge: "text-purple-400",
  },
};

export const ModelProviderCard: React.FC<ModelProviderCardProps> = ({
  icon,
  title,
  badge,
  accentColor,
  config,
  providerOptions,
  modelOptions,
  testButtonLabel,
  testButtonIcon,
  testStatus,
  testMessage,
  showSyncKeyCheckbox = false,
  syncKeyWithLlm = false,
  keyPlaceholder,
  footerNote,
  onChange,
  onTest,
  onSyncKeyToggle,
}) => {
  const styles = ACCENT_STYLES[accentColor];
  const hideKeyInput = showSyncKeyCheckbox && syncKeyWithLlm;

  return (
    <div className="p-4 rounded-lg border border-border/70 bg-background/50 space-y-3">
      {/* 标题栏 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
          <span className={styles.icon}>{icon}</span>
          <span>{title}</span>
        </div>
        {badge && (
          <span className={cn("text-[10px] font-mono px-2 py-0.5 rounded border", styles.badge)}>
            {badge}
          </span>
        )}
      </div>

      {/* Provider + 模型选择 */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[11px] text-muted-foreground block mb-1">Provider 协议类型</label>
          <select
            value={config.provider}
            onChange={(e) => onChange({ provider: e.target.value })}
            className="w-full text-xs bg-background border border-border rounded px-2.5 py-1.5 focus:outline-none focus:border-primary"
          >
            {providerOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-[11px] text-muted-foreground block mb-1">模型快捷选择 / 自定义</label>
          <select
            value={config.model}
            onChange={(e) => onChange({ model: e.target.value })}
            className="w-full text-xs bg-background border border-border rounded px-2.5 py-1.5 focus:outline-none focus:border-primary font-mono mb-1.5"
          >
            {modelOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label} {opt.description ? `(${opt.description})` : ""}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={config.model}
            onChange={(e) => onChange({ model: e.target.value })}
            placeholder="自定义输入任意 Model ID"
            className="w-full text-[11px] font-mono bg-background border border-border/80 rounded px-2 py-1 focus:outline-none focus:border-primary"
          />
        </div>
      </div>

      {/* API Base URL */}
      <div>
        <label className="text-[11px] text-muted-foreground block mb-1">API Base URL</label>
        <input
          type="text"
          value={config.apiBase}
          onChange={(e) => onChange({ apiBase: e.target.value })}
          placeholder="https://api.example.com/v1"
          className="w-full text-xs font-mono bg-background border border-border rounded px-2.5 py-1.5 focus:outline-none focus:border-primary"
        />
      </div>

      {/* API Key */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-[11px] text-muted-foreground">API Key</label>
          {showSyncKeyCheckbox && onSyncKeyToggle && (
            <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={syncKeyWithLlm}
                onChange={(e) => onSyncKeyToggle(e.target.checked)}
                className="rounded border-border"
              />
              <span>复用上方 LLM API Key (OpenRouter 共享密钥)</span>
            </label>
          )}
          {!showSyncKeyCheckbox && config.hasKey && (
            <span className={cn("text-[10px] font-mono flex items-center gap-1", styles.keyBadge)}>
              🔒 D1 密钥已脱敏保护
            </span>
          )}
        </div>

        {!hideKeyInput && (
          <>
            {showSyncKeyCheckbox && config.hasKey && (
              <div className="flex justify-end mb-1">
                <span className={cn("text-[10px] font-mono flex items-center gap-1", styles.keyBadge)}>
                  🔒 D1 生图密钥已脱敏保护
                </span>
              </div>
            )}
            <div className="relative">
              <input
                type="password"
                value={config.apiKey}
                onChange={(e) => onChange({ apiKey: e.target.value })}
                placeholder={
                  keyPlaceholder ||
                  (config.hasKey
                    ? "● 已加密保存在云端 D1 数据库 (若不修改请留空)"
                    : "输入 API Key...")
                }
                className="w-full text-xs font-mono bg-background border border-border rounded px-2.5 py-1.5 pl-8 focus:outline-none focus:border-primary"
              />
              <Key className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-2.5" />
            </div>
          </>
        )}
      </div>

      {/* 测试按钮 + 状态 */}
      <div className="flex items-center justify-between pt-1">
        <button
          type="button"
          onClick={onTest}
          disabled={testStatus === "testing"}
          className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium text-white disabled:opacity-50 transition-colors shadow-xs",
            styles.button
          )}
        >
          {testStatus === "testing" ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>服务端发包探测中...</span>
            </>
          ) : (
            <>
              {testButtonIcon}
              <span>{testButtonLabel}</span>
            </>
          )}
        </button>
        {testStatus === "ok" && (
          <span className="text-[11px] text-emerald-400 font-mono flex items-center gap-1">
            <Check className="w-3.5 h-3.5" />
            {testMessage}
          </span>
        )}
        {testStatus === "err" && (
          <span className="text-[11px] text-red-400 font-mono flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" />
            {testMessage}
          </span>
        )}
      </div>

      {/* 底部说明 */}
      {footerNote && (
        <div className="text-[10px] text-muted-foreground/70 leading-relaxed">{footerNote}</div>
      )}
    </div>
  );
};
