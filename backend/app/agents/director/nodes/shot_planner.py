from typing import Dict, Any
from app.agents.director.state import DirectorState
from app.agents.director.prompts.director_prompts import SHOT_PLANNING_SYSTEM_PROMPT
from app.providers.llm.base import BaseLLMProvider

async def shot_planner_node(state: DirectorState, provider: BaseLLMProvider) -> Dict[str, Any]:
    theme = state.get("theme")
    beats = state.get("narrative_beats", [])
    target_duration = state.get("target_duration", 30.0)

    user_prompt = f"""
主题: {theme}
目标时长: {target_duration} 秒
戏剧节拍: {beats}

请为该场景规划镜头列表（规划 6 个左右的关键分镜，总时长控制在 {target_duration} 秒左右）。
"""

    result = await provider.generate_json(
        system_prompt=SHOT_PLANNING_SYSTEM_PROMPT,
        user_prompt=user_prompt
    )

    return {
        "shot_outlines": result.get("shots", []),
        "current_step": "shots_planned",
        "progress_percentage": 50
    }
