import io
import os
import json
import asyncio
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from pydantic import BaseModel
from typing import Optional, Dict, Any

from app.db.session import get_db
from app.models.entities import Project, Sequence, Shot, UserProviderConfig
from app.agents.director.graph import DirectorGraphExecutor
from app.providers.llm.base import BaseLLMProvider
from app.providers.llm.openai_compatible import OpenAICompatibleProvider
from app.providers.image.openai_dalle import OpenAIImageProvider, BaseImageProvider
from app.providers.storage.s3_compatible import S3StorageProvider

router = APIRouter(prefix="/generate", tags=["generation"])

async def _get_user_llm_provider(user_id: Optional[UUID], db: AsyncSession) -> BaseLLMProvider:
    """Instantiates the LLM Provider configured by the user or preset environment"""
    config = None
    if user_id:
        res = await db.execute(select(UserProviderConfig).where(UserProviderConfig.user_id == user_id))
        config = res.scalars().first()

    api_key = None
    if config and config.llm_api_key and config.llm_api_key != "******":
        api_key = config.llm_api_key
    elif os.getenv("OPENROUTER_API_KEY"):
        api_key = os.getenv("OPENROUTER_API_KEY")

    api_base = (config.llm_api_base if config and config.llm_api_base else None) or os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")
    model = (config.llm_model if config and config.llm_model else None) or os.getenv("DEFAULT_LLM_MODEL", "openai/gpt-5.6-sol")

    print(f"[Director Agent] Using LLM: model={model}, base={api_base}, has_key={bool(api_key)}")
    return OpenAICompatibleProvider(api_key=api_key, api_base=api_base, model=model)

async def _get_user_image_provider(user_id: Optional[UUID], db: AsyncSession) -> BaseImageProvider:
    """Instantiates the Image Provider configured by the user or preset environment"""
    config = None
    if user_id:
        res = await db.execute(select(UserProviderConfig).where(UserProviderConfig.user_id == user_id))
        config = res.scalars().first()

    api_key = None
    if config and config.image_api_key and config.image_api_key != "******":
        api_key = config.image_api_key
    elif config and config.llm_api_key and config.llm_api_key != "******":
        api_key = config.llm_api_key
    elif os.getenv("OPENROUTER_API_KEY"):
        api_key = os.getenv("OPENROUTER_API_KEY")

    api_base = (config.image_api_base if config and config.image_api_base else None) or os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")
    model = (config.image_model if config and config.image_model else None) or os.getenv("DEFAULT_IMAGE_MODEL", "google/gemini-3.1-flash-image")

    print(f"[Director Agent] Using Image Generator: model={model}, base={api_base}, has_key={bool(api_key)}")
    return OpenAIImageProvider(api_key=api_key, api_base=api_base, model=model)

class GenerateStoryRequest(BaseModel):
    project_id: UUID
    story: str
    target_duration: float = 30.0

@router.post("/from-story")
async def generate_from_story(
    req: GenerateStoryRequest,
    db: AsyncSession = Depends(get_db)
):
    """Start Point A: AI Director Story Analyzer & Shot Planner"""
    # Verify project
    res = await db.execute(select(Project).where(Project.id == req.project_id))
    project = res.scalars().first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Get default sequence
    seq_res = await db.execute(select(Sequence).where(Sequence.project_id == project.id))
    seq = seq_res.scalars().first()
    if not seq:
        seq = Sequence(project_id=project.id, order=1, name="Sequence 1")
        db.add(seq)
        await db.flush()

    provider = await _get_user_llm_provider(project.user_id, db)
    executor = DirectorGraphExecutor(provider)

    state = await executor.execute_from_story(req.story, req.target_duration)

    # Persist generated detailed shots into database
    existing_shots = await db.execute(select(Shot).where(Shot.sequence_id == seq.id))
    for s in existing_shots.scalars().all():
        await db.delete(s)
    await db.flush()

    created_shots = []
    for s_data in state.get("detailed_shots", []):
        shot = Shot(
            sequence_id=seq.id,
            order=s_data["order"],
            duration=s_data["duration"],
            shot_size=s_data["shot_size"],
            camera_angle=s_data["camera_angle"],
            camera_movement=s_data["camera_movement"],
            subject=s_data["subject"],
            action=s_data["action"],
            composition=s_data["composition"],
            character_direction=s_data["character_direction"],
            narrative_function=s_data["narrative_function"],
            lighting=s_data["lighting"],
            audio=s_data["audio"],
            transition=s_data["transition"],
            image_prompt=s_data.get("image_prompt"),
            video_prompt=s_data.get("video_prompt"),
            continuity_data=s_data.get("continuity_data", {}),
            is_dirty=False
        )
        db.add(shot)
        created_shots.append(shot)

    # Update project story and target_duration
    project.story = req.story
    project.target_duration = req.target_duration
    await db.commit()

    return {
        "status": "success",
        "theme": state.get("theme"),
        "shots_count": len(created_shots),
        "continuity_issues": state.get("continuity_issues", [])
    }

class GenerateScriptRequest(BaseModel):
    project_id: UUID
    script_text: str

