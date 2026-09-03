// Macro Narrative Scanner (Stage 1: Long-form Series Ingestion & Multi-Episode Decomposition)

export interface ScannedCharacter {
  name: string;
  role: "protagonist" | "antagonist" | "supporting";
  personality: string;
  visual_anchor: string; // Pure English Visual DNA Anchor for cross-episode consistent prompting
}

export interface ScannedEpisode {
  episode_number: number;
  title: string;
  act_type: "hook" | "escalation" | "crisis" | "reversal" | "climax";
  target_duration: number; // in seconds (e.g. 60, 75, 90)
  synopsis: string; // The core narrative arc of this episode
  cliffhanger_hook: string; // The specific unresolved tension/peril at the final frame
  featured_characters: string[];
}

export interface SeriesScanResult {
  series_title: string;
  logline: string;
  characters: ScannedCharacter[];
  episodes: ScannedEpisode[];
}

export function getSeriesScannerPrompt(targetEpisodes: number = 3): string {
  return `你是一位好莱坞顶级剧本架构师与爆款短剧总制片人 (Hollywood Narrative Architect & Short Drama Showrunner)。
你的使命是将用户提供的【长篇小说章节 / 连续剧本 / 故事长文】，深度解构成一套【多集短剧系列工程 (Multi-Episode Series)】。

【核心解构四大约束 (CRITICAL ARCHITECTURAL CONSTRAINTS)】:
1. 【全局角色库提炼 (Character Roster & Visual DNA)】:
   - 准确提炼故事中的 2~4 位核心出场人物（标明主角 protagonist、反派 antagonist、重要配角 supporting）；
   - 为每位角色编写专用的【纯英文视觉基因锚点 (visual_anchor)】，详细描述其面容特征、年龄、发型发色、标志性服装、伤疤/饰品（纯英文，严禁带有任何中文字符，供后续生图模型统一长相与特征）；
   - 为每位角色提取简短生动的人设小传与戏剧动机 (personality)。

2. 【短剧成瘾性多集切分 (3~5 集高潮卡点切分)】:
   - 将长文本顺畅地切分为 ${targetEpisodes} 集（每集预计 60~90 秒）；
   - 【第 1 集】：开篇 3 秒必须有抓人悬念或生死抉择；集尾必须留下强引线；
   - 【中间各集】：危机层层升级，反派施压，秘密揭开；
   - 【集尾生死卡点 (Cliffhanger Hook)】：【极度重要】每一集的最后必须截断在最令人揪心、意想不到的突发变故或悬念瞬间（强迫观众点击下一集）。

3. 【输出格式规范 (STRICT JSON ONLY)】:
请输出且仅输出合法 JSON 格式，顶层结构如下：
{
  "series_title": "精炼霸气的短剧标题 (如：雨夜斩神：破晓之刃)",
  "logline": "一句话核心高概念与戏剧冲突梗概",
  "characters": [
    {
      "name": "角色中文名 (如：林风)",
      "role": "protagonist",
      "personality": "人设性格与动机 (如：隐忍坚毅的末代剑客，背负灭门血仇)",
      "visual_anchor": "Pure English description of physical appearance, facial features, hairstyle, signature attire, and lighting tone"
    }
  ],
  "episodes": [
    {
      "episode_number": 1,
      "title": "单集标题 (如：第 1 集 · 破晓入局)",
      "act_type": "hook",
      "target_duration": 60,
      "synopsis": "该集 100 字左右的核心剧情与叙事弧线",
      "cliffhanger_hook": "集尾绝境卡点描述 (如：拔剑瞬间，背后突然伸出一只机械鬼手……)",
      "featured_characters": ["林风", "冷月"]
    }
  ]
}
`;
}

