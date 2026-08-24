from typing import Dict, Any
from app.agents.director.state import DirectorState
from app.agents.director.prompts.director_prompts import SHOT_PLANNING_SYSTEM_PROMPT
from app.providers.llm.base import BaseLLMProvider

async def shot_planner_node(state: DirectorState, provider: BaseLLMProvider) -> Dict[str, Any]:
    theme = state.get("theme")
    beats = state.get("narrative_beats", [])
    target_duration = state.get("target_duration", 30.0)
    char_ref = state.get("character_bible", {})
    env_ref = state.get("location_bible", {})

    user_prompt = f"""
主题: {theme}
目标时长: {target_duration} 秒
6阶段叙事节拍: {beats}
主角基准 (Reference 1): {char_ref}
场景基准 (Reference 2): {env_ref}

请为该场景规划 12 个严密连续的分镜头（SHOT 01 ~ SHOT 12，总时长约 {target_duration} 秒，每阶段分配 1~2 镜，确保起承转合与视听节奏变化）。
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