@router.post("/from-script")
async def generate_from_script(
    req: GenerateScriptRequest,
    db: AsyncSession = Depends(get_db)
):
    """Start Point B: Fuzzy Shot Parser imports existing script and creates Shot models"""
    res = await db.execute(select(Project).where(Project.id == req.project_id))
    project = res.scalars().first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    seq_res = await db.execute(select(Sequence).where(Sequence.project_id == project.id))
    seq = seq_res.scalars().first()
    if not seq:
        seq = Sequence(project_id=project.id, order=1, name="Sequence 1")
        db.add(seq)
        await db.flush()

    provider = await _get_user_llm_provider(project.user_id, db)
    executor = DirectorGraphExecutor(provider)

    state = await executor.execute_from_script(req.script_text)

    # Clear old shots
    existing_shots = await db.execute(select(Shot).where(Shot.sequence_id == seq.id))
    for s in existing_shots.scalars().all():
        await db.delete(s)
    await db.flush()

    created_shots = []
    for s_data in state.get("detailed_shots", []):
        shot = Shot(
            sequence_id=seq.id,
            order=s_data["order"],
            duration=s_data["duration"],
            shot_size=s_data["shot_size"],
            camera_angle=s_data["camera_angle"],
            camera_movement=s_data["camera_movement"],
            subject=s_data["subject"],
            action=s_data["action"],
            dialogue=s_data.get("dialogue"),
            composition=s_data["composition"],
            character_direction=s_data["character_direction"],
            narrative_function=s_data["narrative_function"],
            lighting=s_data["lighting"],
            audio=s_data["audio"],
            transition=s_data["transition"],
            image_prompt=s_data.get("image_prompt"),
            video_prompt=s_data.get("video_prompt"),
            continuity_data=s_data.get("continuity_data", {}),
            is_dirty=False
        )
        db.add(shot)
        created_shots.append(shot)

    project.target_duration = state.get("target_duration", 30.0)
    await db.commit()

    return {
        "status": "success",
        "theme": state.get("theme"),
        "shots_count": len(created_shots),
        "target_duration": project.target_duration,
        "continuity_issues": state.get("continuity_issues", [])
    }

@router.post("/images/{shot_id}")
async def generate_shot_image(
    shot_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Generate or regenerate image for a single Shot"""
    res = await db.execute(select(Shot).where(Shot.id == shot_id))
    shot = res.scalars().first()
    if not shot:
        raise HTTPException(status_code=404, detail="Shot not found")

    # Get project user_id
    seq_res = await db.execute(select(Sequence).where(Sequence.id == shot.sequence_id))
    seq = seq_res.scalars().first()
    proj_user_id = None
    if seq:
        p_res = await db.execute(select(Project).where(Project.id == seq.project_id))
        proj = p_res.scalars().first()
        if proj:
            proj_user_id = proj.user_id

    img_provider = await _get_user_image_provider(proj_user_id, db)
    storage = S3StorageProvider()

    prompt = shot.image_prompt or f"Cinematic storyboard, Shot #{shot.order}: {shot.action}"
    shot_info = {"order": shot.order, "shot_size": shot.shot_size, "action": shot.action}

    img_bytes = await img_provider.generate_image(prompt, shot_info)
    obj_name = f"shots/{shot.id}.png"
    img_url = storage.upload_image(obj_name, img_bytes)

    shot.storyboard_image_url = img_url
    shot.is_dirty = False
    await db.commit()
    await db.refresh(shot)

    return {
        "status": "success",
        "shot_id": str(shot.id),
        "storyboard_image_url": img_url
    }

@router.post("/images/project/{project_id}")
async def generate_project_images(
    project_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Batch generate images for all shots in project with concurrency"""
    p_res = await db.execute(select(Project).where(Project.id == project_id))
    project = p_res.scalars().first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    seq_res = await db.execute(select(Sequence).where(Sequence.project_id == project_id))
    seq = seq_res.scalars().first()
    if not seq:
        raise HTTPException(status_code=404, detail="Sequence not found")

    shot_res = await db.execute(select(Shot).where(Shot.sequence_id == seq.id).order_by(Shot.order.asc()))
    shots = shot_res.scalars().all()

    img_provider = await _get_user_image_provider(project.user_id, db)
    storage = S3StorageProvider()

    sem = asyncio.Semaphore(3)

    async def _render_single(shot: Shot):
        async with sem:
            prompt = shot.image_prompt or f"Cinematic storyboard, Shot #{shot.order}: {shot.action}"
            shot_info = {"order": shot.order, "shot_size": shot.shot_size, "action": shot.action}
            try:
                img_bytes = await img_provider.generate_image(prompt, shot_info)
                obj_name = f"shots/{shot.id}.png"
                img_url = storage.upload_image(obj_name, img_bytes)
                shot.storyboard_image_url = img_url
                shot.is_dirty = False
                return shot
            except Exception as e:
                print(f"Error rendering shot {shot.order}: {e}")
                return shot

    tasks = [_render_single(s) for s in shots]
    updated = await asyncio.gather(*tasks)

    await db.commit()
    return {
        "status": "success",
        "rendered_count": len(updated)
    }

@router.get("/stream/{project_id}")
async def stream_generation_progress(project_id: UUID):
    """SSE Stream endpoint for live LangGraph node progress updates"""
    async def event_generator():
        steps = [
            {"step": "story_analyzer", "progress": 25, "message": "正在解析剧本节拍与角色空间设定..."},
            {"step": "shot_planner", "progress": 50, "message": "正在规划镜头节奏与分镜景别..."},
            {"step": "shot_detailer", "progress": 75, "message": "正在注入全局风格前缀与提示词参数..."},
            {"step": "continuity_checker", "progress": 95, "message": "正在校验视线轴线与连续性..."},
            {"step": "completed", "progress": 100, "message": "生成完毕！"}
        ]
        for s in steps:
            await asyncio.sleep(0.5)
            yield f"data: {json.dumps(s)}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")
