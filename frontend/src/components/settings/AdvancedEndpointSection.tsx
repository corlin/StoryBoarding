import React, { useState } from "react";
import { Globe, ChevronDown, Loader2, Check, AlertCircle } from "lucide-react";
import type { TestStatus } from "@/types/modelConfig";
import { DEFAULT_WORKER_ENDPOINT } from "@/types/modelConfig";
import { cn } from "@/lib/utils";

interface AdvancedEndpointSectionProps {
  apiUrl: string;
  apiStatus: TestStatus;
  apiErrMsg: string;
  onUrlChange: (url: string) => void;
  onTest: () => void;
}

export const AdvancedEndpointSection: React.FC<AdvancedEndpointSectionProps> = ({
  apiUrl,
  apiStatus,
  apiErrMsg,
  onUrlChange,
  onTest,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 overflow-hidden transition-all">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full flex items-center justify-between p-3 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <Globe className="w-3.5 h-3.5 text-primary" />
          <span>⚙️ 高级网络连接配置 (Cloudflare Worker Endpoint)</span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] font-normal">
          <span className="text-muted-foreground/70 font-mono truncate max-w-[200px] sm:max-w-xs">
            {apiUrl}
          </span>
          <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", isOpen && "rotate-180")} />
        </div>
      </button>

      {isOpen && (
        <div className="p-3.5 border-t border-border/50 bg-background/50 space-y-3 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">生产服务节点地址</span>
            <button
              type="button"
              onClick={onTest}
              disabled={apiStatus === "testing" || !apiUrl.trim()}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs cursor-pointer"
            >
              {apiStatus === "testing" ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>测试中...</span>
                </>
              ) : apiStatus === "ok" ? (
                <>
                  <Check className="w-3 h-3 text-emerald-300" />
                  <span>连接正常</span>
                </>
              ) : (
                <span>测试连通性</span>
              )}
            </button>
          </div>

          <div>
            <input
              type="text"
              value={apiUrl}
              onChange={(e) => onUrlChange(e.target.value)}
              placeholder={`默认官方生产服务: ${DEFAULT_WORKER_ENDPOINT}`}
              className="w-full text-xs font-mono bg-background border border-border rounded px-2.5 py-1.5 focus:outline-none focus:border-primary text-foreground"
            />
            <div className="flex items-center justify-between mt-1.5 text-[10px]">
              <span className="text-muted-foreground">
                默认直连官方全球边缘节点，非自建私有后端请保持默认
              </span>
              {apiStatus === "err" && (
                <span className="text-red-400 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {apiErrMsg}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
