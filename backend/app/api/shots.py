from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List
from uuid import UUID

from app.db.session import get_db
from app.models.entities import Shot, Sequence
from app.models.schemas import ShotCreate, ShotUpdate, ShotResponse

router = APIRouter(prefix="/shots", tags=["shots"])

@router.get("/sequence/{sequence_id}", response_model=List[ShotResponse])
async def get_sequence_shots(
    sequence_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Shot)
        .where(Shot.sequence_id == sequence_id)
        .order_by(Shot.order.asc())
    )
    return result.scalars().all()

@router.post("", response_model=ShotResponse, status_code=status.HTTP_201_CREATED)
async def create_shot(
    data: ShotCreate,
    db: AsyncSession = Depends(get_db)
):
    # Verify sequence exists
    seq_res = await db.execute(select(Sequence).where(Sequence.id == data.sequence_id))
    seq = seq_res.scalars().first()
    if not seq:
        raise HTTPException(status_code=404, detail="Sequence not found")

    # If order is default or collision, calculate next order
    existing_shots = await db.execute(
        select(Shot).where(Shot.sequence_id == data.sequence_id).order_by(Shot.order.desc())
    )
    last_shot = existing_shots.scalars().first()
    next_order = (last_shot.order + 1) if last_shot else 1

    shot = Shot(
        sequence_id=data.sequence_id,
        order=data.order if data.order > 1 else next_order,
        duration=data.duration,
        shot_size=data.shot_size,
        camera_angle=data.camera_angle,
        camera_movement=data.camera_movement,
        subject=data.subject,
        action=data.action,
        dialogue=data.dialogue,
        composition=data.composition,
        character_direction=data.character_direction,
        narrative_function=data.narrative_function,
        lighting=data.lighting,
        audio=data.audio,
        emotion=data.emotion,
        transition=data.transition,
        notes=data.notes
    )
    db.add(shot)
    await db.commit()
    await db.refresh(shot)
    return shot

@router.put("/{shot_id}", response_model=ShotResponse)
async def update_shot(
    shot_id: UUID,
    data: ShotUpdate,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Shot).where(Shot.id == shot_id))
    shot = result.scalars().first()
    if not shot:
        raise HTTPException(status_code=404, detail="Shot not found")

    update_dict = data.model_dump(exclude_unset=True)
    
    # Check if visual-relevant fields changed -> mark is_dirty
    visual_fields = {"action", "subject", "shot_size", "camera_angle", "camera_movement", "composition", "lighting"}
    has_visual_change = any(field in update_dict for field in visual_fields)
    
    for field, val in update_dict.items():
        setattr(shot, field, val)
    
    if has_visual_change and "is_dirty" not in update_dict:
        shot.is_dirty = True

    await db.commit()
    await db.refresh(shot)
    return shot

@router.delete("/{shot_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_shot(
    shot_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Shot).where(Shot.id == shot_id))
    shot = result.scalars().first()
    if not shot:
        raise HTTPException(status_code=404, detail="Shot not found")

    await db.delete(shot)
    await db.commit()
