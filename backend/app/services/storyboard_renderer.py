import io
import os
import math
from typing import Optional, Dict, Any
from PIL import Image, ImageDraw, ImageFont

FONT_PATHS = [
    "app/assets/fonts/chinese_font.ttc",
    "backend/app/assets/fonts/chinese_font.ttc",
    "/System/Library/Fonts/STHeiti Medium.ttc",
    "/System/Library/Fonts/PingFang.ttc",
    "/usr/share/fonts/truetype/wqy/wqy-microhei.ttc"
]

def get_font(size: int = 16) -> ImageFont.ImageFont:
    """Safely retrieves a CJK TrueType font or falls back to Pillow default"""
    for fp in FONT_PATHS:
        if os.path.exists(fp):
            try:
                return ImageFont.truetype(fp, size=size)
            except Exception:
                pass
    return ImageFont.load_default()

def render_shot_storyboard_image(
    order: int,
    shot_size: str,
    camera_angle: str,
    camera_movement: Dict[str, Any],
    action: str,
    width: int = 960,
    height: int = 540
) -> Image.Image:
    """Renders 1-to-1 exact visual storyboard frame in PIL matching the UI design"""
    shot_no_str = f"{int(order):02d}"
    size_upper = shot_size.replace("_", " ").upper()
    angle_upper = camera_angle.replace("_", " ").upper()
    mov_type = camera_movement.get("type", "static") if isinstance(camera_movement, dict) else "static"
    mov_upper = mov_type.replace("_", " ").upper()

    # Base Canvas: Dark Cyberpunk Slate
    img = Image.new("RGB", (width, height), color=(11, 15, 25))
    draw = ImageDraw.Draw(img)

    # Background grid lines (40px step)
    for gx in range(0, width, 40):
        draw.line([(gx, 0), (gx, height)], fill=(24, 33, 47), width=1)
    for gy in range(0, height, 40):
        draw.line([(0, gy), (width, gy)], fill=(24, 33, 47), width=1)

    # Rule of Thirds Guide Lines (dashed)
    for x_third in [width // 3, (2 * width) // 3]:
        for y in range(16, height - 16, 12):
            draw.line([(x_third, y), (x_third, min(y + 6, height - 16))], fill=(51, 65, 85), width=1)
    for y_third in [height // 3, (2 * height) // 3]:
        for x in range(16, width - 16, 12):
            draw.line([(x, y_third), (min(x + 6, width - 16), y_third)], fill=(51, 65, 85), width=1)

    # Accent color determination
    if order == 1:
        accent = (16, 185, 129) # Emerald
    elif order in [2, 9, 10]:
        accent = (56, 189, 248) # Sky blue
    elif order in [3, 7]:
        accent = (239, 68, 68) # Red / Plasma
    elif order == 4:
        accent = (52, 211, 153) # Light green
    elif order in [5, 6, 11]:
        accent = (245, 158, 11) # Amber / Sparks
    else:
        accent = (16, 185, 129) # Master Outro green

    # Safe Area Outer Border
    draw.rectangle([14, 14, width - 14, height - 14], outline=accent, width=2)

    # Scale factor from 640x360 reference to (width, height)
    sx = width / 640.0
    sy = height / 360.0

    # Draw Specific Visual Motifs for the 12 Beats
    if order == 1:
        # Shot 1: Tea House Roof & Neon Rain (EWS)
        draw.line([(120 * sx, 220 * sy), (320 * sx, 140 * sy), (520 * sx, 220 * sy)], fill=(5, 150, 105), width=int(5 * sx))
        draw.line([(100 * sx, 225 * sy), (320 * sx, 125 * sy), (540 * sx, 225 * sy)], fill=(52, 211, 153), width=int(3 * sx))
        draw.rectangle([220 * sx, 220 * sy, 420 * sx, 310 * sy], fill=(15, 23, 42), outline=(16, 185, 129), width=int(2 * sx))
        draw.ellipse([(250 - 14) * sx, (245 - 14) * sy, (250 + 14) * sx, (245 + 14) * sy], fill=(239, 68, 68))
        draw.ellipse([(390 - 14) * sx, (245 - 14) * sy, (390 + 14) * sx, (245 + 14) * sy], fill=(239, 68, 68))
        for rx, y1, y2 in [(80, 40, 160), (160, 20, 180), (480, 30, 170), (560, 50, 200)]:
            for ry in range(y1, y2, 16):
                draw.line([(rx * sx, ry * sy), (rx * sx, (ry + 8) * sy)], fill=(16, 185, 129), width=int(2 * sx))

    elif order == 2:
        # Shot 2: Master walking in rain (WS)
        draw.ellipse([(280 - 20) * sx, (140 - 20) * sy, (280 + 20) * sx, (140 + 20) * sy], fill=(56, 189, 248))
        draw.polygon([(250 * sx, 180 * sy), (310 * sx, 180 * sy), (330 * sx, 270 * sy), (230 * sx, 270 * sy)], fill=(2, 132, 199))
        draw.line([(280 * sx, 158 * sy), (280 * sx, 260 * sy)], fill=(56, 189, 248), width=int(6 * sx))
        draw.line([(280 * sx, 260 * sy), (240 * sx, 310 * sy)], fill=(56, 189, 248), width=int(6 * sx))
        draw.line([(280 * sx, 260 * sy), (310 * sx, 310 * sy)], fill=(56, 189, 248), width=int(6 * sx))
        draw.ellipse([(280 - 50) * sx, (315 - 10) * sy, (280 + 50) * sx, (315 + 10) * sy], outline=(56, 189, 248), width=int(2 * sx))
        draw.ellipse([(280 - 90) * sx, (315 - 18) * sy, (280 + 90) * sx, (315 + 18) * sy], outline=(2, 132, 199), width=int(2 * sx))

    elif order == 3:
        # Shot 3: Agent Fox emerging (MS)
        draw.ellipse([(360 - 22) * sx, (130 - 22) * sy, (360 + 22) * sx, (130 + 22) * sy], fill=(239, 68, 68))
        draw.polygon([(320 * sx, 170 * sy), (400 * sx, 170 * sy), (390 * sx, 280 * sy), (330 * sx, 280 * sy)], fill=(30, 41, 59), outline=(239, 68, 68))
        draw.line([(400 * sx, 200 * sy), (470 * sx, 190 * sy)], fill=(56, 189, 248), width=int(7 * sx))
        draw.polygon([(465 * sx, 185 * sy), (495 * sx, 190 * sy), (465 * sx, 195 * sy)], fill=(56, 189, 248))
        draw.line([(330 * sx, 125 * sy), (390 * sx, 125 * sy)], fill=(244, 63, 94), width=int(4 * sx))

    elif order == 4:
        # Shot 4: Wing Chun stance (MCU)
        draw.ellipse([(320 - 26) * sx, (120 - 26) * sy, (320 + 26) * sx, (120 + 26) * sy], fill=(16, 185, 129))
        draw.polygon([(280 * sx, 170 * sy), (360 * sx, 170 * sy), (350 * sx, 300 * sy), (290 * sx, 300 * sy)], fill=(15, 23, 42), outline=(16, 185, 129))
        draw.line([(300 * sx, 180 * sy), (230 * sx, 210 * sy), (250 * sx, 160 * sy)], fill=(52, 211, 153), width=int(6 * sx))
        draw.line([(340 * sx, 180 * sy), (410 * sx, 200 * sy), (390 * sx, 150 * sy)], fill=(52, 211, 153), width=int(6 * sx))
        draw.ellipse([(250 - 7) * sx, (160 - 7) * sy, (250 + 7) * sx, (160 + 7) * sy], fill=(52, 211, 153))
        draw.ellipse([(390 - 7) * sx, (150 - 7) * sy, (390 + 7) * sx, (150 + 7) * sy], fill=(52, 211, 153))

    elif order == 5:
        # Shot 5: Explosive Dash (FS)
        for d in range(100, 480, 30):
            draw.line([(d * sx, (280 - (d - 100) * 0.26) * sy), ((d + 16) * sx, (280 - (d + 16 - 100) * 0.26) * sy)], fill=(245, 158, 11), width=int(5 * sx))
        draw.polygon([(480 * sx, 180 * sy), (430 * sx, 160 * sy), (450 * sx, 210 * sy)], fill=(245, 158, 11))
        draw.ellipse([(440 - 20) * sx, (170 - 20) * sy, (440 + 20) * sx, (170 + 20) * sy], fill=(245, 158, 11))
        draw.line([(200 * sx, 100 * sy), (350 * sx, 280 * sy)], fill=(251, 191, 36), width=int(3 * sx))

    elif order == 6:
        # Shot 6: Close-up parrying sparks (CU)
        draw.ellipse([(320 - 45) * sx, (180 - 45) * sy, (320 + 45) * sx, (180 + 45) * sy], fill=(60, 40, 15), outline=(245, 158, 11))
        draw.line([(220 * sx, 220 * sy), (310 * sx, 180 * sy)], fill=(56, 189, 248), width=int(9 * sx))
        draw.line([(420 * sx, 210 * sy), (330 * sx, 180 * sy)], fill=(56, 189, 248), width=int(9 * sx))
        draw.polygon([
            (320 * sx, 145 * sy), (332 * sx, 172 * sy), (360 * sx, 180 * sy), (332 * sx, 188 * sy),
            (320 * sx, 215 * sy), (308 * sx, 188 * sy), (280 * sx, 180 * sy), (308 * sx, 172 * sy)
        ], fill=(251, 191, 36))
        draw.ellipse([(350 - 5) * sx, (160 - 5) * sy, (350 + 5) * sx, (160 + 5) * sy], fill=(239, 68, 68))
        draw.ellipse([(290 - 6) * sx, (200 - 6) * sy, (290 + 6) * sx, (200 + 6) * sy], fill=(56, 189, 248))

    elif order == 7:
        # Shot 7: Gun draw extreme close up (ECU)
        draw.rectangle([220 * sx, 150 * sy, 400 * sx, 200 * sy], fill=(30, 41, 59), outline=(239, 68, 68), width=int(3 * sx))
        draw.ellipse([(400 - 24) * sx, (175 - 24) * sy, (400 + 24) * sx, (175 + 24) * sy], outline=(56, 189, 248), width=int(4 * sx))
        draw.ellipse([(400 - 10) * sx, (175 - 10) * sy, (400 + 10) * sx, (175 + 10) * sy], fill=(56, 189, 248))
        draw.line([(420 * sx, 175 * sy), (560 * sx, 175 * sy)], fill=(56, 189, 248), width=int(7 * sx))

    elif order == 8:
        # Shot 8: Bullet Time Orbit Dodge (MS)
        draw.ellipse([(320 - 200) * sx, (180 - 65) * sy, (320 + 200) * sx, (180 + 65) * sy], outline=(16, 185, 129), width=int(3 * sx))
        draw.line([(100 * sx, 180 * sy), (540 * sx, 180 * sy)], fill=(245, 158, 11), width=int(6 * sx))
        draw.polygon([(530 * sx, 170 * sy), (565 * sx, 180 * sy), (530 * sx, 190 * sy)], fill=(245, 158, 11))
        # Bending master horizontal posture
        draw.line([(220 * sx, 230 * sy), (420 * sx, 230 * sy)], fill=(56, 189, 248), width=int(9 * sx))
        draw.ellipse([(320 - 22) * sx, (245 - 22) * sy, (320 + 22) * sx, (245 + 22) * sy], fill=(56, 189, 248))
        font_bt = get_font(int(14 * sx))
        draw.text((320 * sx - 110 * sx, 120 * sy), "★ BULLET TIME 360° ORBIT ★", fill=(16, 185, 129), font=font_bt)

    elif order == 9:
        # Shot 9: Sunglasses Reflection (MCU)
        draw.rectangle([220 * sx, 130 * sy, 300 * sx, 175 * sy], fill=(15, 23, 42), outline=(56, 189, 248), width=int(3 * sx))
        draw.rectangle([340 * sx, 130 * sy, 420 * sx, 175 * sy], fill=(15, 23, 42), outline=(56, 189, 248), width=int(3 * sx))
        draw.line([(300 * sx, 145 * sy), (340 * sx, 145 * sy)], fill=(56, 189, 248), width=int(3 * sx))
        draw.ellipse([(260 - 15) * sx, (152 - 15) * sy, (260 + 15) * sx, (152 + 15) * sy], fill=(239, 68, 68))
        draw.ellipse([(380 - 15) * sx, (152 - 15) * sy, (380 + 15) * sx, (152 + 15) * sy], fill=(239, 68, 68))
        draw.line([(320 * sx, 280 * sy), (320 * sx, 200 * sy)], fill=(52, 211, 153), width=int(6 * sx))
        draw.polygon([(320 * sx, 190 * sy), (310 * sx, 210 * sy), (330 * sx, 210 * sy)], fill=(52, 211, 153))

    elif order == 10:
        # Shot 10: Flying Kick (FS)
        draw.line([(180 * sx, 140 * sy), (380 * sx, 200 * sy)], fill=(56, 189, 248), width=int(9 * sx))
        draw.ellipse([(170 - 18) * sx, (130 - 18) * sy, (170 + 18) * sx, (130 + 18) * sy], fill=(56, 189, 248))
        draw.ellipse([(420 - 30) * sx, (210 - 30) * sy, (420 + 30) * sx, (210 + 30) * sy], outline=(239, 68, 68), width=int(4 * sx))
        draw.ellipse([(420 - 55) * sx, (210 - 55) * sy, (420 + 55) * sx, (210 + 55) * sy], outline=(245, 158, 11), width=int(3 * sx))
        draw.line([(390 * sx, 210 * sy), (500 * sx, 210 * sy)], fill=(239, 68, 68), width=int(7 * sx))

    elif order == 11:
        # Shot 11: Shattering Wooden Screen (WS)
        draw.rectangle([180 * sx, 90 * sy, 460 * sx, 270 * sy], outline=(217, 119, 6), width=int(4 * sx))
        draw.line([(220 * sx, 120 * sy), (310 * sx, 240 * sy)], fill=(251, 191, 36), width=int(4 * sx))
        draw.line([(340 * sx, 100 * sy), (420 * sx, 220 * sy)], fill=(251, 191, 36), width=int(4 * sx))
        draw.polygon([(300 * sx, 160 * sy), (340 * sx, 140 * sy), (330 * sx, 190 * sy)], fill=(180, 83, 9))
        draw.polygon([(370 * sx, 180 * sy), (410 * sx, 160 * sy), (390 * sx, 210 * sy)], fill=(180, 83, 9))
        draw.ellipse([(440 - 20) * sx, (260 - 20) * sy, (440 + 20) * sx, (260 + 20) * sy], fill=(239, 68, 68))

    else:
        # Shot 12: Master Poised Outro (MS)
        draw.ellipse([(320 - 22) * sx, (120 - 22) * sy, (320 + 22) * sx, (120 + 22) * sy], fill=(16, 185, 129))
        draw.line([(320 * sx, 140 * sy), (320 * sx, 270 * sy)], fill=(16, 185, 129), width=int(7 * sx))
        draw.line([(320 * sx, 270 * sy), (280 * sx, 320 * sy)], fill=(16, 185, 129), width=int(7 * sx))
        draw.line([(320 * sx, 270 * sy), (360 * sx, 320 * sy)], fill=(16, 185, 129), width=int(7 * sx))
        draw.polygon([(290 * sx, 170 * sy), (350 * sx, 170 * sy), (370 * sx, 280 * sy), (270 * sx, 280 * sy)], fill=(6, 95, 70))
        for rx in [80, 560]:
            for ry in range(20, 340, 16):
                draw.line([(rx * sx, ry * sy), (rx * sx, (ry + 8) * sy)], fill=(16, 185, 129), width=int(2 * sx))

    # Center Reticle Target Focus
    cx, cy = width // 2, height // 2
    draw.ellipse([cx - 8, cy - 8, cx + 8, cy + 8], outline=accent, width=1)
    draw.line([(cx - 18, cy), (cx + 18, cy)], fill=accent, width=1)
    draw.line([(cx, cy - 18), (cx, cy + 18)], fill=accent, width=1)

    # Top Header Badge: [SHOT #01 · EWS · 2.5s]
    font_badge = get_font(int(15 * sy))
    draw.rectangle([24 * sx, 20 * sy, 220 * sx, 48 * sy], fill=(2, 6, 23), outline=(51, 65, 85), width=1)
    draw.text((32 * sx, 25 * sy), f"{shot_no_str} · {size_upper} · {shot_size}", fill=accent, font=font_badge)

    # Bottom Subtitle Action Box
    font_action = get_font(int(14 * sy))
    draw.rectangle([24 * sx, height - (52 * sy), width - (24 * sx), height - (18 * sy)], fill=(2, 6, 23), outline=(30, 41, 59), width=1)
    action_preview = f"动作: {action[:50]}..." if len(action) > 50 else f"动作: {action}"
    draw.text((34 * sx, height - (46 * sy)), action_preview, fill=(241, 245, 249), font=font_action)

    # Bottom Left Camera Movement Badge
    if mov_type and mov_type != "static":
        draw.rectangle([24 * sx, height - (82 * sy), 150 * sx, height - (58 * sy)], fill=(2, 6, 23), outline=(51, 65, 85), width=1)
        draw.text((32 * sx, height - (78 * sy)), f"📷 {mov_type}", fill=(148, 163, 184), font=get_font(int(12 * sy)))

    return img
