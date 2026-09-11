export const TURNAROUND_PRESETS = [
  {
    id: "studio_16x9_live_action_casting",
    name: "🏆 16:9 影视实拍选角定妆卡 (Live-Action Casting Sheet · 工业严选)",
    desc: "左侧1/3正面高清85mm证件照(真实皮肤纹理与毛孔) + 右侧2/3等高正/侧90°/背三视图，无缝灰白棚背景，零透视畸变，严格防换脸",
    template:
      "A professional real-life live-action character model casting sheet on ONE 16:9 landscape canvas, seamless clean light grey-white studio photography background. The canvas is strictly divided into two sections: LEFT ZONE (strictly 1/3 of total width): one ultra-sharp high-definition front-facing bust portrait ID photo taken with an 85mm portrait lens, head and shoulders fully in frame, body and face perfectly squared to camera, horizontal eye-level gaze, neutral restrained expression, lips gently closed without smiling, soft even frontal studio beauty lighting, sharp authentic skin texture with visible pores and natural micro-details, absolutely no plastic waxy skin, no excessive airbrushing. RIGHT ZONE (strictly 2/3 of total width): exactly THREE full-body orthographic turnaround views of the EXACT SAME character arranged side by side from left to right on a shared horizontal baseline: 1) Full frontal view facing camera directly in relaxed neutral posture; 2) Strict 90-degree profile side view showing precise head-to-toe silhouette; 3) Full back view facing away completely showing rear hairstyle and back of wardrobe. All three figures must be captured head-to-toe without cropping, identical height, identical anatomical proportions, standing relaxed with arms resting naturally at sides, zero perspective distortion, standard focal length. Matching consistent modern wardrobe across all views. High-end cinematic casting call portfolio, 8k uhd, photorealistic, master cinematography --no cartoon, anime, 3D render, plastic waxy skin, distorted limbs, mutated fingers, text, watermark, rulers, arrows",
  },
  {
    id: "studio_16x9_realistic",
    name: "🎬 16:9 黄金三区定妆卡 · 半写实厚涂 (标准短剧基准)",
    desc: "左区34%半身像面部基准 + 右上全身正/侧/背三视图平光量体 + 右下4-5个细节条，纯白底",
    template:
      "Single character model sheet on ONE 16:9 landscape canvas. The canvas is divided into three zones by thin hairline rules. LEFT ZONE — about 34% width: one bust portrait, head and shoulders, front-facing, centred, like an ID photograph, BOTH SHOULDERS FULLY VISIBLE, ending in a clean straight cut. LIGHTING IN LEFT ZONE ONLY: soft directional key light from upper left with gentle falloff, subtle ambient occlusion under chin and neck. RIGHT-TOP ZONE — remaining 66%: three FULL-BODY views of SAME character standing side by side (front view, side profile, back view) on shared ground line. PROPORTIONS ARE CRITICAL: identical height, ratio, relaxed posture. LIGHTING IN RIGHT ZONES: flat even orthographic lighting with no directional key and no cast shadows. RIGHT-BOTTOM ZONE: detail strip of 4-5 small isolated close-up studies of key costume/props/accessories, detail studies give way, not the figures. Pure white background (#FFFFFF). Semi-realistic character illustration, painterly rendering, soft blended edges, anatomically grounded, 8k uhd --no plastic waxy skin, over-smoothed doll face, perfectly symmetrical face",
  },
  {
    id: "studio_16x9_ghibli",
    name: "🎨 16:9 黄金三区定妆卡 · 吉卜力手绘 (Ghibli Cel Shading)",
    desc: "手绘赛璐璐动画风格，全图均匀日光无阴影，左区头像基准 + 右上三视图 + 右下细节",
    template:
      "Single character model sheet on ONE 16:9 landscape canvas divided into three zones by thin hairline rules. Hand-painted anime cel illustration in the manner of classic Studio Ghibli feature animation: clean confident ink linework, simple flat cel shading, warm naturalistic palette. LEFT ZONE (~34% width): bust portrait front-facing, centred ID framing, clean flat skin tone with single soft shadow shape and warm blush, clear expressive eyes with round highlight, grouped hair clumps. RIGHT-TOP ZONE: three FULL-BODY views of SAME character standing side by side (front, side, back) on one shared ground line, identical height and proportions. LIGHTING: even gentle daylight across the whole sheet with single soft shadow tone, flat lighting throughout. RIGHT-BOTTOM ZONE: 4-5 small isolated close-up studies of key props and details. Pure white background (#FFFFFF). Clean lineart, masterpiece --no photorealistic, 3d render, hyperrealistic skin texture, visible pores, subsurface scattering, harsh contrast",
  },
  {
    id: "turnaround_3view",
    name: "标准三视图 (Front/Side/Back)",
    desc: "全身三视图，正视、侧视、后背，对齐标准建模与多角度生图",
    template:
      "character sheet, full body turnaround, front view, side profile view, back view, neutral A-pose, clean neutral studio lighting, plain white background, cinematic realistic character design, precise facial alignment, 8k uhd",
  },
  {
    id: "turnaround_portrait_3quarter",
    name: "电影级特写 & 3/4 侧脸",
    desc: "聚焦面容骨骼与发型的高清微表情肖像，显著提升五官一致性",
    template:
      "character model sheet, multi-angle facial portraits, front view, 3/4 dynamic view, sharp profile view, neutral calm gaze, dramatic chiaroscuro movie lighting, clean neutral grey backdrop, 85mm portrait lens, ultra-detailed skin texture, 8k",
  },
  {
    id: "turnaround_drama_urban",
    name: "都市短剧男女主轻奢定妆卡",
    desc: "都市男女主时尚造型卡，全身与半身双机位高级感",
    template:
      "cinematic fashion lookbook, dual-angle character sheet, full body standing pose and waist-up medium portrait, modern tailored luxury wardrobe, sophisticated styling, soft rim light, 35mm cinematic film still, photorealistic, 8k resolution",
  },
  {
    id: "turnaround_anime_cel",
    name: "二次元/国风动漫立绘",
    desc: "清晰线稿与赛璐璐光影，多角度表情与全身",
    template:
      "anime character design sheet, multiple angles, full body front view and 3/4 view, detailed facial expression sketches, clean lineart, vibrant cel shading, neutral pose, character turnaround, white background, masterpiece",
  },
];

