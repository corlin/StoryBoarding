export type NarrativeMode = "hollywood" | "drama_5min" | "commercial";
export type NarrativeCenter = "character" | "creative" | "plot";

export interface StructuralArchetypeOption {
  id: string;
  name: string;
  category?: string;
}

export const NARRATIVE_MODES: Array<{
  id: NarrativeMode;
  label: string;
  desc: string;
}> = [
  { id: "hollywood", label: "好莱坞大片", desc: "经典六阶段与宽银幕" },
  { id: "drama_5min", label: "5分钟爆款短剧", desc: "30s黄金钩子 & 四幕因果" },
  { id: "commercial", label: "商业广告快剪", desc: "高燃视觉与紧凑动势" },
];

export const NARRATIVE_CENTERS: Array<{
  id: NarrativeCenter;
  label: string;
}> = [
  { id: "plot", label: "强剧情向 (困境抉择/立即危机)" },
  { id: "character", label: "角色向 (极致反差/性格缺陷)" },
  { id: "creative", label: "创意向 (脑洞奇观/反常规则)" },
];

export const STRUCTURAL_ARCHETYPES: StructuralArchetypeOption[] = [
  { id: "single_space_standoff", name: "1. 单空间高压对峙型" },
  { id: "countdown_rules", name: "2. 倒计时规则收缩型" },
  { id: "trade_escalation", name: "3. 交易代价升级型" },
  { id: "identity_reveal", name: "4. 身份/关系错位揭底型" },
  { id: "flawed_solution_backfire", name: "5. 错误解法反噬型" },
  { id: "ritual_interruption", name: "6. 仪式中断与夺权型" },
  { id: "system_runaway", name: "7. 系统失控推演型 (科幻)" },
  { id: "multiverse_rashomon", name: "8. 多维视角塌缩/罗生门" },
  { id: "absurd_rules_swap", name: "9. 绝对规则置换型 (寓言)" },
  { id: "memory_tampering", name: "10. 记忆/认知篡改型" },
  { id: "loop_overdraft", name: "11. 困境死循环/代价透支" },
  { id: "concept_predation", name: "12. 概念具象化掠夺型" },
];
