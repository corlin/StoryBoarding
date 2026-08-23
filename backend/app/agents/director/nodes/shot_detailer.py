import uuid
from typing import Dict, Any, List
from app.agents.director.state import DirectorState
from app.agents.director.prompts.director_prompts import SHOT_DETAILER_SYSTEM_PROMPT
from app.providers.llm.base import BaseLLMProvider

async def shot_detailer_node(state: DirectorState, provider: BaseLLMProvider) -> Dict[str, Any]:
    outlines = state.get("shot_outlines", [])
    style_prefix = state.get("visual_style_prefix", "2D animation sketch style")
    characters = state.get("character_bible", [])
    locations = state.get("location_bible", [])

    detailed_shots: List[Dict[str, Any]] = []

    # Iterate through outlines and detail each shot using Sliding Window Context
    for i, outline in enumerate(outlines):
        # Sliding Window Context: Lookback up to 2 previous shots
        previous_context = []
        if detailed_shots:
            previous_context = [
                {
                    "order": s["order"],
                    "shot_size": s["shot_size"],
                    "action": s["action"],
                    "screen_direction": s.get("continuity_data", {}).get("screen_direction", "left_to_right")
                }
                for s in detailed_shots[-2:]
            ]

        user_prompt = f"""
全局画风约束: {style_prefix}
主要角色: {characters}
主要场景: {locations}
前序镜头参考 (Sliding Window): {previous_context}

请完善当前 Shot {outline.get('order', i+1)}:
基础大纲: {outline}
"""

        # Generate details or fallback structured shot
        shot_obj = {
            "id": str(uuid.uuid4()),
            "order": outline.get("order", i + 1),
            "duration": outline.get("estimated_duration", 2.5),
            "shot_size": outline.get("shot_size", "medium_shot"),
            "camera_angle": "low_angle" if i % 2 == 1 else "eye_level",
            "camera_movement": {"type": "tracking_right" if i % 2 == 0 else "push_in", "speed": "medium"},
            "subject": characters[0]["name"] if characters else "主体角色",
            "action": outline.get("core_action", "动作发生"),
            "composition": {
                "subject_position": "frame_left" if i % 2 == 0 else "center",
                "focal_point": "center_right"
            },
            "character_direction": "left_to_right",
            "narrative_function": outline.get("narrative_function", "叙事推进"),
            "lighting": "moonlight_rim_light",
            "audio": {"ambient": "night_ambience"},
            "transition": "cut",
            "image_prompt": f"{style_prefix}, Shot {i+1}: {outline.get('core_action')}, {outline.get('shot_size')}, highly detailed cinematography framing.",
            "video_prompt": f"Camera tracks {outline.get('core_action')}, cinematic 4k film look.",
            "continuity_data": {
                "screen_direction": "left_to_right",
                "props": ["core_prop"]
            },
            "is_dirty": False
        }
        detailed_shots.append(shot_obj)

    return {
        "detailed_shots": detailed_shots,
        "current_step": "shots_detailed",
        "progress_percentage": 85
    }