export const VOICE_DNA_PRESETS = [
  {
    id: "mature_male",
    name: "🎩 沉稳大叔音 (35岁低沉磁性、成熟稳重、微烟嗓)",
    prompt: "35岁成熟男性，嗓音低沉磁性且富有共鸣，语速沉稳从容，咬字清晰利落，带轻微成熟烟嗓质感与压迫感",
  },
  {
    id: "cold_female",
    name: "👠 清冷御姐音 (26岁音色清亮、语调偏冷、干练果决)",
    prompt: "26岁职场女性，音色清亮通透，语调偏冷清从容，咬字干练利落，带有独立知性气质与决断力",
  },
  {
    id: "sunny_young",
    name: "☀️ 阳光少年音 (19岁清朗明快、朝气蓬勃、富有感染力)",
    prompt: "19岁年轻男性，嗓音清脆明朗，语调自然上扬富有朝气活力，情绪饱满真实，语速轻快有节奏感",
  },
  {
    id: "sweet_girl",
    name: "🌸 甜美娇俏音 (22岁软糯灵动、尾音微翘、温柔亲和)",
    prompt: "22岁年轻女性，声线甜美柔和，咬字软糯灵动，带有微翘的尾音与温柔亲和力，情感表达细腻",
  },
  {
    id: "dark_villain",
    name: "♟️ 阴鸷反派音 (42岁沙哑压抑、阴冷微气声、掌控力)",
    prompt: "42岁中年男性，嗓音微带沙哑与压迫感，语速缓慢阴沉，伴随冷冽的气声吐字，极具威慑与控制感",
  },
  {
    id: "gentle_scholar",
    name: "📚 温润公子音 (28岁温和文雅、如沐春风、书卷气)",
    prompt: "28岁青年男性，音色如玉般温润，谈吐平和文雅，语速适中带有谦逊教养与浓厚书卷气",
  },
];

export const STYLE_PRESETS = [
  {
    id: "graphite_previz",
    name: "🏆 1. 经典石墨分镜铅笔素描 (Graphite Previz · 推荐)",
    badge: "导演预演基准",
    desc: "纯黑白与克制灰阶、粗犷石墨铅笔速写线、自信结构笔触与运动指示箭头",
    prompt:
      "Professional pre-production director's storyboard sketch, 16:9 cinematic frame, rough graphite and dark pencil construction lines, bold confident gestural strokes, selective grayscale wash shading, clear silhouette staging, directional movement arrows --no speech balloons, comic panels, manga screentones, finished 3D render, saturated color painting, photorealistic film still, text paragraphs",
  },
  {
    id: "cinematic_35mm",
    name: "🎬 2. 35mm 胶片写实电影感 (35mm Cinematic Film Still)",
    badge: "院线质感",
    desc: "柯达 5219 胶片质感、微颗粒、自然光学大光圈虚化、自然体积光影与真实人物皮肤肌理",
    prompt:
      "Cinematic 35mm film still, Kodak Vision3 5219 color grade, natural volumetric atmosphere, shallow depth of field, authentic film grain, high dynamic range, master cinematography, realistic authentic textures, edge-to-edge full frame --no watermark, subtitle bar, border frame, cartoon, 3d render, plastic doll skin",
  },
  {
    id: "neo_anime_cel",
    name: "🎨 3. 新国风 / 赛璐璐动漫 (Neo-Anime Cel / Ghibli)",
    badge: "短剧/番剧爆款",
    desc: "精美手绘线稿、清爽赛璐璐分层光影、高通透温润色彩，适合玄幻古装与二次元都市题材",
    prompt:
      "Masterpiece anime cel animation still, crisp clean lineart, vibrant painterly background, Studio Ghibli inspired lighting, gentle cinematic depth, soft watercolor hues, expressive character acting --no realistic photograph, 3d cgi render, blurry compression",
  },
  {
    id: "accent_glow",
    name: "⚡ 4. 局部荧光暗黑悬疑 (Monochrome with Accent Glow)",
    badge: "悬疑反转",
    desc: "90% 黑白灰阶速写 ➕ 10% 关键视觉焦点荧光点缀（如警示绯红/赛博青绿），极强戏剧张力",
    prompt:
      "Monochromatic noir director's storyboard sketch with subtle glowing cyan and crimson accents, high-contrast chiaroscuro, bold graphite contours, dynamic motion vectors, cinematic wide composition --no speech balloons, full color painting, over-saturated backdrop",
  },
];
