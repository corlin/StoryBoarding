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
    version: "v1.3.0",
    title: "5分钟短剧高能叙事引擎 & 节奏大师",
    date: "2026-09-05",
    badge: "今日最新",
    isLatest: true,
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
              "在看板创建工程和工作台顶部均可随时切换好莱坞经典电影、5分钟短剧与商业广告模式，操作顺畅丝滑。",
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
      "首款好莱坞电影级双向协同 AI 导演工作台正式上线，让每个人都能轻松把故事变成电影级视觉画卷。",
    changeGroups: [
      {
        type: "highlight",
        label: "✨ 核心能力首发",
        items: [
          {
            title: "智能拆解好莱坞视听分镜",
            description:
              "输入故事梗概，瞬间生成包含景别（特写/全景）、运镜（推拉摇移）、机位视角、情绪电压与音效配乐的专业分镜单。",
          },
          {
            title: "2.39:1 / 16:9 影视画幅动态画卷",
            description:
              "支持电影级宽高比画幅，自动保持角色外观与环境基石的视觉连续性，拒绝跳戏与面部崩坏。",
          },
          {
            title: "高清工业级分镜表单导出",
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
