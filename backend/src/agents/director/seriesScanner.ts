// Macro Narrative Scanner (Stage 1: Long-form Series Ingestion & Multi-Episode Decomposition)

export interface ScannedCharacter {
  name: string;
  role: "protagonist" | "antagonist" | "supporting";
  personality: string;
  visual_anchor: string; // Pure English Visual DNA Anchor for cross-episode consistent prompting
  role_archetype?: "protagonist" | "main_opponent" | "fake_ally" | "moral_critic" | "supporting";
  attacks_flaw?: string;
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
  series_engine?: {
    tacit_contract: string;
    unity_of_opposites: string;
    subtext_landmines: string[];
    bonding_items: string[];
  };
}

export function getSeriesScannerPrompt(targetEpisodes: number = 3): string {
  return `你是一位好莱坞顶级剧本架构师与爆款短剧总制片人 (Hollywood Narrative Architect & Short Drama Showrunner)。
你的使命是将用户提供的【长篇小说章节 / 连续剧本 / 故事长文】，深度解构成一套【多集短剧系列工程 (Multi-Episode Series)】。

【经典影视剧作解构核心三大法则 (SCREENWRITING ENGINE PRINCIPLES)】:
1. 【长文剪裁三步法 (Copy-Delete-Adapt · 复制-删除-改编)】:
   - 彻底删除 (Delete): 删去原著中非视觉化的冗长心理说明、世界观背景灌输、以及日常琐碎寒暄；
   - 精准复制 (Copy): 保留原著中最震撼的“戏眼 (Core Dramatic Attraction)”与最核心的高概念冲突；
   - 动作改编 (Adapt): 把一切被动叙述与案头回忆，全部改编为当下可见的物理动作、权力博弈与双向试探。

2. 【角色对抗网络与欲望缺陷 (Character Engine & Fatal Flaw)】:
   - 准确提炼故事中的 2~4 位核心出场人物（主角 protagonist、对手 antagonist、重要配角 supporting）；
   - 人设提炼必须包含其【核心欲望 (Want) 与致命软肋 (Flaw)】，对手必须给主角施加窒息级压强；
   - 为每位角色编写专用的【纯英文视觉基因锚点 (visual_anchor)】，详细描述面容、年龄、发型、标志性服饰与体貌特征（纯英文，严禁任何中文，供文生图模型统一人物长相）。

3. 【特鲁比四角对立与系列引擎 (Truby Four-Corner Opposition & Series Engine Bible)】:
   - 【默契契约 (Tacit Contract)】: 提炼双方心照不宣但绝不可打破的保密/生存底线；
   - 【对立统一纽带 (Unity of Opposites)】: 提炼为何彼此敌对却绝无法分道扬镳的物理/命运牢笼；
   - 【潜台词地雷 (Subtext Landmines)】: 2~3 条角色心知肚明但绝不能当面点破的禁忌真相；
   - 【承重信物 (Bonding Items)】: 1~2 件承载核心悬念与情感变迁的关键道具；
   - 为角色标注角色位 role_archetype (protagonist, main_opponent, fake_ally, moral_critic, supporting) 及所攻击的主角致命缺陷 attacks_flaw。

4. 【四级悬念出幕卡点 (Four-Tier Cliffhanger Architecture)】:
   - 将长文本顺畅地切分为 ${targetEpisodes} 集（每集预计 60~90 秒）；
   - 【第 1 集】：开篇 3 秒必须直切危机切口或生死动作，严禁铺垫；集尾留下强引线；
   - 【中间各集】：采用奥贝格信息管理法则（悬疑/意外/戏剧性讽刺），危机层层加码，退路彻底封死；
   - 【集尾生死卡点 (cliffhanger_hook)】：每一集结尾必须属于以下四级悬念之一：
     * Tier 1 [物理绝境]: 枪口抬起、致命倒计时、物理退路封死；
     * Tier 2 [认知颠覆]: 目睹至亲背叛、真假身份当场翻转、旧细节瞬间具有第二层恐怖含义；
     * Tier 3 [伦理绝杀]: 被迫在两个不可挽回的代价中二选一；
     * Tier 4 [规则毁灭]: 底层游戏规则或所处世界的真相彻底颠覆。

【输出格式规范 (STRICT JSON ONLY)】:
请输出且仅输出合法 JSON 格式，顶层结构如下：
{
  "series_title": "精炼霸气的短剧标题 (如：雨夜斩神：破晓之刃)",
  "logline": "一句话核心高概念与戏剧冲突梗概 (包含主角、核心阻碍与不可挽回的代价)",
  "series_engine": {
    "tacit_contract": "双方心照不宣的利益或保密底线",
    "unity_of_opposites": "双方被迫捆绑共处、绝无法独自脱身的物理/契约纽带",
    "subtext_landmines": ["禁忌真相 1", "禁忌真相 2"],
    "bonding_items": ["承重信物 1", "承重信物 2"]
  },
  "characters": [
    {
      "name": "角色中文名 (如：林风)",
      "role": "protagonist",
      "role_archetype": "protagonist",
      "attacks_flaw": "执念于为家族昭雪，害怕被揭露当年冒名顶替的自卑心",
      "personality": "人设性格、核心欲望与致命弱点",
      "visual_anchor": "Pure English description of physical appearance, facial features, hairstyle, signature attire, and lighting tone"
    }
  ],
  "episodes": [
    {
      "episode_number": 1,
      "title": "单集标题 (如：第 1 集 · 破晓入局)",
      "act_type": "hook",
      "target_duration": 60,
      "synopsis": "该集 100 字左右的核心剧情与叙事弧线 (以动作和权力位移为导向)",
      "cliffhanger_hook": "集尾绝境卡点描述 (注明属于何种悬念级，并描述定格瞬间)",
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
    series_engine: {
      tacit_contract: "在未彻底查清幕后真相之前，双方绝不在公开场合彻底撕破脸皮。",
      unity_of_opposites: "双方被卷入同一宗不可言说的绝密纷争，任何一方出局都会导致共同覆灭。",
      subtext_landmines: [
        "当年导致一切开端的真正元凶线索绝不能提前外泄",
        "彼此心中都清楚对方隐瞒了一半身份，但谁也不能当面挑明",
      ],
      bonding_items: ["承载身份悬念的遗留信物", "记录关键罪证的残卷"],
    },
    characters: [
      {
        name: "主角",
        role: "protagonist",
        role_archetype: "protagonist",
        attacks_flaw: "执念于追求最终真相，但受困于不愿连累无辜的道义软肋",
        personality: "冷静果决，具备极强洞察力与临场应变能力，背负不可言说的过往。",
        visual_anchor: "A determined young protagonist with sharp observant eyes, stylish windbreaker, athletic build, 35mm cinematic lighting, highly detailed face",
      },
      {
        name: "对手",
        role: "antagonist",
        role_archetype: "main_opponent",
        attacks_flaw: "以绝对实力逼迫主角，精准刺痛其退无可退的心理破绽",
        personality: "深不可测的反派首领，手段凌厉狠辣，掌握庞大资源与致命秘密。",
        visual_anchor: "A shadowy charismatic antagonist in tailored black attire, cold calculating gaze, dramatic rim lighting, intense cinematic atmosphere",
      },
      {
        name: "盟友",
        role: "supporting",
        role_archetype: "fake_ally",
        attacks_flaw: "表面施以援手，暗中试探主角底线以达成自身隐藏目的",
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
            series_engine: parsed.series_engine || generateHeuristicSeriesPlan(clean, targetEpisodes).series_engine,
            characters: Array.isArray(parsed.characters) && parsed.characters.length > 0
              ? parsed.characters.map((c: any) => ({
                  name: c.name || "主要角色",
                  role: c.role || "protagonist",
                  role_archetype: c.role_archetype || (c.role === "antagonist" ? "main_opponent" : "protagonist"),
                  attacks_flaw: c.attacks_flaw || "背负各自的利益诉求与生存执念",
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
