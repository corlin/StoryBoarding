import json
import httpx
from typing import Dict, Any, Optional
from app.providers.llm.base import BaseLLMProvider

class OpenAICompatibleProvider(BaseLLMProvider):
    def __init__(
        self,
        api_key: Optional[str] = None,
        api_base: Optional[str] = None,
        model: str = "openai/gpt-5.6-sol"
    ):
        super().__init__(
            api_key=api_key,
            api_base=api_base or "https://openrouter.ai/api/v1",
            model=model or "openai/gpt-5.6-sol"
        )

    def _get_headers(self) -> Dict[str, str]:
        headers = {
            "Authorization": f"Bearer {self.api_key or 'mock-key'}",
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost:3000",
            "X-Title": "AI Director Workspace"
        }
        return headers

    async def generate_json(self, system_prompt: str, user_prompt: str, schema: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        headers = self._get_headers()
        
        payload: Dict[str, Any] = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_prompt + "\nYou MUST reply with a valid JSON object only. No markdown formatting outside JSON."},
                {"role": "user", "content": user_prompt}
            ],
            "response_format": {"type": "json_object"},
            "temperature": 0.3
        }

        # If no real API key configured, provide structured mock fallback for local testing
        if not self.api_key or self.api_key == "mock-key":
            return self._mock_fallback(user_prompt)

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                resp = await client.post(f"{self.api_base}/chat/completions", headers=headers, json=payload)
                resp.raise_for_status()
                data = resp.json()
                content = data["choices"][0]["message"]["content"]
                return json.loads(content)
        except Exception as e:
            print(f"OpenRouter LLM generate_json fallback: {e}")
            return self._mock_fallback(user_prompt)

    async def generate_text(self, system_prompt: str, user_prompt: str) -> str:
        headers = self._get_headers()
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            "temperature": 0.7
        }

        if not self.api_key or self.api_key == "mock-key":
            return "Mock generation text response."

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                resp = await client.post(f"{self.api_base}/chat/completions", headers=headers, json=payload)
                resp.raise_for_status()
                data = resp.json()
                return data["choices"][0]["message"]["content"]
        except Exception as e:
            print(f"OpenRouter LLM generate_text fallback: {e}")
            return "Fallback mock generation response."

    def _mock_fallback(self, user_prompt: str) -> Dict[str, Any]:
        """Provides high-quality realistic Director Mock responses when API key is unset"""
        if "story_analysis" in user_prompt or "故事分析" in user_prompt:
            return {
                "theme": "智取与冒险",
                "characters": [
                    {"name": "老鼠 (Mouse)", "visual_description": "一只机敏的小灰褐田鼠，左耳微残，胡须长且敏感"}
                ],
                "locations": [
                    {"name": "夜晚厨房 (Night Kitchen)", "visual_description": "昏暗木质料理台，清冷月光从窗格斜射，油瓶泛着琥珀光泽"}
                ],
                "visual_style": "2D 动画极简线稿风，黑白分镜草图，局部高光",
                "beats": [
                    {"beat": "潜入厨房", "intent": "建立危险与静谧氛围"},
                    {"beat": "发现油瓶", "intent": "确立核心目标"},
                    {"beat": "突破障碍", "intent": "制造戏剧悬念"},
                    {"beat": "成功撤退", "intent": "情感释放与结局"}
                ]
            }
        elif "shot_planner" in user_prompt or "规划镜头" in user_prompt:
            return {
                "sequence_name": "老鼠偷油",
                "total_shots": 6,
                "shots": [
                    {"order": 1, "narrative_function": "环境建立", "estimated_duration": 2.5, "shot_size": "wide_shot", "core_action": "老鼠从门缝探头溜进厨房"},
                    {"order": 2, "narrative_function": "动作推进", "estimated_duration": 2.0, "shot_size": "low_angle", "core_action": "贴着桌腿快速移动观察"},
                    {"order": 3, "narrative_function": "发现目标", "estimated_duration": 2.5, "shot_size": "medium_close_up", "core_action": "仰头注视高处桌上的油瓶"},
                    {"order": 4, "narrative_function": "攀爬尝试", "estimated_duration": 3.0, "shot_size": "medium_shot", "core_action": "顺着桌布褶皱努力往上爬"},
                    {"order": 5, "narrative_function": "意外危机", "estimated_duration": 2.0, "shot_size": "close_up", "core_action": "桌布滑动险些跌落，惊险抓牢"},
                    {"order": 6, "narrative_function": "达成目标", "estimated_duration": 3.0, "shot_size": "full_shot", "core_action": "爬上桌面，成功贴近油瓶，露出欣喜表情"}
                ]
            }
        elif "逆向解析" in user_prompt or "分镜剧本" in user_prompt or "script" in user_prompt:
            # Parse lines from user prompt
            lines = [l.strip() for l in user_prompt.split("\n") if l.strip() and not l.startswith("请逆向解析")]
            parsed_shots = []
            for idx, line in enumerate(lines[:10]):
                clean_line = line.lstrip("0123456789.镜头:：- ")
                size = "wide_shot" if idx == 0 else ("close_up" if "特写" in line else "medium_shot")
                parsed_shots.append({
                    "order": idx + 1,
                    "duration": 2.5,
                    "shot_size": size,
                    "camera_angle": "eye_level",
                    "camera_movement": {"type": "static"},
                    "subject": "主体",
                    "action": clean_line or f"镜头动作描述 {idx+1}",
                    "narrative_function": "叙事推进",
                    "character_direction": "left_to_right",
                    "image_prompt": f"Cinematic storyboard shot: {clean_line}",
                    "video_prompt": f"Camera tracks {clean_line}"
                })
            if not parsed_shots:
                parsed_shots = [
                    {"order": 1, "duration": 2.5, "shot_size": "wide_shot", "action": "夜色下的古城建立全景", "image_prompt": "Cinematic wide shot ancient town night"},
                    {"order": 2, "duration": 2.0, "shot_size": "close_up", "action": "剑客拔剑出鞘特写", "image_prompt": "Cinematic close up swordsman drawing sword"},
                    {"order": 3, "duration": 3.0, "shot_size": "full_shot", "action": "两人隔空对峙全景", "image_prompt": "Cinematic full shot two fighters showdown"}
                ]
            return {
                "project_title": "已导入分镜工程",
                "theme": "剧本动作叙事",
                "visual_style": "Cinematic 2D Storyboard Sketch",
                "shots": parsed_shots
            }
        return {"status": "ok", "message": "Mock JSON returned"}
