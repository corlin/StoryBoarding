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

    user_prompt = f"""
全局画风约束: {style_prefix}
主要角色设定: {characters}
主要场景设定: {locations}
分镜头大纲列表: {outlines}

请为以上镜头大纲列表补全每一个镜头的专业视听模型参数、180度视线轴向以及适配绘图模型的精确英文 image_prompt 与 video_prompt。
"""

    result = await provider.generate_json(
        system_prompt=SHOT_DETAILER_SYSTEM_PROMPT,
        user_prompt=user_prompt
    )

    raw_shots = result.get("shots", [])
    detailed_shots: List[Dict[str, Any]] = []

    # If LLM returned empty or mismatched, merge with outlines
    if not raw_shots:
        for i, outline in enumerate(outlines):
            detailed_shots.append({
                "id": str(uuid.uuid4()),
                "order": outline.get("order", i + 1),
                "duration": outline.get("estimated_duration", 2.5),
                "shot_size": outline.get("shot_size", "medium_shot"),
                "camera_angle": "low_angle" if i % 2 == 1 else "eye_level",
                "camera_movement": {"type": "tracking_right" if i % 2 == 0 else "push_in", "speed": "medium"},
                "subject": characters[0]["name"] if characters else "主体角色",
                "action": outline.get("core_action", "动作发生"),
                "composition": {
                    "subject_position": "left" if i % 2 == 0 else "center",
                    "focal_point": "center"
                },
                "character_direction": "left_to_right",
                "narrative_function": outline.get("narrative_function", "叙事推进"),
                "lighting": "moonlight_rim_light",
                "audio": {"ambient": "night_ambience", "sfx": []},
                "transition": "cut",
                "image_prompt": f"16:9 cinematic storyboard sketch, {style_prefix}, Shot {i+1}: {outline.get('core_action')}, {outline.get('shot_size')}, highly detailed cinematography framing.",
                "video_prompt": f"Camera tracks {outline.get('core_action')}, cinematic 4k film look.",
                "continuity_data": {"screen_direction": "left_to_right"},
                "is_dirty": False
            })
    else:
        for i, s in enumerate(raw_shots):
            outline = outlines[i] if i < len(outlines) else {}
            detailed_shots.append({
                "id": str(uuid.uuid4()),
                "order": s.get("order", i + 1),
                "duration": s.get("duration", outline.get("estimated_duration", 2.5)),
                "shot_size": s.get("shot_size", outline.get("shot_size", "medium_shot")),
                "camera_angle": s.get("camera_angle", "eye_level"),
                "camera_movement": s.get("camera_movement", {"type": "static", "speed": "medium"}),
                "subject": s.get("subject", characters[0]["name"] if characters else "主体"),
                "action": s.get("action", outline.get("core_action", "")),
                "dialogue": s.get("dialogue"),
                "composition": s.get("composition", {"subject_position": "center", "focal_point": "center"}),
                "character_direction": s.get("character_direction", "left_to_right"),
                "narrative_function": s.get("narrative_function", outline.get("narrative_function", "叙事推进")),
                "lighting": s.get("lighting", "cinematic lighting"),
                "audio": s.get("audio", {"ambient": "ambience", "sfx": []}),
                "transition": s.get("transition", "cut"),
                "image_prompt": s.get("image_prompt") or f"16:9 cinematic storyboard sketch, {style_prefix}, Shot {i+1}: {s.get('action')}, {s.get('shot_size')}.",
                "video_prompt": s.get("video_prompt") or f"Camera moves through {s.get('action')}.",
                "continuity_data": s.get("continuity_data", {"screen_direction": "left_to_right"}),
                "is_dirty": False
            })

    return {
        "detailed_shots": detailed_shots,
        "current_step": "shots_detailed",
        "progress_percentage": 85
    }