// Heuristic Fallback Scanner when offline or without LLM keys
export function generateHeuristicSeriesPlan(rawText: string, targetEpisodes: number = 3): SeriesScanResult {
  const clean = (rawText || "").trim();
  const title = clean.slice(0, 16).trim() || "都市暗涌 · 绝地反击";

  return {
    series_title: `${title} · 短剧全集`,
    logline: clean.slice(0, 100) || "一场突如其来的危机打乱了所有计划，生死博弈在暗夜中悄然拉开序幕。",
    characters: [
      {
        name: "主角",
        role: "protagonist",
        personality: "冷静果决，具备极强洞察力与临场应变能力，背负不可言说的过往。",
        visual_anchor: "A determined young protagonist with sharp observant eyes, stylish windbreaker, athletic build, 35mm cinematic lighting, highly detailed face",
      },
      {
        name: "对手",
        role: "antagonist",
        personality: "深不可测的反派首领，手段凌厉狠辣，掌握庞大资源与致命秘密。",
        visual_anchor: "A shadowy charismatic antagonist in tailored black attire, cold calculating gaze, dramatic rim lighting, intense cinematic atmosphere",
      },
      {
        name: "盟友",
        role: "supporting",
        personality: "忠诚机敏的情报提供者，在关键时刻提供决定性转机。",
        visual_anchor: "A resourceful ally with alert expression, functional tech tactical jacket, moody neon ambient light",
      },
    ],
    episodes: Array.from({ length: targetEpisodes }, (_, i) => {
      const epNum = i + 1;
      if (epNum === 1) {
        return {
          episode_number: 1,
          title: "第 1 集 · 破晓入局",
          act_type: "hook" as const,
          target_duration: 60,
          synopsis: `故事开篇。${clean.slice(0, 80)}……突如其来的不速之客撕破了平静。`,
          cliffhanger_hook: "神秘倒计时启动，主角身陷绝境包围，退路已被彻底封死！",
          featured_characters: ["主角", "对手"],
        };
      } else if (epNum === targetEpisodes) {
        return {
          episode_number: epNum,
          title: `第 ${epNum} 集 · 终局对决`,
          act_type: "climax" as const,
          target_duration: 80,
          synopsis: "所有伏笔在此刻引爆，真相大白，主角与对手在风暴中心迎来终极一战。",
          cliffhanger_hook: "最后一击尘埃落定，镜头却在暗处扫到一个令人毛骨悚然的微缩徽章……",
          featured_characters: ["主角", "对手", "盟友"],
        };
      } else {
        return {
          episode_number: epNum,
          title: `第 ${epNum} 集 · 危机升级`,
          act_type: "escalation" as const,
          target_duration: 75,
          synopsis: "情报交锋与追逐升级，背叛与反间计层出不穷，双方底牌相继翻开。",
          cliffhanger_hook: "通讯器中突然传出最信任之人的告别声，随即信号被强行掐断！",
          featured_characters: ["主角", "盟友"],
        };
      }
    }),
  };
}

// Stage 1 Macro Scanner: Scans long text and extracts characters & multi-episode outlines
export async function scanLongformSeries(
  text: string,
  targetEpisodes: number = 3,
  settings: {
    apiKey?: string;
    apiBase?: string;
    model?: string;
  } = {}
): Promise<SeriesScanResult> {
  const clean = (text || "").trim();
  if (!clean) {
    return generateHeuristicSeriesPlan("新电影短剧企划", targetEpisodes);
  }

  const apiKey = settings.apiKey?.trim();
  const apiBase = settings.apiBase?.trim() || "https://openrouter.ai/api/v1";
  const model = settings.model?.trim() || "deepseek/deepseek-chat";

  if (!apiKey) {
    return generateHeuristicSeriesPlan(clean, targetEpisodes);
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 35000); // 35s timeout

    const resp = await fetch(`${apiBase.replace(/\/+$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": "https://storyboarding.caifu.social",
        "X-Title": "AI StoryBoarding Macro Series Scanner",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: getSeriesScannerPrompt(targetEpisodes) },
          {
            role: "user",
            content: `请深度解构以下长篇剧本或小说故事内容，输出标准 JSON 格式的多集短剧企划与全局角色库：\n\n${clean.slice(0, 6000)}`,
          },
        ],
        temperature: 0.6,
        response_format: { type: "json_object" },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (resp.ok) {
      const data: any = await resp.json();
      const contentStr = data.choices?.[0]?.message?.content;
      if (contentStr) {
        let parsed: any;
        try {
          parsed = JSON.parse(contentStr);
        } catch {
          const match = contentStr.match(/\{[\s\S]*\}/);
          if (match) parsed = JSON.parse(match[0]);
        }

        if (parsed && Array.isArray(parsed.episodes) && parsed.episodes.length > 0) {
          return {
            series_title: parsed.series_title || clean.slice(0, 16) + " · 短剧",
            logline: parsed.logline || clean.slice(0, 80),
            characters: Array.isArray(parsed.characters) && parsed.characters.length > 0
              ? parsed.characters.map((c: any) => ({
                  name: c.name || "主要角色",
                  role: c.role || "protagonist",
                  personality: c.personality || "性格沉稳有魄力",
                  visual_anchor: c.visual_anchor || "A distinctive character in 35mm cinematic film style",
                }))
              : generateHeuristicSeriesPlan(clean, targetEpisodes).characters,
            episodes: parsed.episodes.map((ep: any, idx: number) => ({
              episode_number: Number(ep.episode_number) || idx + 1,
              title: ep.title || `第 ${idx + 1} 集`,
              act_type: ep.act_type || (idx === 0 ? "hook" : idx === parsed.episodes.length - 1 ? "climax" : "escalation"),
              target_duration: Number(ep.target_duration) || 60,
              synopsis: ep.synopsis || "剧情持续推进中",
              cliffhanger_hook: ep.cliffhanger_hook || "生死未卜，悬念升级",
              featured_characters: Array.isArray(ep.featured_characters) ? ep.featured_characters : [],
            })),
          };
        }
      }
    }
  } catch (err) {
    console.warn("[scanLongformSeries Warning]: Fallback to heuristic series planner due to:", err);
  }

  return generateHeuristicSeriesPlan(clean, targetEpisodes);
}
