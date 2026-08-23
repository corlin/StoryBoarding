from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import List
from uuid import UUID

from app.db.session import get_db
from app.models.entities import Project, Sequence, Shot, User
from app.models.schemas import (
    ProjectCreate,
    ProjectUpdate,
    ProjectDetailResponse,
    ProjectListItem
)

router = APIRouter(prefix="/projects", tags=["projects"])

# Mock single user dependency for MVP
async def get_current_user(db: AsyncSession = Depends(get_db)) -> User:
    result = await db.execute(select(User).limit(1))
    user = result.scalars().first()
    if not user:
        # Auto-create default user for development/MVP
        user = User(
            email="director@workspace.local",
            name="Director",
            oauth_provider="local"
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
    return user

@router.get("", response_model=List[ProjectListItem])
async def list_projects(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Project)
        .where(Project.user_id == user.id)
        .order_by(Project.updated_at.desc())
    )
    projects = result.scalars().all()
    
    items = []
    for p in projects:
        # Count shots
        shot_res = await db.execute(
            select(Shot)
            .join(Sequence)
            .where(Sequence.project_id == p.id)
        )
        shots = shot_res.scalars().all()
        items.append(ProjectListItem(
            id=p.id,
            title=p.title,
            target_duration=p.target_duration,
            shot_count=len(shots),
            created_at=p.created_at,
            updated_at=p.updated_at
        ))
    return items

@router.post("", response_model=ProjectDetailResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    data: ProjectCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    project = Project(
        user_id=user.id,
        title=data.title,
        story=data.story,
        creative_brief=data.creative_brief,
        style_config=data.style_config,
        target_duration=data.target_duration
    )
    db.add(project)
    await db.flush()

    # Create default sequence
    default_seq = Sequence(
        project_id=project.id,
        order=1,
        name="Sequence 1"
    )
    db.add(default_seq)
    await db.flush()

    # Query with relationships loaded
    result = await db.execute(
        select(Project)
        .where(Project.id == project.id)
        .options(selectinload(Project.sequences).selectinload(Sequence.shots))
    )
    return result.scalars().first()

@router.get("/{project_id}", response_model=ProjectDetailResponse)
async def get_project(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Project)
        .where(Project.id == project_id, Project.user_id == user.id)
        .options(selectinload(Project.sequences).selectinload(Sequence.shots))
    )
    project = result.scalars().first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project

@router.put("/{project_id}", response_model=ProjectDetailResponse)
async def update_project(
    project_id: UUID,
    data: ProjectUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Project)
        .where(Project.id == project_id, Project.user_id == user.id)
        .options(selectinload(Project.sequences).selectinload(Sequence.shots))
    )
    project = result.scalars().first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    update_dict = data.model_dump(exclude_unset=True)
    for field, val in update_dict.items():
        setattr(project, field, val)
    
    await db.commit()
    await db.refresh(project)
    return project

@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.user_id == user.id)
    )
    project = result.scalars().first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    await db.delete(project)
    await db.commit()
