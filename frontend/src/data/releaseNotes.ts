export interface ReleaseChangeGroup {
  type: "highlight" | "improvement" | "fix";
  label: string;
  items: Array<{
    title: string;
    description: string;
  }>;
}

export interface ReleaseNote {
  version: string;
  title: string;
  date: string;
  badge?: string;
  isLatest?: boolean;
  summary: string;
  changeGroups: ReleaseChangeGroup[];
}

export const RELEASE_NOTES: ReleaseNote[] = [
  {
    version: "v2.2.0",
    title: "四阶段制作闭环、视频与对白生产工作流",
    date: "2026-09-12",
    badge: "最新版本",
    isLatest: true,
    summary:
      "工作台现已收拢为准备、分镜、审片与交付四个连续阶段，并补齐视频生成、对白配音、候选素材选择、成片归档与成本记录。角色定妆、导演资产库、首页和项目看板也同步完成整合，让新建工程、制作镜头和交付成片之间的路径更直接。",
    changeGroups: [
      {
        type: "highlight",
        label: "🎬 从分镜到交付的制作闭环",
        items: [
          {
            title: "四阶段导演工作台",
            description:
              "准备、分镜、审片、交付成为工作台内连续可切换的四个阶段；制作看板直接嵌入交付阶段，减少在多个弹窗之间往返。",
          },
          {
            title: "MiniMax H3 视频生成与候选片段管理",
            description:
              "可从镜头发起异步视频生成、查看任务进度，并在多个候选片段之间采用或淘汰；系统同时防止重复提交造成额外计费。",
          },
          {
            title: "画面、对白与成片资产统一交付",
            description:
              "交付阶段分别管理视频与对白音轨，最终素材持久保存至 R2，并记录生成时长与费用，避免临时链接过期后无法回看。",
          },
        ],
      },
      {
        type: "improvement",
        label: "🎭 角色、声音与导演资产",
        items: [
          {
            title: "OpenRouter 配音模型与即时试听",
            description:
              "设置页提供 18 个可配置的语音模型及对应音色预设；修改女声、男声或旁白音色后，可直接试听“你好，世界”再进入正式制作。",
          },
          {
            title: "角色定妆照完整工作流",
            description:
              "角色页支持生成兼顾面部近景与正侧背转面的定妆参考图，并针对 16:9 桌面工作台和 9:16 移动端提供对应布局。",
          },
          {
            title: "导演选角与资产名册",
            description:
              "全局素材库升级为可筛选、查看和复用的角色、场景与道具名册，工程内生成的素材与全局资产之间可以双向流转。",
          },
          {
            title: "首页与项目看板减负",
            description:
              "首页聚焦故事输入与精选样片，项目看板增加最近工程、画幅筛选和排序；重复入口、装饰标签及无效弹窗被移除。",
          },
        ],
      },
      {
        type: "fix",
        label: "🛡️ 访问、生成与播放稳定性",
        items: [
          {
            title: "官方精选样片恢复公开只读访问",
            description:
              "未登录访客和普通账号均可打开官方样片工程；遇到旧凭证导致的 401/403 时，前端会自动切换到演示凭证并重试。",
          },
          {
            title: "竖屏视频生成与媒体播放保护",
            description:
              "9:16 视频生成会保留首帧约束以维持画面连续性，R2 媒体支持分段读取，较长音视频可以拖动进度并稳定续播。",
          },
          {
            title: "工程数据与权限边界加固",
            description:
              "刷新页面或切换剧集时保留剧本和分集身份；项目、素材及核心制作接口统一执行所有权校验，减少串项与越权访问风险。",
          },
        ],
      },
    ],
  },
  {
    version: "v2.1.0",
    title: "Director Studio 商业短剧标准导演台 & 全链路安全闭环",
    date: "2026-09-06",
    badge: "重磅里程碑",
    isLatest: false,
    summary:
      "全面对齐 Director Studio 短剧制作基准，实现从原著小说抽核、四象限结构取舍与爽点雷达、剧组视觉设定集、文学分镜双向拆解、顺场排期到全屏动态预演的全链路体验闭环，并对公共演示与安全红线实施全方位前置防护。",
    changeGroups: [
      {
        type: "highlight",
        label: "🎬 Director Studio 专业短剧创作流",
        items: [
          {
            title: "STAGE 01 · 改编取舍与爽点雷达工作室",
            description:
              "原著小说核心提炼、四象限（保留/砍掉/合并/风险）结构取舍与 Gate 2 爽点节拍门控（maxBeatGap ≤ 3 集），支持一键导出剧本围读 Markdown 会审通告与 .md 文件下载。",
          },
          {
            title: "Cinema Theater 全屏放映影院系统",
            description:
              "沉浸式暗场播放，支持 Ken Burns 运镜动态视差、字幕打字机（C键）、连播模式（B键）、分镜头播放进度条与全套导演快捷键体系。",
          },
          {
            title: "顺场表 (Call Sheet) 智能排期与 H3 连贯提示词",
            description:
              "按「拍摄空间 + 光影氛围」聚类归并生产批次，支持一键生成并复制 MiniMax Hailuo H3 视频生成提示词，以及一键导出 CSV 剧组排期表。",
          },
          {
            title: "台本脏状态检测与分镜自愈重绘",
            description:
              "台本动作或对白修改后即时标记镜头脏状态，支持原位重新冲印显影与一键全剧本复制。",
          },
        ],
      },
      {
        type: "improvement",
        label: "🎨 交互与工作台流转优化",
        items: [
          {
            title: "跨剧集切换状态联动清理",
            description:
              "切换 EP 剧集时，自动关闭已打开的抽屉、重置分镜选中项至新集首镜，并在顺场表中智能重置局部搜索与折叠状态，杜绝空屏与镜头丢失假象。",
          },
          {
            title: "工程体检雷达 (Radar) 智能跳转与修复",
            description:
              "体检雷达诊断项细分通过/警告/失败状态，针对未达标规范提供高亮「立即修复」与「查看设定」快捷跳转。",
          },
          {
            title: "分镜卡片批量锁定与解锁保护",
            description:
              "故事板面板支持一键全选锁定或解除锁定，有效保护已有优质分镜不被批量重绘意外覆盖。",
          },
        ],
      },
      {
        type: "fix",
        label: "🛡️ 演示体验与安全红线闭环",
        items: [
          {
            title: "公共 Demo 资源消耗全链路前置拦截",
            description:
              "在 AI 智能拆镜、3步向导、剧组设定集、脚本导入与爆点重构中全面接入 checkAuthAndKey，剔除虚假就绪绿标，统一换装琥珀金引导按钮，杜绝 Demo 模式违规耗费资源。",
          },
          {
            title: "系统设置入口与个人专属账号引导",
            description:
              "针对 Demo 体验账号点击顶栏设置齿轮与用户菜单进行友好拦截，智能引导注册专属导演账号以保障用户私密 API Key 安全。",
          },
        ],
      },
    ],
  },
  {
    version: "v1.3.0",
    title: "5分钟短剧高能叙事引擎 & 节奏大师",
    date: "2026-09-05",
    isLatest: false,
    summary:
      "针对快节奏短剧创作深度定制，引入前30秒高能黄金律与四幕因果推进法则，让分镜叙事更抓人、悬念更扣人心弦。",
    changeGroups: [
      {
        type: "highlight",
        label: "✨ 核心重磅升级",
        items: [
          {
            title: "爆款短剧前30秒黄金律",
            description:
              "AI 导演在分镜编排中主动植入「0-3s入画抓人」、「3-10s危机加压」与「10-30s悬念揭牌」，杜绝开头平淡无奇，让每一秒都牢牢抓住观众眼球。",
          },
          {
            title: "四幕因果递进逻辑",
            description:
              "分镜结构升级为「启动·建置 - 升级·逼迫 - 假高潮·质变 - 兑现·反转」，剧情环环相扣，告别流水账式的镜头堆砌。",
          },
          {
            title: "12 大经典短剧结构原型一键切换",
            description:
              "大女主觉醒、男频逆袭翻盘、真假身份对峙、豪门商战修罗场、无限流穿书等12大爆款题材经典范式即选即用，生成针对性极强的戏剧冲突。",
          },
        ],
      },
      {
        type: "improvement",
        label: "🎨 体验与交互优化",
        items: [
          {
            title: "叙事风格选择器更直观",
            description:
              "在看板创建工程和工作台顶部均可随时切换经典电影、5分钟短剧与商业广告模式，操作顺畅丝滑。",
          },
          {
            title: "分镜卡片新增因果与节奏便签",
            description:
              "在镜头列表中可清晰看清每个镜头处于哪一幕阶段（如启动、加压、反转），掌控全局更轻松。",
          },
        ],
      },
      {
        type: "fix",
        label: "⚡ 稳定性与效率提升",
        items: [
          {
            title: "离线自适应分镜一致性优化",
            description:
              "即便在离线或降级状态下，系统也能精准推导镜头因果律与时间卡点，保障输出质量始终如一。",
          },
        ],
      },
    ],
  },
  {
    version: "v1.2.0",
    title: "移动端全功能深度适配 & 触控手感优化",
    date: "2026-09-04",
    summary:
      "全面优化手机端的使用体验，无论是在手机浏览器中查看分镜、微调台词还是全屏预演，都能得心应手。",
    changeGroups: [
      {
        type: "highlight",
        label: "✨ 核心体验升级",
        items: [
          {
            title: "手机端工作台专属三段式切换",
            description:
              "手机屏幕不再拥挤！提供「分镜流」、「剧本大师」与「全片动态」顶部标签页，随时一键单指滑动切换。",
          },
          {
            title: "移动端全屏剧场沉浸式播放",
            description:
              "手机端进入剧场播放时，采用上下自适应大画幅与大字号字幕，手势轻点即可切镜暂停，看片更带感。",
          },
        ],
      },
      {
        type: "improvement",
        label: "🎨 细节改进",
        items: [
          {
            title: "快捷体验通道（VIP 演示账户）",
            description:
              "新朋友无需注册繁琐信息，点击登录弹窗顶部的「快速体验通道」即可秒速进入系统体验全部核心功能。",
          },
          {
            title: "工作台按键防误触保护",
            description:
              "对删除镜头、重置脚本等关键操作增加了二次确认与更清晰的状态提示，避免手指误触丢失创意。",
          },
        ],
      },
      {
        type: "fix",
        label: "⚡ 性能与稳定性",
        items: [
          {
            title: "杜绝频繁连击重复创建",
            description:
              "增加前后端双重防护，防止弱网环境下由于重复点击导致创建多份相同的工程项目。",
          },
        ],
      },
    ],
  },
  {
    version: "v1.1.0",
    title: "多集连续剧总架构师 & 剧本分镜实时联动",
    date: "2026-09-03",
    summary:
      "突破单支短片限制，支持长篇连续故事自动编排分集大纲；支持剧本主视图与镜头卡片双向无损联动。",
    changeGroups: [
      {
        type: "highlight",
        label: "✨ 重磅功能上线",
        items: [
          {
            title: "长篇多集连续剧规划器",
            description:
              "只需给出一句话灵感或长篇小说片段，系统自动帮您规划多集分集大纲、核心悬念卡点与起承转合结构。",
          },
          {
            title: "剧本总览与分镜卡片双向互通",
            description:
              "在剧本视图中直接改写剧情，自动精准同步到各个镜头，无需手动一个一个复制粘贴。",
          },
          {
            title: "严格出场角色锁定",
            description:
              "支持限定主要出场人物，避免 AI 在生成台词和对手戏时凭空捏造无关的闲杂角色，让人物关系更聚焦。",
          },
        ],
      },
      {
        type: "improvement",
        label: "🎨 界面打磨",
        items: [
          {
            title: "一句话爆款灵感生成器",
            description:
              "创作没灵感时，在看板大厅点击「灵感激发」，即可随机生成高戏剧张力的题材与人设方案。",
          },
        ],
      },
    ],
  },
  {
    version: "v1.0.0",
    title: "AI Director Studio 官方首发",
    date: "2026-09-01",
    summary:
      "双向协同 AI 导演工作台正式上线，让每个人都能轻松把故事变成高质量视觉分镜画卷。",
    changeGroups: [
      {
        type: "highlight",
        label: "✨ 核心能力首发",
        items: [
          {
            title: "智能拆解专业视听分镜",
            description:
              "输入故事梗概，瞬间生成包含景别（特写/全景）、运镜（推拉摇移）、机位视角、情绪电压与音效配乐的专业分镜单。",
          },
          {
            title: "2.39:1 / 16:9 影视画幅动态画卷",
            description:
              "支持主流宽高比画幅，自动保持角色外观与环境基石的视觉连续性，拒绝跳戏与面部崩坏。",
          },
          {
            title: "高清分镜表单导出",
            description:
              "支持一键导出包含台词、机位图、画面提示词的完整分镜表单（PNG 长图、Markdown 剧本与高清原图打包）。",
          },
        ],
      },
    ],
  },
];

export function getLatestRelease(): ReleaseNote {
  return RELEASE_NOTES[0];
}
