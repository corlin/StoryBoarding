// Series Engine & Four-Corner Opposition Extractor (Screenwriting Skills Engine Integration)

export interface SeriesEngineResult {
  series_engine: {
    tacit_contract: string; // 双方心照不宣但绝不可打破的戏剧底线/默契契约
    unity_of_opposites: string; // 将对立双方死死绑定在同一困境中的物理/情感纽带
    subtext_landmines: string[]; // 全剧角色心知肚明但绝不能当面戳破的禁忌地雷
    bonding_items: string[]; // 承载核心悬念与情感变迁的核心信物
  };
  character_alignments: Array<{
    name: string;
    role_archetype: "protagonist" | "main_opponent" | "fake_ally" | "moral_critic" | "supporting";
    attacks_flaw: string; // 刺向主角的核心弱点/自身道德执念
  }>;
}

export function getSeriesEnginePrompt(): string {
  return `你是一位好莱坞资深剧作顾问与特鲁比编剧学派导师 (Hollywood Screenplay Consultant & John Truby Story Expert)。
请基于提供的【故事梗概/剧本内容】以及【核心角色列表】，提炼出驱动全剧冲突永不枯竭的【系列引擎 (Series Engine Bible)】与【特鲁比四角对立网络 (Truby Four-Corner Opposition)】。

【核心剧作理论指引】:
1. 【默契契约 (Tacit Contract)】:
   - 敌对或纠缠的双方之间，虽无明文协议，但共同恪守一条“绝不掀桌/共同保守秘密/绝不率先动用某种底牌”的心理红线。
2. 【对立统一纽带 (Unity of Opposites)】:
   - 为什么他们彼此敌对却绝无法分道扬镳？必须存在一个不可动摇的物理、契约或命运牢笼将他们锁死在一起（同乘一条漏水的船）。
3. 【潜台词地雷 (Subtext Landmines)】:
   - 角色之间心知肚明但绝不可公开点破的敏感真相。一旦某人在某集台词中不小心擦边踩雷，张力瞬间拉满。
4. 【特鲁比四角对立 (Four-Corner Opposition)】:
   - 为出场人物分配角色位：
     * protagonist (主角): 具备致命性格缺陷 (Fatal Flaw) 与核心渴望；
     * main_opponent (主要对手): 最无情且最精准攻击主角致命缺陷的人，逼迫主角进化；
     * fake_ally (假盟友对手): 表面是主角同盟，实则怀揣完全不同的隐秘目的，暗中试探主角底线；
     * moral_critic (道义对手/道德审判者): 从道义、伦理或规则角度拷问主角选择的人；
     * supporting (其他重要支撑角色)。

【输出格式规范 (STRICT JSON ONLY)】:
{
  "series_engine": {
    "tacit_contract": "双方心照不宣的利益或保密底线（50字以内）",
    "unity_of_opposites": "双方被迫捆绑共处、绝无法独自脱身的物理/契约纽带（50字以内）",
    "subtext_landmines": [
      "禁忌真相 1：例如林风当年冒名顶替的军功档案并未销毁",
      "禁忌真相 2：冷月早已知晓林风是仇人之子但需借其刀复仇"
    ],
    "bonding_items": ["染血的断玉佩", "加密的绝密账册"]
  },
  "character_alignments": [
    {
      "name": "林风",
      "role_archetype": "protagonist",
      "attacks_flaw": "执念于复仇与自我证明，害怕被揭穿寒门冒名顶替的自卑心理"
    },
    {
      "name": "冷月",
      "role_archetype": "main_opponent",
      "attacks_flaw": "精准利用林风对真相的狂热渴求，步步紧逼其承认自身道义上的伪善"
    }
  ]
}
`;
}

