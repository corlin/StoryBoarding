import uuid
from typing import Dict, Any, List
from app.agents.director.state import DirectorState
from app.agents.director.prompts.director_prompts import SHOT_DETAILER_SYSTEM_PROMPT
from app.providers.llm.base import BaseLLMProvider

async def shot_detailer_node(state: DirectorState, provider: BaseLLMProvider) -> Dict[str, Any]:
    outlines = state.get("shot_outlines", [])
    style_prefix = state.get("visual_style_prefix", "Professional pre-production director's storyboard sketch, rough graphite and dark pencil lines, selective grayscale wash shading, clear silhouette staging, directional movement arrows")
    char_ref = state.get("character_bible", {})
    env_ref = state.get("location_bible", {})

    user_prompt = f"""
全局画风规范: {style_prefix}
主角基准锁 (Reference Image 1): {char_ref}
场景基准锁 (Reference Image 2): {env_ref}
分镜头大纲列表: {outlines}

请为以上 12 个分镜头大纲补全极其专业的好莱坞导演视听参数、180°视线轴向以及适配绘图模型的精确英文 image_prompt 与 video_prompt。
image_prompt 必须严格遵循石墨素描预演画风，包含景别、机位、主体动作与负面约束（--no speech balloons, comic panels, 3D render）。
"""

    result = await provider.generate_json(
        system_prompt=SHOT_DETAILER_SYSTEM_PROMPT,
        user_prompt=user_prompt
    )

    raw_shots = result.get("shots", [])
    detailed_shots: List[Dict[str, Any]] = []

    # If LLM returned empty or mismatched, construct fallback
    if not raw_shots:
        for i, outline in enumerate(outlines):
            order_no = outline.get("order", i + 1)
            size = outline.get("shot_size", "medium_shot")
            act = outline.get("core_action", "核心动作发生")
            detailed_shots.append({
                "id": str(uuid.uuid4()),
                "order": order_no,
                "duration": outline.get("estimated_duration", 2.5),
                "shot_size": size,
                "camera_angle": outline.get("camera_angle", "eye_level"),
                "camera_movement": {"type": outline.get("camera_movement", "static"), "speed": "medium"},
                "directional_arrow": outline.get("directional_arrow", "none"),
                "subject": char_ref.get("name") if isinstance(char_ref, dict) else "主角",
                "action": act,
                "composition": {
                    "subject_position": "left" if i % 2 == 0 else "center",
                    "focal_point": "center"
                },
                "character_direction": "left_to_right",
                "narrative_function": outline.get("narrative_function", "叙事推进"),
                "lighting": "cinematic high contrast chiaroscuro",
                "audio": {"ambient": "cinematic ambience", "sfx": []},
                "transition": "cut",
                "image_prompt": f"Professional pre-production director's storyboard sketch, 16:9 cinematic frame, rough graphite and dark pencil lines, bold gestural strokes, selective grayscale wash, clear silhouette staging, directional movement arrows, {size}, {act} --no speech balloons, comic panels, 3d render",
                "video_prompt": f"Camera moves through {act}, cinematic 4k film look.",
                "continuity_data": {"screen_direction": "left_to_right"},
                "is_dirty": False
            })
    else:
        for i, s in enumerate(raw_shots):
            outline = outlines[i] if i < len(outlines) else {}
            order_no = s.get("order", i + 1)
            size = s.get("shot_size", outline.get("shot_size", "medium_shot"))
            act = s.get("action", outline.get("core_action", ""))
            detailed_shots.append({
                "id": str(uuid.uuid4()),
                "order": order_no,
                "duration": s.get("duration", outline.get("estimated_duration", 2.5)),
                "shot_size": size,
                "camera_angle": s.get("camera_angle", "eye_level"),
                "camera_movement": s.get("camera_movement", {"type": "static", "speed": "medium"}),
                "directional_arrow": s.get("directional_arrow", "none"),
                "subject": s.get("subject", char_ref.get("name") if isinstance(char_ref, dict) else "主角"),
                "action": act,
                "dialogue": s.get("dialogue"),
                "composition": s.get("composition", {"subject_position": "center", "focal_point": "center"}),
                "character_direction": s.get("character_direction", "left_to_right"),
                "narrative_function": s.get("narrative_function", outline.get("narrative_function", "叙事推进")),
                "lighting": s.get("lighting", "cinematic chiaroscuro"),
                "audio": s.get("audio", {"ambient": "ambience", "sfx": []}),
                "transition": s.get("transition", "cut"),
                "image_prompt": s.get("image_prompt") or f"Professional pre-production director's storyboard sketch, 16:9 cinematic frame, rough graphite and dark pencil lines, bold gestural strokes, selective grayscale wash, clear silhouette staging, directional movement arrows, {size}, {act} --no speech balloons, comic panels, 3d render",
                "video_prompt": s.get("video_prompt") or f"Camera moves through {act}.",
                "continuity_data": s.get("continuity_data", {"screen_direction": "left_to_right"}),
                "is_dirty": False
            })

    return {
        "detailed_shots": detailed_shots,
        "current_step": "shots_detailed",
        "progress_percentage": 85
    }
