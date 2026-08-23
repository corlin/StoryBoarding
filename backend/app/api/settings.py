from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from uuid import UUID
from typing import Optional, List
from pydantic import BaseModel

from app.db.session import get_db
from app.models.entities import User, UserProviderConfig, Project, Character, Location, VisualStyle
from app.api.projects import get_current_user

router = APIRouter(prefix="/settings", tags=["settings"])

class ProviderConfigSchema(BaseModel):
    llm_provider: str = "openai_compatible"
    llm_api_base: str = "https://api.openai.com/v1"
    llm_api_key: Optional[str] = None
    llm_model: str = "gpt-4o"
    image_provider: str = "openai_dalle"
    image_api_base: Optional[str] = None
    image_api_key: Optional[str] = None
    image_model: str = "dall-e-3"

@router.get("/providers", response_model=ProviderConfigSchema)
async def get_user_provider_config(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    res = await db.execute(select(UserProviderConfig).where(UserProviderConfig.user_id == user.id))
    config = res.scalars().first()
    if not config:
        config = UserProviderConfig(user_id=user.id)
        db.add(config)
        await db.commit()
        await db.refresh(config)

    # Mask keys for security
    return ProviderConfigSchema(
        llm_provider=config.llm_provider,
        llm_api_base=config.llm_api_base,
        llm_api_key="******" if config.llm_api_key else None,
        llm_model=config.llm_model,
        image_provider=config.image_provider,
        image_api_base=config.image_api_base,
        image_api_key="******" if config.image_api_key else None,
        image_model=config.image_model
    )

@router.put("/providers", response_model=ProviderConfigSchema)
async def update_user_provider_config(
    data: ProviderConfigSchema,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    res = await db.execute(select(UserProviderConfig).where(UserProviderConfig.user_id == user.id))
    config = res.scalars().first()
    if not config:
        config = UserProviderConfig(user_id=user.id)
        db.add(config)

    config.llm_provider = data.llm_provider
    config.llm_api_base = data.llm_api_base
    if data.llm_api_key and data.llm_api_key != "******":
        config.llm_api_key = data.llm_api_key
    config.llm_model = data.llm_model

    config.image_provider = data.image_provider
    config.image_api_base = data.image_api_base
    if data.image_api_key and data.image_api_key != "******":
        config.image_api_key = data.image_api_key
    config.image_model = data.image_model

    await db.commit()
    await db.refresh(config)

    return ProviderConfigSchema(
        llm_provider=config.llm_provider,
        llm_api_base=config.llm_api_base,
        llm_api_key="******" if config.llm_api_key else None,
        llm_model=config.llm_model,
        image_provider=config.image_provider,
        image_api_base=config.image_api_base,
        image_api_key="******" if config.image_api_key else None,
        image_model=config.image_model
    )
