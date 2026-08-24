import io
import re
import json
import base64
import zipfile
import math
import httpx
from typing import List
from PIL import Image, ImageDraw, ImageFont
from app.models.entities import Project, Shot
from app.services.storyboard_renderer import get_font, render_shot_storyboard_image

SHOT_SIZE_ABBR = {
    "extreme_wide_shot": "EWS",
    "wide_shot": "WS",
    "full_shot": "FS",
    "medium_shot": "MS",
    "medium_close_up": "MCU",
    "close_up": "CU",
    "extreme_close_up": "ECU",
}

def _wrap_text(text: str, max_chars: int = 34, max_lines: int = 2) -> List[str]:
    """Wraps Chinese and English text cleanly across multiple lines"""
    if not text:
        return ["无动作描述"]
    lines = []
    current = ""
    for ch in text:
        if len(current) >= max_chars:
            lines.append(current)
            current = ch
            if len(lines) >= max_lines - 1:
                break
        else:
            current += ch
    if current:
        if len(lines) >= max_lines - 1 and len(text) > (len("".join(lines)) + len(current)):
            current = current[:-1] + "…"
        lines.append(current)
    return lines[:max_lines]

def _load_or_render_shot_image(shot: Shot, width: int = 560, height: int = 315) -> Image.Image:
    """Attempts to load shot's real AI generated image, falling back to 1-to-1 visual vector drawing"""
    url = getattr(shot, "storyboard_image_url", None)
    if url and isinstance(url, str):
        # 1. Base64 Image
        if url.startswith("data:image"):
            try:
                b64_part = url.split(",", 1)[-1]
                img_data = base64.b64decode(b64_part)
                img = Image.open(io.BytesIO(img_data)).convert("RGB")
                return img.resize((width, height), Image.Resampling.LANCZOS)
            except Exception as e:
                print(f"Failed to load base64 shot image: {e}")

        # 2. HTTP / MinIO URL
        elif url.startswith("http://") or url.startswith("https://"):
            try:
                # Replace localhost minio with internal container address if running in docker
                fetch_url = url.replace("http://localhost:9000", "http://minio:9000")
                with httpx.Client(timeout=5.0) as client:
                    resp = client.get(fetch_url)
                    if resp.status_code == 200:
                        img = Image.open(io.BytesIO(resp.content)).convert("RGB")
                        return img.resize((width, height), Image.Resampling.LANCZOS)
            except Exception as e:
                print(f"Failed to download shot image from {url}: {e}")

    # Fallback to 1-to-1 visual storyboard renderer
    mov = shot.camera_movement if isinstance(shot.camera_movement, dict) else {}
    return render_shot_storyboard_image(
        order=shot.order,
        shot_size=shot.shot_size,
        camera_angle=shot.camera_angle,
        camera_movement=mov,
        action=shot.action,
        width=width,
        height=height
    )

