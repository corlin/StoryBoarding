import io
import json
import zipfile
from typing import List
from PIL import Image, ImageDraw, ImageFont
from app.models.entities import Project, Shot
from app.providers.image.openai_dalle import OpenAIImageProvider, get_font

class ExportService:
    @staticmethod
    def export_storyboard_page_image(project: Project, shots: List[Shot]) -> bytes:
        """Stitches shots with real visual storyboards into a 3x4 (12-frame) Contact Sheet with Chinese typography"""
        cols = 3
        rows = 4
        cell_w, cell_h = 560, 315 # 16:9 ratio
        margin = 32
        header_h = 130

        total_w = cols * cell_w + (cols + 1) * margin
        total_h = header_h + rows * cell_h + (rows + 1) * margin

        canvas = Image.new("RGB", (total_w, total_h), color=(11, 15, 23))
        draw = ImageDraw.Draw(canvas)

        font_title = get_font(28)
        font_sub = get_font(16)
        font_badge = get_font(14)
        font_action = get_font(13)

        # Header Title Area
        draw.rectangle([0, 0, total_w, header_h - 15], fill=(15, 23, 42))
        draw.line([(0, header_h - 15), (total_w, header_h - 15)], fill=(30, 41, 59), width=2)
        
        project_title = project.title or "AI Director Workspace Storyboard"
        draw.text((margin, 25), f"项目: {project_title}", fill=(248, 250, 252), font=font_title)
        draw.text(
            (margin, 70),
            f"目标总时长: {project.target_duration} 秒  |  分镜头总数: {len(shots)} 镜  |  排版规格: 12-Frame (3×4) Contact Sheet",
            fill=(148, 163, 184),
            font=font_sub
        )

        image_provider = OpenAIImageProvider()

        # Render 3x4 cells
        for idx, shot in enumerate(shots[:12]):
            r = idx // cols
            c = idx % cols
            x = margin + c * (cell_w + margin)
            y = header_h + r * (cell_h + margin)

            # Generate or render the 16:9 storyboard image for this shot
            shot_dict = {
                "order": shot.order,
                "shot_size": shot.shot_size,
                "camera_angle": shot.camera_angle,
                "camera_movement": shot.camera_movement if isinstance(shot.camera_movement, dict) else {},
                "action": shot.action
            }
            raw_image_bytes = image_provider._generate_cinematic_mock_image(
                shot.image_prompt or shot.action,
                shot_dict
            )

            try:
                cell_img = Image.open(io.BytesIO(raw_image_bytes))
                cell_img = cell_img.resize((cell_w, cell_h), Image.Resampling.LANCZOS)
                canvas.paste(cell_img, (x, y))
            except Exception as e:
                print(f"Error pasting cell image for shot {shot.order}: {e}")
                draw.rectangle([x, y, x + cell_w, y + cell_h], outline=(45, 55, 72), fill=(24, 29, 39), width=2)

            # Outer border highlight
            draw.rectangle([x, y, x + cell_w, y + cell_h], outline=(51, 65, 85), width=2)

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
            zf.writestr("STORYBOARD_PAGE_12_FRAMES.png", sheet_bytes)

        return buf.getvalue()
