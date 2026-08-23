import uuid
from typing import Dict, Any, Callable
from app.agents.director.state import DirectorState
from app.agents.director.nodes.story_analyzer import story_analyzer_node
from app.agents.director.nodes.shot_planner import shot_planner_node
from app.agents.director.nodes.shot_detailer import shot_detailer_node
from app.agents.director.nodes.continuity_checker import continuity_checker_node
from app.agents.director.prompts.director_prompts import SCRIPT_PARSER_SYSTEM_PROMPT
from app.providers.llm.base import BaseLLMProvider

class DirectorGraphExecutor:
    """Orchestrates Director Agent LangGraph workflow steps with progress callbacks"""
    
    def __init__(self, provider: BaseLLMProvider):
        self.provider = provider

    async def execute_from_story(self, story: str, target_duration: float, progress_callback: Callable[[Dict[str, Any]], None] = None) -> DirectorState:
        state: DirectorState = {
            "story_input": story,
            "script_input": None,
            "target_duration": target_duration,
            "theme": None,
            "character_bible": [],
            "location_bible": [],
            "visual_style_prefix": None,
            "narrative_beats": [],
            "shot_outlines": [],
            "detailed_shots": [],
            "continuity_issues": [],
            "is_continuity_passed": True,
            "current_step": "started",
            "progress_percentage": 5,
            "error_message": None
        }

        # Step 1: Story Analyzer
        if progress_callback:
            progress_callback({"step": "story_analyzer", "progress": 15, "message": "正在深度分析故事结构与视觉设定..."})
        step1_out = await story_analyzer_node(state, self.provider)
        state.update(step1_out)

        # Step 2: Shot Planner
        if progress_callback:
            progress_callback({"step": "shot_planner", "progress": 40, "message": "正在规划镜头节奏与分镜大纲..."})
        step2_out = await shot_planner_node(state, self.provider)
        state.update(step2_out)

        # Step 3: Shot Detailer (Sliding Window & Prompt Prefix)
        if progress_callback:
            progress_callback({"step": "shot_detailer", "progress": 70, "message": "正在生成详尽镜头参数与构图提示词..."})
        step3_out = await shot_detailer_node(state, self.provider)
        state.update(step3_out)

        # Step 4: Continuity Checker
        if progress_callback:
            progress_callback({"step": "continuity_checker", "progress": 95, "message": "正在校验视线轴线与连续性..."})
        step4_out = await continuity_checker_node(state)
        state.update(step4_out)

        if progress_callback:
            progress_callback({"step": "completed", "progress": 100, "message": "分镜头模型生成完成！", "shots": state["detailed_shots"]})

        return state

    async def execute_from_script(self, script_text: str, progress_callback: Callable[[Dict[str, Any]], None] = None) -> DirectorState:
        """Start Point B: Fuzzy Shot Parser parses existing written script into structured shots"""
        state: DirectorState = {
            "story_input": None,
            "script_input": script_text,
            "target_duration": 30.0,
            "theme": None,
            "character_bible": [],
            "location_bible": [],
            "visual_style_prefix": None,
            "narrative_beats": [],
            "shot_outlines": [],
            "detailed_shots": [],
            "continuity_issues": [],
            "is_continuity_passed": True,
            "current_step": "script_parsing",
            "progress_percentage": 20,
            "error_message": None
        }

        if progress_callback:
            progress_callback({"step": "script_parser", "progress": 30, "message": "正在逆向解析剧本文本结构..."})

        # Call LLM parser
        result = await self.provider.generate_json(
            system_prompt=SCRIPT_PARSER_SYSTEM_PROMPT,
            user_prompt=f"请逆向解析以下分镜剧本内容：\n\n{script_text}"
        )

        parsed_shots = result.get("shots", [])
        detailed_shots = []
        total_duration = 0.0

        for i, s in enumerate(parsed_shots):
            dur = float(s.get("duration", 2.5))
            total_duration += dur
            shot_obj = {
                "id": str(uuid.uuid4()),
                "order": s.get("order", i + 1),
                "duration": dur,
                "shot_size": s.get("shot_size", "medium_shot"),
                "camera_angle": s.get("camera_angle", "eye_level"),
                "camera_movement": s.get("camera_movement", {"type": "static"}),
                "subject": s.get("subject", "主体角色"),
                "action": s.get("action", "动作描述"),
                "dialogue": s.get("dialogue"),
                "composition": s.get("composition", {"subject_position": "center"}),
                "character_direction": s.get("character_direction", "static"),
                "narrative_function": s.get("narrative_function", "叙事推进"),
                "lighting": s.get("lighting", "自然光"),
                "audio": s.get("audio", {}),
                "transition": s.get("transition", "cut"),
                "image_prompt": s.get("image_prompt") or f"Cinematic shot: {s.get('action')}",
                "video_prompt": s.get("video_prompt") or f"Camera tracks {s.get('action')}",
                "continuity_data": {
                    "screen_direction": s.get("character_direction", "static")
                },
                "is_dirty": False
            }
            detailed_shots.append(shot_obj)

        state["detailed_shots"] = detailed_shots
        state["theme"] = result.get("theme", "已导入剧本")
        state["visual_style_prefix"] = result.get("visual_style")
        state["target_duration"] = total_duration

        # Continuity Check
        if progress_callback:
            progress_callback({"step": "continuity_checker", "progress": 85, "message": "正在校验视线轴线与连续性..."})
        step_cont = await continuity_checker_node(state)
        state.update(step_cont)

        if progress_callback:
            progress_callback({"step": "completed", "progress": 100, "message": "剧本解析完成！", "shots": state["detailed_shots"]})

        return state
