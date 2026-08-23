from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional

class BaseLLMProvider(ABC):
    def __init__(self, api_key: Optional[str] = None, api_base: Optional[str] = None, model: str = ""):
        self.api_key = api_key
        self.api_base = api_base
        self.model = model

    @abstractmethod
    async def generate_json(self, system_prompt: str, user_prompt: str, schema: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Generate structured JSON output from LLM"""
        pass

    @abstractmethod
    async def generate_text(self, system_prompt: str, user_prompt: str) -> str:
        """Generate text output from LLM"""
        pass
