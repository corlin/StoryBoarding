from typing import Dict, Any
from app.agents.director.state import DirectorState
from app.agents.director.prompts.director_prompts import STORY_ANALYSIS_SYSTEM_PROMPT
from app.providers.llm.base import BaseLLMProvider

async def story_analyzer_node(state: DirectorState, provider: BaseLLMProvider) -> Dict[str, Any]:
    story_input = state.get("story_input") or "经典动作叙事"
    
    user_prompt = f"""
请分析以下故事梗概，提取视觉设定、角色、场景与叙事节拍：
目标总时长：{state.get('target_duration', 30.0)} 秒
故事梗概：
{story_input}
"""

    result = await provider.generate_json(
        system_prompt=STORY_ANALYSIS_SYSTEM_PROMPT,
        user_prompt=user_prompt
    )

    return {
        "theme": result.get("theme", "戏剧叙事"),
        "visual_style_prefix": result.get("visual_style", "2D animation storyboard sketch"),
        "character_bible": result.get("characters", []),
        "location_bible": result.get("locations", []),
        "narrative_beats": result.get("beats", []),
        "current_step": "story_analyzed",
        "progress_percentage": 25
    }
