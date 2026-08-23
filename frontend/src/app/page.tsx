import Link from "next/link";
import { Clapperboard, Sparkles, Film, ArrowRight } from "lucide-react";

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Navigation Header */}
      <header className="border-b border-border/40 backdrop-blur bg-background/80 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20">
              <Clapperboard className="w-5 h-5" />
            </div>
            <span className="font-bold text-lg tracking-tight">AI Director Workspace</span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/workspace/demo"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Demo Workspace
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2"
            >
              进入工作台
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-6 py-24 max-w-5xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-medium mb-8">
          <Sparkles className="w-3.5 h-3.5" />
          <span>分镜头脚本与故事板双向协同</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-b from-foreground to-muted-foreground">
          一套镜头数据，两种创作语言<br />
          双向编辑，始终同步
        </h1>

        <p className="text-lg text-muted-foreground max-w-2xl mb-10 leading-relaxed">
          打通文字分镜脚本与视觉故事板的边界。导演可在文本描述与构图画面两端自由切换修改，AI 导演智能体全流程维护视线、空间与连贯性。
        </p>

        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground shadow hover:bg-primary/90 h-11 px-8 gap-2"
          >
            <Film className="w-4 h-4" />
            <span>开始创作项目</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-24 text-left w-full">
          <div className="p-6 rounded-xl border border-border/60 bg-card/50 backdrop-blur">
            <h3 className="font-semibold text-lg mb-2 text-foreground">双向实时联动</h3>
            <p className="text-sm text-muted-foreground">
              修改文字景别与机位，视觉标注即时响应；在故事板调整视觉构图，自动同步回分镜脚本描述。
            </p>
          </div>
          <div className="p-6 rounded-xl border border-border/60 bg-card/50 backdrop-blur">
            <h3 className="font-semibold text-lg mb-2 text-foreground">LangGraph 导演智能体</h3>
            <p className="text-sm text-muted-foreground">
              专业拆镜、空间轴线（Screen Direction）校验、全局角色与风格特征固化、相邻镜头上下文锚定。
            </p>
          </div>
          <div className="p-6 rounded-xl border border-border/60 bg-card/50 backdrop-blur">
            <h3 className="font-semibold text-lg mb-2 text-foreground">全套交付物输出</h3>
            <p className="text-sm text-muted-foreground">
              一键生成 12 格 Storyboard Page、专业执行级 Shot Script 文档、以及供下游视频生成的 Prompt Package。
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
