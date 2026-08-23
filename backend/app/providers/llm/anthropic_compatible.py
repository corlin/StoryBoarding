import json
import httpx
from typing import Dict, Any, Optional
from app.providers.llm.base import BaseLLMProvider

class AnthropicCompatibleProvider(BaseLLMProvider):
    def __init__(self, api_key: Optional[str] = None, api_base: Optional[str] = None, model: str = "claude-3-5-sonnet-20240620"):
        super().__init__(api_key=api_key, api_base=api_base or "https://api.anthropic.com/v1", model=model)

    async def generate_json(self, system_prompt: str, user_prompt: str, schema: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        if not self.api_key or self.api_key == "mock-key":
            # Reuse mock response logic for consistency
            from app.providers.llm.openai_compatible import OpenAICompatibleProvider
            return OpenAICompatibleProvider()._mock_fallback(user_prompt)

        headers = {
            "x-api-key": self.api_key,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": self.model,
            "max_tokens": 4096,
            "system": system_prompt + "\nYou MUST return valid JSON only without any markdown wrap or preamble.",
            "messages": [
                {"role": "user", "content": user_prompt}
            ],
            "temperature": 0.2
        }

        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(f"{self.api_base}/messages", headers=headers, json=payload)
            resp.raise_for_status()
            data = resp.json()
            raw_text = data["content"][0]["text"]
            # Clean possible markdown block
            cleaned = raw_text.strip()
            if cleaned.startswith("```json"):
                cleaned = cleaned[7:-3].strip()
            elif cleaned.startswith("```"):
                cleaned = cleaned[3:-3].strip()
            return json.loads(cleaned)

    async def generate_text(self, system_prompt: str, user_prompt: str) -> str:
        if not self.api_key or self.api_key == "mock-key":
            return "Mock Claude response text."

        headers = {
            "x-api-key": self.api_key,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json"
        }
        payload = {
            "model": self.model,
            "max_tokens": 2048,
            "system": system_prompt,
            "messages": [{"role": "user", "content": user_prompt}],
            "temperature": 0.7
        }

        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(f"{self.api_base}/messages", headers=headers, json=payload)
            resp.raise_for_status()
            data = resp.json()
            return data["content"][0]["text"]
