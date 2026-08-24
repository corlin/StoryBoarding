import uuid
from typing import List, Tuple
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response, PlainTextResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.db.session import get_db
from app.models.entities import Project, Sequence, Shot
from app.services.export_service import ExportService

router = APIRouter(prefix="/export", tags=["export"])

def _create_demo_project_and_shots() -> Tuple[Project, List[Shot]]:
    """Creates in-memory demo project matching the 6-shot 30.0s Matrix Cyber Master sequence"""
    p = Project(
        id=uuid.uuid4(),
        title="矩阵·赛博宗师：雨夜茶馆决战 (The Matrix: Cyber Master)",
        story="赛博雨夜，青瓦飞檐的古典中式茶楼隐没在全息霓虹广告与绿色数据流雨幕中。黑客武术大师墨客身着黑色立领长衫风衣踏入雨巷，与拦截的特工银狐狭路相逢。两人展开惊心动魄的近身功夫对决，经历了电磁枪拔枪、经典360度子弹时间铁板桥闪避、凌空三连踢，最终特工被踢飞撞碎雕花屏风，墨客收势伫立在雨中。",
        target_duration=30.0
    )

    shots_data = [
        (1, 5.0, "wide_shot", "high_angle", "crane", "古风茶楼", "站在雨中的悬浮茶楼前，霓虹广告投影在湿漉地面上形成扭曲倒影"),
        (2, 4.0, "medium_shot", "low_angle", "push_in", "特工", "从巷道阴影中走出，液压关节发出机械声，等离子短棍展开时迸发蓝色电弧"),
        (3, 3.0, "close_up", "dutch_angle", "static", "机械手指", "机械手指扣动电磁枪扳机，武器充能时浮现红色能量纹路"),
        (4, 6.0, "medium_close_up", "eye_level", "pan_right", "宗师", "以太极云手动作侧身避弹，折扇展开形成电磁屏障，雨滴在力场周围悬浮"),
        (5, 5.0, "wide_shot", "high_angle", "crane_down", "量子碎片", "被电磁弹击中的瞬间，纳米材料碎片呈量子态扩散，每个碎片显示不同时空影像"),
        (6, 7.0, "full_shot", "eye_level", "tracking_back", "宗师收势", "收扇负手而立，风衣下摆缓缓落下，背后悬浮着破碎的茶楼全息投影")
    ]

    shots = []
    for order, duration, size, angle, mov, subj, act in shots_data:
        s = Shot(
            id=uuid.uuid4(),
            order=order,
            duration=duration,
            shot_size=size,
            camera_angle=angle,
            camera_movement={"type": mov},
            subject=subj,
            action=act,
            narrative_function="叙事推进",
            lighting="暗红霓虹与绿色数据流反光",
            audio={},
            image_prompt=f"Professional pre-production director's storyboard sketch, 16:9 cinematic frame, rough graphite and dark pencil lines, bold gestural strokes, selective grayscale wash, clear silhouette staging, directional movement arrows, {size}, {act} --no speech balloons, comic panels, 3d render",
            video_prompt=f"Camera {mov} {act}",
            continuity_data={"screen_direction": "left_to_right"}
        )
        shots.append(s)
    return p, shots

async def _get_project_and_shots(project_id: str, db: AsyncSession) -> Tuple[Project, List[Shot]]:
    # Support demo project exporting
    if project_id.startswith("demo") or project_id == "demo":
        # Check if project with title exists in DB first to get full real images
        p_res = await db.execute(
            select(Project)
            .where(Project.title.like("%矩阵·赛博宗师%"))
            .order_by(Project.created_at.desc())
        )
        proj = p_res.scalars().first()
        if proj:
            seq_res = await db.execute(select(Sequence).where(Sequence.project_id == proj.id))
            seq = seq_res.scalars().first()
            if seq:
                s_res = await db.execute(select(Shot).where(Shot.sequence_id == seq.id).order_by(Shot.order.asc()))
                shots = s_res.scalars().all()
                if shots:
                    return proj, shots
        return _create_demo_project_and_shots()

    try:
        proj_uuid = uuid.UUID(project_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid project ID format")

    p_res = await db.execute(select(Project).where(Project.id == proj_uuid))
    project = p_res.scalars().first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    seq_res = await db.execute(select(Sequence).where(Sequence.project_id == proj_uuid))
    seq = seq_res.scalars().first()
    shots = []
    if seq:
        s_res = await db.execute(select(Shot).where(Shot.sequence_id == seq.id).order_by(Shot.order.asc()))
        shots = s_res.scalars().all()
    return project, shots

@router.get("/storyboard-sheet/{project_id}")
async def export_storyboard_sheet(
    project_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Deliverable 1: Export Storyboard Contact Sheet PNG matching UI 1-to-1"""
    project, shots = await _get_project_and_shots(project_id, db)
    img_bytes = ExportService.export_storyboard_page_image(project, shots)
    return Response(
        content=img_bytes,
        media_type="image/png",
        headers={"Content-Disposition": f"attachment; filename=storyboard_{project_id}.png"}
    )

@router.get("/script-markdown/{project_id}")
async def export_script_markdown(
    project_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Deliverable 2: Export Production Shot Script Markdown"""
    project, shots = await _get_project_and_shots(project_id, db)
    md_content = ExportService.export_shot_script_markdown(project, shots)
    return PlainTextResponse(
        content=md_content,
        media_type="text/markdown",
        headers={"Content-Disposition": f"attachment; filename=shot_script_{project_id}.md"}
    )

@router.get("/director-global-prompt/{project_id}")
async def export_director_global_prompt(
    project_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Deliverable 4: Export Full Professional Director's Storyboard Global Prompt Markdown"""
    project, shots = await _get_project_and_shots(project_id, db)
    prompt_md = ExportService.export_director_global_prompt(project, shots)
    return PlainTextResponse(
        content=prompt_md,
        media_type="text/markdown",
        headers={"Content-Disposition": f"attachment; filename=director_global_prompt_{project_id}.md"}
    )

@router.get("/package-zip/{project_id}")
async def export_package_zip(
    project_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Deliverable 3: Export Shot Generation Package ZIP"""
    project, shots = await _get_project_and_shots(project_id, db)
    zip_bytes = ExportService.export_generation_package_zip(project, shots)
    return Response(
        content=zip_bytes,
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename=generation_package_{project_id}.zip"}
    )
