import { ProjectListItem } from "@/lib/api";

export interface StarterTemplate {
  id: string;
  title: string;
  badge: string;
  duration: number;
  storyTitle: string;
  desc: string;
  gradient: string;
}

export const STARTER_TEMPLATES: StarterTemplate[] = [
  {
    id: "fantasy_creature",
    title: "⚡ 8s 奇幻生物探索",
    badge: "3 镜 · 尺度反差",
    duration: 8,
    storyTitle: "特立独行的小飞猪",
    desc: "一只特立独行飞行的粉色小猪，戴着红色小围巾在晚霞中的哥特魔法古堡群尖顶间翱翔探索。",
    gradient: "from-sky-500/20 via-sky-500/5 to-transparent border-sky-500/30 text-sky-300",
  },
  {
    id: "cyber_glider",
    title: "🎥 20s 未来机械预告",
    badge: "6 镜 · 起承转合",
    duration: 20,
    storyTitle: "赛博滑翔鼠",
    desc: "一只机灵活泼的小松鼠驾驶着复古机械滑翔翼，在未来赛博都市摩天大楼与发光全息广告牌间穿梭避障。",
    gradient: "from-purple-500/20 via-purple-500/5 to-transparent border-purple-500/30 text-purple-300",
  },
  {
    id: "matrix_combat",
    title: "🥋 30s 终极动作大片",
    badge: "12 镜 · 子弹时间",
    duration: 30,
    storyTitle: "黑客帝国：雨夜茶馆决战",
    desc: "雨夜赛博朋克茶馆前，黑客墨客遭遇矩阵特工银狐，展开一场咏春拳与360度子弹时间的终极对决。",
    gradient: "from-emerald-500/20 via-emerald-500/5 to-transparent border-emerald-500/30 text-emerald-300",
  },
  {
    id: "classical_garden",
    title: "🏮 15s 东方古典国风",
    badge: "6 镜 · 诗意水墨",
    duration: 15,
    storyTitle: "大观园雪景寻梅",
    desc: "冬日大观园雪景，古典亭台楼阁与荷塘残雪，身穿朱红云锦斗篷的人物缓步踏过石桥，回眸凝望落雪。",
    gradient: "from-amber-500/20 via-amber-500/5 to-transparent border-amber-500/30 text-amber-300",
  },
];

export const OFFICIAL_SAMPLE_PROJECTS: ProjectListItem[] = [
  {
    id: "6f01c422-48ea-4796-afc7-09cc6447f764",
    user_id: "demo",
    title: "合约恋人",
    story: "苏晓为治疗母亲病情放弃学业时，室友宋知远亮出资助人身份并拿出当年暗藏条款的合约。两人从对抗到发现彼此伤痕——宋知远妹妹曾因放弃梦想自杀，而苏晓母亲实则希望女儿继续学业。当医院催款单与录取通知书同时送达，宋知远变卖收藏替她缴费，苏晓终于看懂这份偏执守护。最终她带着两人的期待重返校园。",
    target_duration: 180,
    shot_count: 18,
    cover_image_url: "https://storyboarding-api.caifu.social/api/assets/shots/6434ca0b-737e-4a72-96e6-0e64c587958e.jpg",
    preview_images: ["https://storyboarding-api.caifu.social/api/assets/shots/6434ca0b-737e-4a72-96e6-0e64c587958e.jpg"],
    style_config: {},
    sequences: [],
    created_at: "2026-09-04 15:59:37",
    updated_at: "2026-09-04T16:00:20.989Z",
  },
  {
    id: "2792deae-5f60-4246-850a-56b93eaf790a",
    user_id: "demo",
    title: "本草劫",
    story: "为治疗怪病被献祭的阿蘅逃进深山，发现所谓瘟疫竟是权贵投毒。她救下追捕她的盲将军裴回，用百草汁液缓解他的蚀目之痛。当发现刺史要焚烧所有患病女子时，裴回教她兵法布阵，她教他听药辨症。最终阿蘅将计就计喝下毒酒，借脉搏变化传递刺史府地图；裴回则带兵杀入火场，用她调制的药烟让敌军自相残杀。",
    target_duration: 180,
    shot_count: 18,
    cover_image_url: "https://storyboarding-api.caifu.social/api/assets/shots/23dd000d-4b9d-4349-b005-4305a7bd8a6d.jpg",
    preview_images: [
      "https://storyboarding-api.caifu.social/api/assets/shots/23dd000d-4b9d-4349-b005-4305a7bd8a6d.jpg",
      "https://storyboarding-api.caifu.social/api/assets/shots/324ded61-56d4-4275-a38d-76fdfd285644.jpg",
    ],
    style_config: {},
    sequences: [],
    created_at: "2026-09-04 01:22:36",
    updated_at: "2026-09-04 01:22:36",
  },
];
