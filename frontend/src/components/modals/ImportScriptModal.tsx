import React, { useState } from "react";
import { FileCode2, Sparkles, Loader2, Key, CheckCircle2 } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { notify } from "@/components/ui/ToastNotification";
import { cn } from "@/lib/utils";

interface ImportScriptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportScript: (scriptText: string) => Promise<void>;
}

export const ImportScriptModal: React.FC<ImportScriptModalProps> = ({
  isOpen,
  onClose,
  onImportScript,
}) => {
  const [scriptText, setScriptText] = useState("");
  const [isImporting, setIsImporting] = useState(false);

  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isDemoUser = !user || user.id === "demo" || user.email === "demo@caifu.social";
  const hasCustomKey = !isDemoUser && !!user?.custom_settings?.llmApiKey;

  const checkAuthAndKey = (actionName: string): boolean => {
    const { user: currUser, isAuthenticated: currAuth, openAuthModal, openSettingsModal } = useAuthStore.getState();
    if (!currAuth) {
      notify.info(`🎬 请先注册或登录专属导演账号，即可使用 ${actionName}`);
      openAuthModal("register");
      return false;
    }
    const currIsDemo = !currUser || currUser.id === "demo" || currUser.email === "demo@caifu.social";
    if (currIsDemo) {
      notify.info(`🎬 当前为公共体验账号！如需${actionName}，请注册专属导演账号并在个人设置中填入专属 Key`);
      openAuthModal("register");
      return false;
    }
    const currHasKey = !!currUser?.custom_settings?.llmApiKey;
    if (!currHasKey) {
      notify.info(`🎬 请在「设置」中配置您专属的 OpenRouter API Key，开启 AI ${actionName}服务`);
      openSettingsModal();
      return false;
    }
    return true;
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkAuthAndKey("导入私有剧本进行解析拆镜")) return;
    if (!scriptText.trim()) return;
    try {
      setIsImporting(true);
      await onImportScript(scriptText);
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setIsImporting(false);
    }
  };

  const sampleScript = `镜头1: 大远景 (EWS) - 夜晚安静的厨房，一只小老鼠从门缝小心翼翼钻入。
镜头2: 低机位 (Low Angle) - 老鼠贴着墙根快速移动，须子不断抖动探测环境。
镜头3: 中近景 (MCU) - 老鼠突然停下，抬头发现桌面上散发光泽的油瓶。
镜头4: 中景 (MS) - 顺着桌布褶皱努力往上攀爬。
镜头5: 特写 (CU) - 桌布滑动险些跌落，惊险抓牢。
镜头6: 全景 (FS) - 爬上桌面，成功贴近油瓶，露出欣喜表情。`;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-xl p-6 max-w-xl w-full shadow-2xl">
        <div className="flex items-center gap-2 mb-2">
          <FileCode2 className="w-5 h-5 text-primary" />
          <h2 className="text-base font-semibold">导入已有分镜脚本 (起点 B)</h2>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          支持粘贴纯文本、Markdown 或表格剧本。智能分镜分析器（Fuzzy Parser）将自动逆向拆解为规范的 Shot 模型。
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-muted-foreground">分镜脚本文本</label>
              <button
                type="button"
                onClick={() => setScriptText(sampleScript)}
                className="text-[11px] text-primary hover:underline"
              >
                填入示例剧本
              </button>
            </div>
            <textarea
              rows={8}
              required
              value={scriptText}
              onChange={(e) => setScriptText(e.target.value)}
              placeholder="粘贴你的分镜剧本内容..."
              className="w-full bg-background border border-border rounded-md p-3 text-xs leading-relaxed font-mono focus:outline-none focus:border-primary resize-none"
            />
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-border">
            {isDemoUser ? (
              <div
                onClick={() => useAuthStore.getState().openAuthModal("register")}
                className="flex items-center gap-1.5 text-[11px] font-mono text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/30 cursor-pointer transition-colors"
                title="点击注册专属账号"
              >
                <Key className="w-3 h-3 text-amber-400" />
                <span>公共体验模式 · 拆镜受限</span>
              </div>
            ) : !hasCustomKey ? (
              <div
                onClick={() => useAuthStore.getState().openSettingsModal()}
                className="flex items-center gap-1.5 text-[11px] font-mono text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/30 cursor-pointer transition-colors"
                title="点击前往设置配置 Key"
              >
                <Key className="w-3 h-3 text-amber-400" />
                <span>未配置 OpenRouter Key</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                <span>专属 API Key 已就绪</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isImporting}
                onClick={onClose}
                className="px-3 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={isImporting || (!isDemoUser && !scriptText.trim())}
                className={cn(
                  "inline-flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-semibold shadow disabled:opacity-50 transition-all cursor-pointer",
                  isDemoUser || !hasCustomKey
                    ? "bg-amber-500 hover:bg-amber-400 text-black border border-amber-400 shadow-amber-500/20"
                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                )}
              >
                {isImporting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>正在解析剧本...</span>
                  </>
                ) : isDemoUser ? (
                  <>
                    <Key className="w-3.5 h-3.5 text-black" />
                    <span>🔑 注册专属账号解析生成</span>
                  </>
                ) : !hasCustomKey ? (
                  <>
                    <Key className="w-3.5 h-3.5 text-black" />
                    <span>🔑 填Key解析生成</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>智能解析并生成故事板</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