export function generateHeuristicSeriesEngine(
  story: string,
  charactersList: Array<{ name: string; role?: string }>
): SeriesEngineResult {
  const cleanStory = (story || "").trim();
  const chars = charactersList && charactersList.length > 0
    ? charactersList
    : [{ name: "主角", role: "protagonist" }, { name: "对手", role: "antagonist" }];

  const alignments = chars.map((c, idx) => {
    let archetype: "protagonist" | "main_opponent" | "fake_ally" | "moral_critic" | "supporting" = "supporting";
    let attacksFlaw = "背负各自的利益诉求与生存执念";

    if (c.role === "protagonist" || idx === 0) {
      archetype = "protagonist";
      attacksFlaw = "执念于追求最终真相，但受困于不愿连累无辜的道义软肋";
    } else if (c.role === "antagonist" || idx === 1) {
      archetype = "main_opponent";
      attacksFlaw = "以绝对实力逼迫主角，精准刺痛其退无可退的心理破绽";
    } else if (idx === 2) {
      archetype = "fake_ally";
      attacksFlaw = "表面施以援手，暗中试探主角底线以达成自身隐藏目的";
    } else if (idx === 3) {
      archetype = "moral_critic";
      attacksFlaw = "站在正义与规则高点，时刻警示主角避免跨越人伦红线";
    }

    return {
      name: c.name,
      role_archetype: archetype,
      attacks_flaw: attacksFlaw,
    };
  });

  return {
    series_engine: {
      tacit_contract: "在未彻底查清幕后真相之前，双方绝不在公开场合彻底撕破脸皮。",
      unity_of_opposites: "双方被卷入同一宗不可言说的绝密纷争，任何一方出局都会导致共同覆灭。",
      subtext_landmines: [
        "当年导致一切开端的真正元凶线索绝不能提前外泄",
        "彼此心中都清楚对方隐瞒了一半身份，但谁也不能当面挑明",
      ],
      bonding_items: ["承载身份悬念的遗留信物", "记录关键罪证的残卷"],
    },
    character_alignments: alignments,
  };
}

export async function extractSeriesEngine(
  story: string,
  charactersList: Array<{ name: string; role?: string; personality?: string }>,
  settings: {
    apiKey?: string;
    apiBase?: string;
    model?: string;
  } = {}
): Promise<SeriesEngineResult> {
  const clean = (story || "").trim();
  const apiKey = settings.apiKey?.trim();
  const apiBase = settings.apiBase?.trim() || "https://openrouter.ai/api/v1";
  const model = settings.model?.trim() || "deepseek/deepseek-chat";

  if (!apiKey || !clean) {
    return generateHeuristicSeriesEngine(clean, charactersList);
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000); // 25s timeout

    const promptChars = (charactersList || []).map((c) => `- ${c.name} (${c.role || "character"}): ${c.personality || "暂无性格"}`).join("\n");

    const resp = await fetch(`${apiBase.replace(/\/+$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": "https://storyboarding.caifu.social",
        "X-Title": "AI StoryBoarding Series Engine Extractor",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: getSeriesEnginePrompt() },
          {
            role: "user",
            content: `请为以下故事内容与登场角色提炼系列引擎（默契契约、对立统一纽带、潜台词地雷）与特鲁比四角对立网络：\n\n【故事剧情】:\n${clean.slice(0, 4000)}\n\n【登场角色】:\n${promptChars || "暂无特别角色设定"}`,
          },
        ],
        temperature: 0.5,
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

        if (parsed && parsed.series_engine) {
          return {
            series_engine: {
              tacit_contract: parsed.series_engine.tacit_contract || "双方在危机解除前维持心照不宣的均势。",
              unity_of_opposites: parsed.series_engine.unity_of_opposites || "共同的生死威胁使双方无法轻易分道扬镳。",
              subtext_landmines: Array.isArray(parsed.series_engine.subtext_landmines) ? parsed.series_engine.subtext_landmines : [],
              bonding_items: Array.isArray(parsed.series_engine.bonding_items) ? parsed.series_engine.bonding_items : [],
            },
            character_alignments: Array.isArray(parsed.character_alignments)
              ? parsed.character_alignments
              : generateHeuristicSeriesEngine(clean, charactersList).character_alignments,
          };
        }
      }
    }
  } catch (err) {
    console.warn("[extractSeriesEngine Warning]: Fallback to heuristic series engine due to:", err);
  }

  return generateHeuristicSeriesEngine(clean, charactersList);
}
