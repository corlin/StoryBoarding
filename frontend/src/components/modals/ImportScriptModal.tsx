import React, { useState } from "react";
import { FileCode2, Sparkles, Loader2 } from "lucide-react";

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

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
            <button
              type="button"
              disabled={isImporting}
              onClick={onClose}
              className="px-4 py-2 rounded-md text-xs text-muted-foreground hover:text-foreground"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isImporting || !scriptText.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 shadow disabled:opacity-50"
            >
              {isImporting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>正在解析剧本...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>智能解析并生成故事板</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
