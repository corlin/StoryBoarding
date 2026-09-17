import { ProjectModel, SequenceModel } from "@/types/shot";

export interface MarkdownExportOptions {
  scope?: "current" | "all";
  currentSequenceId?: string;
}

/**
 * Parses dramatic meta from sequence payoff_summary if not directly present.
 */
function resolveDramaticMeta(seq: SequenceModel) {
  let parsed: any = null;
  if (seq.payoff_summary && seq.payoff_summary.startsWith("{")) {
    try {
      parsed = JSON.parse(seq.payoff_summary);
    } catch (_) {}
  }
  return {
    valueTurn: seq.value_turn || parsed?.value_turn,
    abStory: seq.a_b_story || parsed?.a_b_story,
    snyderCollision: seq.snyder_collision || parsed?.snyder_collision,
    cleanPayoff: parsed ? parsed.payoff || "" : seq.payoff_summary || "",
  };
}

/**
 * Generates the full 3-tier industrial standard screenplay & production call sheet Markdown document.
 */
export function generateScreenplayMarkdownContent(
  project: ProjectModel,
  sequences: SequenceModel[],
  options: MarkdownExportOptions = {}
): string {
  const { scope = "all", currentSequenceId } = options;

  // Filter sequences based on scope
  const targetSequences =
    scope === "current" && currentSequenceId
      ? sequences.filter((s) => s.id === currentSequenceId)
      : sequences;

  const lines: string[] = [];
  const exportDate = new Date().toLocaleString("zh-CN", { hour12: false });
  const seriesEngine = project.adaptation_tradeoffs?.series_engine;
  const characters = project.characters || [];
  const charMap = new Map<string, string>();
  characters.forEach((c) => charMap.set(c.id, c.name));

  // ==========================================
  // Header & Title
  // ==========================================
  lines.push(`# 《${project.title || "未命名剧作"}》· 编剧手记与生产交接通告表`);
  lines.push("");
  lines.push(`> 📅 **导出时间**: ${exportDate}  `);
  lines.push(`> 🎬 **全剧画幅**: ${project.aspect_ratio || "9:16"} | ⏱️ **规划总时长**: ${project.target_duration || 60}秒 | 📑 **交接范围**: ${scope === "current" ? "单集精编版" : `全系列完整版 (${targetSequences.length} 集)`}`);
  lines.push("");
  lines.push("---");
  lines.push("");

  // ==========================================
  // 篇章 1: 系列世界观与创作圣经 (Series Worldview & Engine Bible)
  // ==========================================
  lines.push("## 📚 第 1 篇 · 系列世界观与创作圣经 (Series Bible)");
  lines.push("");

  if (project.story) {
    lines.push("### 📖 全剧核心梗概 (Story Synopsis)");
    lines.push(project.story.trim());
    lines.push("");
  }

  if (seriesEngine) {
    if (seriesEngine.tacit_contract) {
      lines.push("### 📜 心照不宣的默契契约 (Tacit Contract)");
      lines.push(seriesEngine.tacit_contract.trim());
      lines.push("");
    }

    if (seriesEngine.unity_of_opposites) {
      lines.push("### 🔒 对立统一定律与绝境纽带 (Unity of Opposites)");
      lines.push(seriesEngine.unity_of_opposites.trim());
      lines.push("");
    }

    if (seriesEngine.subtext_landmines && seriesEngine.subtext_landmines.length > 0) {
      lines.push("### 💣 潜台词禁忌地雷 (Subtext Landmines)");
      seriesEngine.subtext_landmines.forEach((mine, idx) => {
        lines.push(`- **禁区 ${idx + 1}**: ${mine}`);
      });
      lines.push("");
    }

    if (seriesEngine.bonding_items && seriesEngine.bonding_items.length > 0) {
      lines.push("### 💍 核心承重道具信物总表 (Key Bonding Items)");
      seriesEngine.bonding_items.forEach((item, idx) => {
        lines.push(`- **信物 ${idx + 1}**: ${item}`);
      });
      lines.push("");
    }
  }

  // Character Conflict Radar
  if (characters.length > 0) {
    lines.push("### 👥 核心角色冲突矩阵 (Character Matrix)");
    lines.push("");
    characters.forEach((c) => {
      const archetype = c.profile_json?.role_archetype
        ? ` · 【${
            c.profile_json.role_archetype === "protagonist"
              ? "核心主角"
              : c.profile_json.role_archetype === "main_opponent"
              ? "主要对手"
              : c.profile_json.role_archetype === "fake_ally"
              ? "伪盟友"
              : c.profile_json.role_archetype === "moral_critic"
              ? "道德质疑者"
              : "配角"
          }】`
        : "";
      const flaw = c.profile_json?.attacks_flaw ? ` | **针对软肋**: ${c.profile_json.attacks_flaw}` : "";
      const personality = c.personality ? ` | **性格特质**: ${c.personality}` : "";
      lines.push(`- **${c.name}** (${c.role || "主角"}${archetype})${flaw}${personality}`);
    });
    lines.push("");
  }

  lines.push("---");
  lines.push("");

  // ==========================================
  // 篇章 2: 分集戏剧动力轴 (Dramatic Radar)
  // ==========================================
  lines.push("## ⚡ 第 2 篇 · 分集场次戏剧动力轴 (Dramatic Dynamics)");
  lines.push("");

  targetSequences.forEach((seq, idx) => {
    const epNum = seq.episode_number || idx + 1;
    const { valueTurn, abStory, snyderCollision, cleanPayoff } = resolveDramaticMeta(seq);

    lines.push(`### 🎯 第 ${epNum} 集: ${seq.title || `第 ${epNum} 集`}`);
    lines.push(`- **规划时长**: ${seq.target_duration || 60} 秒 | **镜头数量**: ${seq.shots?.length || 0} 镜`);

    if (seq.hook_summary) {
      lines.push(`- **🪝 黄金 3 秒开局钩子**: ${seq.hook_summary}`);
    }

    if (valueTurn) {
      lines.push(`- **🔄 梅峰场景价值转折**:`);
      lines.push(`  - **开场极性**: ${valueTurn.opening}`);
      lines.push(`  - **逆转枢轴**: ${valueTurn.pivot}`);
      lines.push(`  - **结尾极性**: ${valueTurn.ending}`);
    }

    if (abStory) {
      lines.push(`- **⚖️ 斯奈德 A/B 双轨交织**:`);
      lines.push(`  - **A 轨 (主情节推进)**: ${abStory.a_plot}`);
      lines.push(`  - **B 轨 (内心情感裂变)**: ${abStory.b_plot}`);
    }

    if (snyderCollision) {
      lines.push(`- **💥 角色性格激烈碰撞**: **${snyderCollision.character_a}** ⚡ **${snyderCollision.character_b}**（${snyderCollision.dynamic}）`);
    }

    if (seq.cliffhanger_summary) {
      lines.push(`- **🧗 集尾生死卡点悬念**: ${seq.cliffhanger_summary}`);
    }

    if (cleanPayoff) {
      lines.push(`- **🎁 戏剧收益收敛 (Payoff)**: ${cleanPayoff}`);
    }

    lines.push("");
  });

  lines.push("---");
  lines.push("");

  // ==========================================
  // 篇章 3: 导演分镜头台本与视听信物明细 (Shot Breakdown & Visual Metaphors)
  // ==========================================
  lines.push("## 🎬 第 3 篇 · 导演分镜头台本与视听隐喻调度表 (Director Shot Breakdown)");
  lines.push("");

  targetSequences.forEach((seq, seqIdx) => {
    const epNum = seq.episode_number || seqIdx + 1;
    const shots = seq.shots || [];

    lines.push(`### 🎞️ 第 ${epNum} 集: ${seq.title || `第 ${epNum} 集`} · 镜头台本清单`);
    lines.push("");

    if (shots.length === 0) {
      lines.push("*本集暂无分镜头数据。*");
      lines.push("");
      return;
    }

    shots.forEach((shot, shotIdx) => {
      const shotOrder = shot.order || shotIdx + 1;
      const shotSize = (shot.shot_size || "MS").toUpperCase();
      const cameraAngle = shot.camera_angle || "平视";
      const cameraMovement = shot.camera_movement?.type || "固定";
      const duration = Number(shot.duration) || 2.5;

      // Character names
      const participatingChars: string[] = [];
      if (shot.character_ids && Array.isArray(shot.character_ids)) {
        shot.character_ids.forEach((cId) => {
          const name = charMap.get(cId);
          if (name) participatingChars.push(name);
        });
      }

      // Visual Metaphor & Micro-action
      const metaphor = shot.continuity_data?.visual_metaphor;

      lines.push(`#### 镜头 #${String(shotOrder).padStart(2, "0")} · ${shotSize} · ${cameraAngle} · ${cameraMovement} [${duration.toFixed(1)}秒]`);
      
      if (participatingChars.length > 0) {
        lines.push(`- **出场人物**: ${participatingChars.join("、")}`);
      }

      if (metaphor?.prop_name || metaphor?.metaphor_theme) {
        lines.push(`- **视听隐喻**: 💍 **${metaphor.prop_name || "承重信物"}** · ${metaphor.metaphor_theme || "核心隐喻"}`);
      }

      if (metaphor?.action_detail) {
        lines.push(`- **物理微动作**: ${metaphor.action_detail}`);
      }

      if (shot.action) {
        lines.push(`- **画面动作**: ${shot.action.trim()}`);
      }

      if (shot.dialogue) {
        const emotion = shot.dialogue_emotion ? `（${shot.dialogue_emotion}）` : "";
        lines.push(`- **对白台词**: ${emotion}“${shot.dialogue.trim()}”`);
      }

      if (shot.audio_strategy && shot.audio_strategy !== "native_av") {
        lines.push(`- **音频策略**: ${shot.audio_strategy}`);
      }

      if (shot.storyboard_image_url && shot.storyboard_image_url.trim()) {
        lines.push(`- **分镜图示**: ![镜头 #${shotOrder} 画面](${shot.storyboard_image_url.trim()})`);
      }

      lines.push("");
    });
  });

  lines.push("---");
  lines.push("*本生产交接文档由 StoryBoarding 智能导演与剧作工作台统一生成*");

  return lines.join("\n");
}

/**
 * Generates and triggers browser download of the screenplay markdown document.
 */
export function exportScreenplayToMarkdown(
  project: ProjectModel | null,
  sequences: SequenceModel[],
  options: MarkdownExportOptions = {}
): void {
  if (!project) {
    throw new Error("工程数据不存在");
  }

  const content = generateScreenplayMarkdownContent(project, sequences, options);
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const safeTitle = (project.title || "StoryBoarding").replace(/[\\/*?:"<>| \n\t\r,，。！!？"'“”]/g, "_");
  const scopeTag = options.scope === "current" ? "单集精编版" : "全剧交接版";
  const dateTag = new Date().toISOString().slice(0, 10);

  const link = document.createElement("a");
  link.href = url;
  link.download = `${safeTitle}_编剧手记与交接台本_${scopeTag}_${dateTag}.md`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