class ExportService:
    @staticmethod
    def export_storyboard_page_image(project: Project, shots: List[Shot]) -> bytes:
        """Stitches shots into a dynamic Contact Sheet matching UI 1-to-1 (card layout, badges, captions)"""
        total_shots = len(shots)
        cols = 3
        rows = max(1, math.ceil(total_shots / cols)) if total_shots > 0 else 1

        img_w, img_h = 560, 315 # 16:9 ratio
        caption_h = 75
        cell_w = img_w
        cell_h = img_h + caption_h
        margin = 28
        header_h = 110

        total_w = cols * cell_w + (cols + 1) * margin
        total_h = header_h + rows * cell_h + (rows + 1) * margin

        canvas = Image.new("RGB", (total_w, total_h), color=(10, 14, 23))
        draw = ImageDraw.Draw(canvas)

        font_title = get_font(26)
        font_sub = get_font(15)
        font_badge = get_font(13)
        font_caption = get_font(14)

        # Header Title Area
        draw.rectangle([0, 0, total_w, header_h - 12], fill=(15, 23, 42))
        draw.line([(0, header_h - 12), (total_w, header_h - 12)], fill=(30, 41, 59), width=2)
        
        project_title = project.title or "AI Director Workspace Storyboard"
        draw.text((margin, 22), f"项目: {project_title}", fill=(248, 250, 252), font=font_title)
        draw.text(
            (margin, 62),
            f"目标总时长: {project.target_duration:.1f} 秒  |  分镜头总数: {total_shots} 镜  |  排版格局: {cols}×{rows} 视觉故事板",
            fill=(148, 163, 184),
            font=font_sub
        )

        # Render Cells matching StoryboardCell.tsx
        for idx, shot in enumerate(shots):
            r = idx // cols
            c = idx % cols
            x = margin + c * (cell_w + margin)
            y = header_h + r * (cell_h + margin)

            # 1. Outer Card Background & Border
            draw.rectangle([x, y, x + cell_w, y + cell_h], fill=(15, 23, 42), outline=(51, 65, 85), width=2)

            # 2. Render 16:9 Storyboard Image
            cell_img = _load_or_render_shot_image(shot, width=img_w, height=img_h)
            canvas.paste(cell_img, (x, y))

            # 3. Top-Left Badge: [01 · WS · 5.0s]
            shot_no = f"{shot.order:02d}"
            size_abbr = SHOT_SIZE_ABBR.get(shot.shot_size, shot.shot_size[:3].upper())
            dur_str = f"{shot.duration:.1f}s" if isinstance(shot.duration, (int, float)) else "2.5s"
            
            badge_text = f"{shot_no} · {size_abbr} · {dur_str}"
            badge_w = 120
            badge_h = 24
            badge_x = x + 10
            badge_y = y + 10

            # Draw translucent badge pill
            draw.rectangle(
                [badge_x, badge_y, badge_x + badge_w, badge_y + badge_h],
                fill=(10, 14, 23),
                outline=(51, 65, 85),
                width=1
            )
            draw.text((badge_x + 8, badge_y + 4), shot_no, fill=(56, 189, 248), font=font_badge)
            draw.text((badge_x + 30, badge_y + 4), f"· {size_abbr} · {dur_str}", fill=(203, 213, 225), font=font_badge)

            # 4. Bottom-Left Camera Movement Badge (if any)
            mov = shot.camera_movement if isinstance(shot.camera_movement, dict) else {}
            mov_type = mov.get("type", "static")
            if mov_type and mov_type != "static":
                mov_text = f"🎥 {mov_type}"
                mov_w = 90
                mov_h = 22
                mov_x = x + 10
                mov_y = y + img_h - mov_h - 10
                draw.rectangle(
                    [mov_x, mov_y, mov_x + mov_w, mov_y + mov_h],
                    fill=(10, 14, 23),
                    outline=(51, 65, 85),
                    width=1
                )
                draw.text((mov_x + 6, mov_y + 3), mov_text, fill=(148, 163, 184), font=get_font(12))

            # 5. Bottom Caption Box (Chinese Action Text matching StoryboardCell)
            cap_y = y + img_h
            draw.line([(x, cap_y), (x + cell_w, cap_y)], fill=(30, 41, 59), width=1)
            
            action_lines = _wrap_text(shot.action, max_chars=34, max_lines=2)
            line_spacing = 20
            text_start_y = cap_y + 12
            for l_idx, line_str in enumerate(action_lines):
                draw.text((x + 14, text_start_y + l_idx * line_spacing), line_str, fill=(226, 232, 240), font=font_caption)

        out = io.BytesIO()
        canvas.save(out, format="PNG")
        return out.getvalue()

    @staticmethod
    def export_shot_script_markdown(project: Project, shots: List[Shot]) -> str:
        """Renders comprehensive Production Shot Script Markdown"""
        lines = [
            f"# {project.title} — 导演分镜头脚本文档",
            f"\n> **目标时长**: {project.target_duration} 秒 | **镜头总数**: {len(shots)} | **生成规范**: AI Director Workspace\n",
            f"## 故事梗概\n{project.story or '未提供故事梗概'}\n",
            "---\n",
            "## 分镜头详细列表\n"
        ]

        for s in shots:
            mov_type = s.camera_movement.get('type', 'static') if isinstance(s.camera_movement, dict) else 'static'
            lines.append(f"### SHOT {s.order:02d} · {s.shot_size.upper()} · {s.duration}s")
            lines.append(f"- **景别机位**: {s.shot_size} / {s.camera_angle}")
            lines.append(f"- **运镜方式**: {mov_type}")
            lines.append(f"- **动作调度**: {s.action}")
            lines.append(f"- **叙事功能**: {s.narrative_function or '主动作推进'}")
            lines.append(f"- **环境光影**: {s.lighting or '自然光'}")
            lines.append(f"- **声音设计**: {s.audio}")
            lines.append(f"- **图像 Prompt**: `{s.image_prompt}`")
            lines.append(f"- **视频 Prompt**: `{s.video_prompt}`")
            lines.append("\n---\n")

        return "\n".join(lines)

    @staticmethod
    def export_generation_package_zip(project: Project, shots: List[Shot]) -> bytes:
        """Zips full Production Generation Package with JSON specs, markdown, and prompt assets"""
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
            # 1. Project metadata JSON
            meta = {
                "project_id": str(project.id),
                "title": project.title,
                "target_duration": project.target_duration,
                "shots_count": len(shots),
                "shots": [
                    {
                        "order": s.order,
                        "duration": s.duration,
                        "shot_size": s.shot_size,
                        "camera_angle": s.camera_angle,
                        "camera_movement": s.camera_movement if isinstance(s.camera_movement, dict) else {},
                        "action": s.action,
                        "image_prompt": s.image_prompt,
                        "video_prompt": s.video_prompt,
                        "continuity_data": s.continuity_data
                    }
                    for s in shots
                ]
            }
            zf.writestr("shot_spec_package.json", json.dumps(meta, ensure_ascii=False, indent=2))

            # 2. Shot Script Markdown
            script_md = ExportService.export_shot_script_markdown(project, shots)
            zf.writestr("SHOT_SCRIPT.md", script_md)

            # 3. Storyboard Sheet Image
            sheet_bytes = ExportService.export_storyboard_page_image(project, shots)
            zf.writestr("STORYBOARD_PAGE_EXPORT.png", sheet_bytes)

        return buf.getvalue()
