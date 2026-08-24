import io
import re
import json
import base64
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
    def __init__(
        self,
        api_key: Optional[str] = None,
        api_base: Optional[str] = None,
        model: str = "google/gemini-3.1-flash-image"
    ):
        super().__init__(
            api_key=api_key,
            api_base=api_base or "https://openrouter.ai/api/v1",
            model=model or "google/gemini-3.1-flash-image"
        )

    def _get_headers(self) -> Dict[str, str]:
        return {
            "Authorization": f"Bearer {self.api_key or 'mock-key'}",
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost:3000",
            "X-Title": "AI Director Workspace"
        }

    async def generate_image(self, prompt: str, shot_info: Optional[dict] = None) -> bytes:
        async with self.semaphore:
            if not self.api_key or self.api_key == "mock-key":
                return self._generate_cinematic_mock_image(prompt, shot_info)

            headers = self._get_headers()

            # 1. Try OpenRouter multimodal image output via /chat/completions
            chat_payload = {
                "model": self.model,
                "messages": [
                    {
                        "role": "user",
                        "content": f"Generate a cinematic 16:9 2D storyboard sketch image for this scene: {prompt}"
                    }
                ],
                "output_modalities": ["image"]
            }

            try:
                async with httpx.AsyncClient(timeout=90.0) as client:
                    resp = await client.post(f"{self.api_base}/chat/completions", headers=headers, json=chat_payload)
                    if resp.status_code == 200:
                        data = resp.json()
                        message = data.get("choices", [{}])[0].get("message", {})
                        
                        # Check inline images / message content
                        content = message.get("content", "")
                        
                        # Match base64 data URI: data:image/png;base64,...
                        b64_match = re.search(r"data:image\/[a-zA-Z]+;base64,([A-Za-z0-9+/=]+)", content)
                        if b64_match:
                            return base64.b64decode(b64_match.group(1))

                        # Match markdown image URL: ![...](https://...)
                        url_match = re.search(r"!\[.*?\]\((https?://[^\s\)]+)\)", content)
                        if url_match:
                            img_url = url_match.group(1)
                            img_resp = await client.get(img_url, timeout=30.0)
                            if img_resp.status_code == 200:
                                return img_resp.content

            except Exception as e:
                print(f"OpenRouter chat/completions image generation fallback: {e}")

            # 2. Try standard /images/generations endpoint
            gen_payload = {
                "model": self.model,
                "prompt": prompt,
                "n": 1,
                "size": "1024x1024",
                "response_format": "b64_json"
            }

            try:
                async with httpx.AsyncClient(timeout=90.0) as client:
                    resp = await client.post(f"{self.api_base}/images/generations", headers=headers, json=gen_payload)
                    if resp.status_code == 200:
                        data = resp.json()
                        if "data" in data and len(data["data"]) > 0:
                            item = data["data"][0]
                            if "b64_json" in item:
                                return base64.b64decode(item["b64_json"])
                            elif "url" in item:
                                img_resp = await client.get(item["url"], timeout=30.0)
                                if img_resp.status_code == 200:
                                    return img_resp.content
            except Exception as e:
                print(f"OpenRouter images/generations fallback: {e}")

            # Fallback to local 1:1 visual storyboard sketch renderer
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
