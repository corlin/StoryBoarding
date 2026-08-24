import io
import asyncio
import httpx
from abc import ABC, abstractmethod
from typing import Optional, Dict, Any
from app.services.storyboard_renderer import render_shot_storyboard_image

class BaseImageProvider(ABC):
    def __init__(self, api_key: Optional[str] = None, api_base: Optional[str] = None, model: str = ""):
        self.api_key = api_key
        self.api_base = api_base
        self.model = model
        # Rate Limiting Semaphore (max 3 concurrent image requests to prevent 429)
        self.semaphore = asyncio.Semaphore(3)

    @abstractmethod
    async def generate_image(self, prompt: str, shot_info: Optional[dict] = None) -> bytes:
        """Generate image bytes from prompt"""
        pass

class OpenAIImageProvider(BaseImageProvider):
    def __init__(self, api_key: Optional[str] = None, api_base: Optional[str] = None, model: str = "dall-e-3"):
        super().__init__(api_key=api_key, api_base=api_base or "https://api.openai.com/v1", model=model)

    async def generate_image(self, prompt: str, shot_info: Optional[dict] = None) -> bytes:
        async with self.semaphore:
            if not self.api_key or self.api_key == "mock-key":
                return self._generate_cinematic_mock_image(prompt, shot_info)

            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            payload = {
                "model": self.model,
                "prompt": prompt,
                "n": 1,
                "size": "1024x1024",
                "response_format": "b64_json"
            }

            try:
                async with httpx.AsyncClient(timeout=90.0) as client:
                    resp = await client.post(f"{self.api_base}/images/generations", headers=headers, json=payload)
                    resp.raise_for_status()
                    data = resp.json()
                    import base64
                    b64_data = data["data"][0]["b64_json"]
                    return base64.b64decode(b64_data)
            except Exception as e:
                print(f"OpenAI Image API error, falling back to mock: {e}")
                return self._generate_cinematic_mock_image(prompt, shot_info)

    def _generate_cinematic_mock_image(self, prompt: str, shot_info: Optional[dict] = None) -> bytes:
        """Generates 1-to-1 visual storyboard frame using the unified storyboard renderer"""
        info = shot_info or {}
        img = render_shot_storyboard_image(
            order=info.get("order", 1),
            shot_size=info.get("shot_size", "MS"),
            camera_angle=info.get("camera_angle", "eye_level"),
            camera_movement=info.get("camera_movement", {}),
            action=info.get("action", prompt[:60]),
            width=960,
            height=540
        )
        output = io.BytesIO()
        img.save(output, format="PNG")
        return output.getvalue()
