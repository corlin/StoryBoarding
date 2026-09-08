import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

root = Path(__file__).resolve().parent
payload = json.loads((root / "create-series.json").read_text())
out = root / "delivery"
font_path = "/System/Library/Fonts/STHeiti Medium.ttc"

def font(size):
    return ImageFont.truetype(font_path, size)

def wrap(text, width):
    text = (text or "环境声，无对白").replace("“", "").replace("”", "")
    return "\n".join(text[i:i + width] for i in range(0, len(text), width))

colors = [(16, 24, 39), (23, 32, 51), (26, 35, 56), (20, 36, 58)]
for episode in payload["episodes"]:
    episode_dir = out / f"ep{episode['episode_number']:02d}"
    episode_dir.mkdir(parents=True, exist_ok=True)
    for index, shot in enumerate(episode["shots"], 1):
        image = Image.new("RGB", (720, 1280), colors[(index - 1) % len(colors)])
        draw = ImageDraw.Draw(image)
        draw.rounded_rectangle((36, 42, 684, 120), 18, fill=(34, 45, 67), outline=(229, 181, 103), width=2)
        title = f"{episode['title']}  ·  SHOT {index:02d}"
        draw.text((360, 81), title, font=font(28), fill=(229, 181, 103), anchor="mm")
        action = wrap(shot["action"], 16)
        box = draw.multiline_textbbox((0, 0), action, font=font(39), spacing=18, align="center")
        height = box[3] - box[1]
        draw.multiline_text((360, 560 - height / 2), action, font=font(39), fill="white", spacing=18, anchor="ma", align="center")
        dialogue = wrap(shot.get("dialogue", ""), 18)
        draw.rounded_rectangle((45, 970, 675, 1205), 20, fill=(8, 13, 24), outline=(78, 91, 115), width=2)
        draw.multiline_text((360, 1085), dialogue, font=font(32), fill=(255, 232, 163), spacing=14, anchor="mm", align="center")
        draw.text((360, 1245), "TECHNICAL ANIMATIC · 9:16 · 6s", font=font(17), fill=(130, 145, 169), anchor="mm")
        image.save(episode_dir / f"shot_{index:02d}.png")
