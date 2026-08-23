from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import datetime

# User & Auth
class UserBase(BaseModel):
    email: str
    name: Optional[str] = None
    avatar_url: Optional[str] = None

class UserResponse(UserBase):
    id: UUID
    created_at: datetime
    class Config:
        from_attributes = True

# Provider Config
class ProviderConfigBase(BaseModel):
    llm_provider: str = "openai_compatible"
    llm_api_base: str = "https://api.openai.com/v1"
    llm_api_key: Optional[str] = None
    llm_model: str = "gpt-4o"
    
    image_provider: str = "openai_dalle"
    image_api_base: Optional[str] = None
    image_api_key: Optional[str] = None
    image_model: str = "dall-e-3"

class ProviderConfigUpdate(BaseModel):
    llm_provider: Optional[str] = None
    llm_api_base: Optional[str] = None
    llm_api_key: Optional[str] = None
    llm_model: Optional[str] = None
    
    image_provider: Optional[str] = None
    image_api_base: Optional[str] = None
    image_api_key: Optional[str] = None
    image_model: Optional[str] = None

class ProviderConfigResponse(ProviderConfigBase):
    id: UUID
    user_id: UUID
    class Config:
        from_attributes = True

# Shot Schemas
class ShotBase(BaseModel):
    order: int = 1
    duration: float = 2.5
    shot_size: str = "medium_shot"
    camera_angle: str = "eye_level"
    camera_movement: Dict[str, Any] = Field(default_factory=lambda: {"type": "static"})
    subject: str = ""
    action: str = ""
    dialogue: Optional[str] = None
    composition: Dict[str, Any] = Field(default_factory=dict)
    character_direction: str = "static"
    narrative_function: Optional[str] = None
    lighting: Optional[str] = None
    audio: Dict[str, Any] = Field(default_factory=dict)
    emotion: Optional[str] = None
    transition: str = "cut"
    notes: Optional[str] = None

class ShotCreate(ShotBase):
    sequence_id: UUID

class ShotUpdate(BaseModel):
    order: Optional[int] = None
    duration: Optional[float] = None
    shot_size: Optional[str] = None
    camera_angle: Optional[str] = None
    camera_movement: Optional[Dict[str, Any]] = None
    subject: Optional[str] = None
    action: Optional[str] = None
    dialogue: Optional[str] = None
    composition: Optional[Dict[str, Any]] = None
    character_direction: Optional[str] = None
    narrative_function: Optional[str] = None
    lighting: Optional[str] = None
    audio: Optional[Dict[str, Any]] = None
    emotion: Optional[str] = None
    transition: Optional[str] = None
    notes: Optional[str] = None
    storyboard_image_url: Optional[str] = None
    image_prompt: Optional[str] = None
    video_prompt: Optional[str] = None
    continuity_data: Optional[Dict[str, Any]] = None
    is_dirty: Optional[bool] = None

class ShotResponse(ShotBase):
    id: UUID
    sequence_id: UUID
    storyboard_image_url: Optional[str] = None
    image_prompt: Optional[str] = None
    video_prompt: Optional[str] = None
    continuity_data: Dict[str, Any] = Field(default_factory=dict)
    is_dirty: bool = False
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Sequence Schemas
class SequenceResponse(BaseModel):
    id: UUID
    project_id: UUID
    order: int
    name: str
    description: Optional[str] = None
    shots: List[ShotResponse] = Field(default_factory=list)

    class Config:
        from_attributes = True

# Project Schemas
class ProjectBase(BaseModel):
    title: str = "Untitled Project"
    story: Optional[str] = None
    creative_brief: Optional[str] = None
    style_config: Dict[str, Any] = Field(default_factory=dict)
    target_duration: float = 30.0

class ProjectCreate(ProjectBase):
    pass

class ProjectUpdate(BaseModel):
    title: Optional[str] = None
    story: Optional[str] = None
    creative_brief: Optional[str] = None
    style_config: Optional[Dict[str, Any]] = None
    target_duration: Optional[float] = None

class ProjectDetailResponse(ProjectBase):
    id: UUID
    user_id: UUID
    created_at: datetime
    updated_at: datetime
    sequences: List[SequenceResponse] = Field(default_factory=list)

    class Config:
        from_attributes = True

class ProjectListItem(BaseModel):
    id: UUID
    title: str
    target_duration: float
    shot_count: int = 0
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
