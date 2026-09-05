/**
 * Global Color Semantic Tokens
 * 规范应用内的核心颜色语义层级：
 * - Primary: 仅用于最高优先级的核心操作（如 AI拆镜）
 * - Success: 达标、安全、就绪、已显影
 * - Warning: 警示、注意、超容差、待处理、进行中
 * - Destructive: 危险操作、删除、中止
 * - Neutral: 其余通用功能按钮、常规状态、徽章、标签
 */
export const COLOR = {
  primary: {
    bg: "bg-primary",
    text: "text-primary-foreground",
    hover: "hover:bg-primary/90",
    border: "border-primary",
  },
  success: {
    bg: "bg-emerald-500/15",
    text: "text-emerald-400",
    border: "border-emerald-500/30",
    hover: "hover:bg-emerald-500/25",
  },
  warning: {
    bg: "bg-amber-500/15",
    text: "text-amber-400",
    border: "border-amber-500/30",
    hover: "hover:bg-amber-500/25",
  },
  destructive: {
    bg: "bg-destructive/15",
    text: "text-destructive",
    border: "border-destructive/30",
    hover: "hover:bg-destructive/25",
  },
  neutral: {
    bg: "bg-secondary",
    text: "text-muted-foreground",
    hover: "hover:bg-muted hover:text-foreground",
    border: "border-border",
  },
} as const;
