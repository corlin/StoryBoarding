import io
import os
import asyncio
import httpx
from abc import ABC, abstractmethod
from typing import Optional
from PIL import Image, ImageDraw, ImageFont

FONT_PATHS = [
    "app/assets/fonts/chinese_font.ttc",
    "backend/app/assets/fonts/chinese_font.ttc",
    "/System/Library/Fonts/STHeiti Medium.ttc",
    "/System/Library/Fonts/PingFang.ttc",
    "/usr/share/fonts/truetype/wqy/wqy-microhei.ttc"
]

def get_font(size: int = 16) -> ImageFont.ImageFont:
    for fp in FONT_PATHS:
        if os.path.exists(fp):
            try:
                return ImageFont.truetype(fp, size=size)
            except Exception:
                pass
    return ImageFont.load_default()

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
        """Generates rich 16:9 cinematic storyboard sketch frame with visual guides and Chinese typography support"""
        width, height = 960, 540
        # Dark cyberpunk slate background
        img = Image.new("RGB", (width, height), color=(14, 18, 27))
        draw = ImageDraw.Draw(img)

        font_header = get_font(18)
        font_action = get_font(18)

        # Draw grid frame border (Safe Area)
        draw.rectangle([14, 14, width - 14, height - 14], outline=(30, 41, 59), width=2)
        draw.rectangle([18, 18, width - 18, height - 18], outline=(16, 185, 129), width=1)

        # 1/3 composition guidelines (Rule of Thirds)
        draw.line([(width // 3, 18), (width // 3, height - 18)], fill=(30, 41, 59), width=1)
        draw.line([(2 * width // 3, 18), (2 * width // 3, height - 18)], fill=(30, 41, 59), width=1)
        draw.line([(18, height // 3), (width - 18, height // 3)], fill=(30, 41, 59), width=1)
        draw.line([(18, 2 * height // 3), (width - 18, 2 * height // 3)], fill=(30, 41, 59), width=1)

        # Center crosshair target
        cx, cy = width // 2, height // 2
        draw.ellipse([cx - 8, cy - 8, cx + 8, cy + 8], outline=(56, 189, 248), width=1)
        draw.line([(cx - 20, cy), (cx + 20, cy)], fill=(56, 189, 248), width=1)
        draw.line([(cx, cy - 20), (cx, cy + 20)], fill=(56, 189, 248), width=1)

        # Shot details
        shot_no = shot_info.get("order", 1) if shot_info else 1
        shot_size = shot_info.get("shot_size", "MS") if shot_info else "MS"
        camera_angle = shot_info.get("camera_angle", "EYE LEVEL") if shot_info else "EYE LEVEL"
        camera_movement = shot_info.get("camera_movement", {}).get("type", "static") if shot_info else "static"
        action = shot_info.get("action", prompt[:60]) if shot_info else prompt[:60]

        shot_no_str = f"{int(shot_no):02d}" if str(shot_no).isdigit() else str(shot_no).zfill(2)

        # Decorative visual motif shapes based on shot number
        if int(shot_no) % 3 == 1:
            # Wide horizon / roof silhouette
            draw.line([(100, cy + 60), (cx, cy), (width - 100, cy + 60)], fill=(5, 150, 105), width=3)
            draw.rectangle([cx - 80, cy, cx + 80, cy + 90], outline=(16, 185, 129), width=2)
        elif int(shot_no) % 3 == 2:
            # Dynamic movement diagonal
            draw.line([(120, height - 100), (width - 120, 100)], fill=(245, 158, 11), width=4)
            draw.ellipse([cx - 40, cy - 40, cx + 40, cy + 40], outline=(245, 158, 11), width=2)
        else:
            # Bullet Time / Circular Focus
            draw.ellipse([cx - 140, cy - 80, cx + 140, cy + 80], outline=(56, 189, 248), width=2)
            draw.line([(100, cy), (width - 100, cy)], fill=(239, 68, 68), width=3)

        # Header Box
        header_text = f"SHOT #{shot_no_str} · {shot_size.upper()} · {camera_angle.upper()} · {camera_movement.upper()}"
        draw.rectangle([30, 26, 420, 62], fill=(2, 6, 23), outline=(51, 65, 85), width=1)
        draw.text((42, 34), header_text, fill=(56, 189, 248), font=font_header)

        # Bottom Subtitle Box
        draw.rectangle([30, height - 66, width - 30, height - 24], fill=(2, 6, 23), outline=(30, 41, 59), width=1)
        action_text = f"动作: {action[:55]}..." if len(action) > 55 else f"动作: {action}"
        draw.text((42, height - 52), action_text, fill=(226, 232, 240), font=font_action)

        output = io.BytesIO()
        img.save(output, format="PNG")
        return output.getvalue()
