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
    """Creates in-memory demo project and 12 Matrix Kung Fu shots for instant demo exporting"""
    p = Project(
        id=uuid.uuid4(),
        title="矩阵·赛博宗师：雨夜茶馆决战 (The Matrix: Cyber Master)",
        story="赛博雨夜，青瓦飞檐的古典中式茶楼隐没在全息霓虹广告与绿色数据流雨幕中。黑客武术大师墨客身着黑色立领长衫风衣踏入雨巷，与拦截的特工银狐狭路相逢。两人展开惊心动魄的近身功夫对决，经历了电磁枪拔枪、经典360度子弹时间铁板桥闪避、凌空三连踢，最终特工被踢飞撞碎雕花屏风，墨客收势伫立在雨中。",
        target_duration=30.0
    )

    shots_data = [
        (1, 2.5, "extreme_wide_shot", "high_angle", "crane", "古风茶楼与赛博雨夜", "俯瞰赛博雨夜，青瓦飞檐的古风茶楼悬挂着发光的红灯笼，周围环绕着绿色全息数据流与密集的雨幕。"),
        (2, 2.0, "wide_shot", "eye_level", "tracking_right", "墨客 (Moke)", "墨客身穿黑色立领长衫风衣，戴着黑色墨镜，缓步踏过水洼，皮靴带起一圈圈慢动作水花涟漪。"),
        (3, 2.0, "medium_shot", "low_angle", "push_in", "特工银狐 (Agent Fox)", "特工银狐从茶馆暗影中缓步走出，右手微抬，袖口机械装置发出淡蓝色充能微光。"),
        (4, 2.5, "medium_close_up", "eye_level", "static", "墨客 (Moke)", "墨客面容沉静，双手从容展开摆出经典咏春/太极问手起手式，手指轻勾：“请。”"),
        (5, 2.0, "full_shot", "dutch_angle", "handheld", "特工与墨客", "特工暴喝一声率先发难，瞬步暴冲撕裂雨雾，重拳带起空气激波直轰墨客面门。"),
        (6, 3.0, "close_up", "low_angle", "tracking_left", "拳脚拆招", "墨客不退反进，左右黐手黏带化劲，手腕翻转顺势格挡，两人近身拳影交错火花四溅。"),
        (7, 3.5, "extreme_close_up", "eye_level", "pan_left", "电磁枪拔枪", "特工近战受阻，左手突然拔出高科技电磁手枪直抵墨客眉心，决然扣动扳机。"),
        (8, 3.5, "medium_shot", "worms_eye", "tracking_right", "墨客子弹时间铁板桥", "【经典子弹时间】镜头360度极慢速环绕，墨客极限铁板桥下腰，电磁子弹旋转穿透悬浮水珠，在墨镜上方划出清晰气浪。"),
        (9, 2.5, "medium_close_up", "low_angle", "push_in", "墨客起身特写", "墨客腰背借力如春藤回弹起身，墨镜上赫然反光映出特工惊恐瞪大的双眼。"),
        (10, 2.5, "full_shot", "dutch_angle", "tracking_right", "凌空飞踢", "墨客借势腾空而起，在空中展开华丽的凌空飞踢（三连佛山无影脚），重重踏在特工胸膛护甲上。"),
        (11, 2.0, "wide_shot", "high_angle", "pull_out", "特工倒飞坠地", "特工如炮弹般倒飞撞穿茶馆二楼的雕花木格屏风，木屑与雨瓦轰然炸裂，狠狠摔入街巷积水中。"),
        (12, 2.0, "medium_shot", "eye_level", "static", "墨客收势", "墨客潇洒单膝落地后挺拔站起，单手轻拂长衫下摆，四周雨水流速瞬间恢复正常，从容收势。")
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
            image_prompt=f"Cinematic 2D storyboard sketch, {size} {angle}, {act}",
            video_prompt=f"Camera {mov} {act}",
            continuity_data={"screen_direction": "left_to_right"}
        )
        shots.append(s)
    return p, shots

async def _get_project_and_shots(project_id: str, db: AsyncSession) -> Tuple[Project, List[Shot]]:
    # Support demo project exporting
    if project_id.startswith("demo") or project_id == "demo":
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
    """Deliverable 1: Export 12-Frame Storyboard Contact Sheet PNG"""
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
