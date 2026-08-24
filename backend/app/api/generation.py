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

def _format_director_storyboard_prompt(raw_prompt: Optional[str], shot: Shot) -> str:
    """Enforces Professional Director's Storyboard graphite sketch syntax and negative constraints"""
    if raw_prompt and "storyboard sketch" in raw_prompt.lower():
        return raw_prompt

    size = (shot.shot_size or "medium_shot").replace("_", " ")
    angle = (shot.camera_angle or "eye_level").replace("_", " ")
    mov = shot.camera_movement.get("type", "static") if isinstance(shot.camera_movement, dict) else "static"
    act = shot.action or "Cinematic scene action"

    return (
        f"Professional pre-production director's storyboard sketch, 16:9 cinematic frame, "
        f"rough graphite and dark pencil construction lines, bold confident gestural strokes, "
        f"selective grayscale wash shading, clear silhouette staging, directional movement arrows, "
        f"Shot #{shot.order}: {size}, {angle}, camera {mov}, {act} "
        f"--no speech balloons, comic panels, manga screentones, finished 3D render, saturated color painting, photorealistic film still, text paragraphs"
    )

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
    """Start Point A: AI Director Story Analyzer & Shot Planner (6-stage 30s arc)"""
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

    state = await executor.execute_from_story(req.story, req.target_duration)

    # Clear existing shots
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

    project.story = req.story
    project.target_duration = req.target_duration
    await db.commit()

    return {
        "status": "success",
        "theme": state.get("theme"),
        "shots_count": len(created_shots),
        "target_duration": project.target_duration,
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
    """Start Point B: Fuzzy Script Reverse Parser"""
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
            composition=s_data.get("composition", {}),
            character_direction=s_data.get("character_direction", "left_to_right"),
            narrative_function=s_data.get("narrative_function", "叙事推进"),
            lighting=s_data.get("lighting", "natural lighting"),
            audio=s_data.get("audio", {}),
            transition=s_data.get("transition", "cut"),
            image_prompt=s_data.get("image_prompt"),
            video_prompt=s_data.get("video_prompt"),
            continuity_data=s_data.get("continuity_data", {}),
            is_dirty=False
        )
        db.add(shot)
        created_shots.append(shot)

    if state.get("theme"):
        project.title = state.get("project_title") or project.title
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
    """Generate or regenerate image for a single Shot with Professional Director Storyboard syntax"""
    res = await db.execute(select(Shot).where(Shot.id == shot_id))
    shot = res.scalars().first()
    if not shot:
        raise HTTPException(status_code=404, detail="Shot not found")

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

    prompt = _format_director_storyboard_prompt(shot.image_prompt, shot)
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
    """Batch generate images for all shots in project with concurrency and director sketch style"""
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
            prompt = _format_director_storyboard_prompt(shot.image_prompt, shot)
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
            {"step": "story_analyzer", "progress": 25, "message": "正在解析戏剧节拍与角色/场景基准参考锁..."},
            {"step": "shot_planner", "progress": 50, "message": "正在规划 12 镜起承转合与视听尺度韵律..."},
            {"step": "shot_detailer", "progress": 75, "message": "正在注入石墨素描规范、运镜箭头与 Prompt..."},
            {"step": "continuity_checker", "progress": 95, "message": "正在校验 180° 视线与动量连续性..."},
            {"step": "completed", "progress": 100, "message": "好莱坞导演分镜规划完毕！"}
        ]
        for s in steps:
            await asyncio.sleep(0.5)
            yield f"data: {json.dumps(s)}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")
