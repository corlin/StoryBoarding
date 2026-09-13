# 原生音视频模型与外部配音的生产取舍

## 结论

外部配音仍然必要，但不应再作为所有镜头的默认步骤。更合理的产品策略是把音频生产分成三种模式：

1. **原生音视频**：模型一次生成画面、对白、音效和环境声。适合概念验证、一次性角色、环境声较重、对白较短且允许多次抽卡的镜头。
2. **参考音频驱动**：先确定演员录音或 TTS，再让视频模型参考该音频生成表演。适合有可见口型、固定角色音色、指定台词和连续剧角色的镜头。这应是短剧对白镜头的首选。
3. **后期配音**：先生成画面，再配音、混音和字幕；如果人物嘴部清晰可见，还必须增加口型重定向。适合旁白、画外音、背影、远景、蒙面人物、插入镜头，以及需要多语言发行的成片。

因此，真正需要淘汰的不是“外部配音”，而是把一条 TTS 音轨直接贴到清晰说话画面上、却称其为“口型同步”的做法。原生联合生成降低了配音成本；外部声音资产仍承担台词确定性、角色声音连续性、返工、审片、混音和本地化等生产职责。

## 三个容易混淆的能力

| 能力 | 实际含义 | 能否替代专业配音流程 |
|---|---|---|
| 原生音频 | 视频文件自带对白、音效、环境声或音乐 | 只能解决“有声音”，不能自动保证台词、演员、响度和跨镜一致 |
| 音画联合生成 | 模型同时预测声音和画面，事件节奏通常更自然 | 更有利于口型，但不等于逐字正确或达到交付级同步 |
| 音频参考/口型驱动 | 输入确定音频或声音参考，模型据此生成或修改嘴部与表演 | 最接近可控对白生产，仍需台词、同步和画面人工验收 |

Google 在早期视频转音频研究中明确指出：如果画面生成模型没有被对白文本条件化，后加音频会与既有嘴部运动不匹配，产生不自然的口型。[^1] 这解释了为什么“把 TTS 混入 MP4”与“完成口型映射”是两项不同工作。

## 模型能力核验

### MiniMax H3

MiniMax H3 不是 Hailuo-02 的别名，而是 2026 年 7 月发布、8 月开放权重的新一代多模态视频模型。官方材料显示：

- 输入可包含文本、图片、视频和音频；输出为视频与 32 kHz 立体声音频，最长 15 秒，最高可到 2K。[^2]
- H3 的音视频 latent 由统一模型联合预测，不是生成无声视频后再调用独立 TTS。[^2]
- 官方列出 11 种稳定支持的对白语言，包括中文；参考模式可以使用音频作为声音、节奏等参考。[^2]
- 官方复现实例包含“参考男性音色生成新对白，并让人物嘴部自然同步”的任务描述。它证明能力路径存在，但仍属于示例，不是逐字正确率或口型误差的服务等级承诺。[^2]
- H3 的原生输出为 32 kHz 立体声，公开 API 返回单个 MP4，没有独立对白、音乐与音效 stems 的交付约定；电视制作通行的 48 kHz 音频规范仍需外部音频链路。[^9]

这意味着 H3 可以减少外部 TTS 的使用，也可以把已确认的外部声音资产作为参考，形成“外部声音控制 + 原生音画生成”的混合工作流。

实施前基线并没有真正调用 H3：后端曾把 H3 名称改写为 `MiniMax-Hailuo-02`，并调用旧版接口；请求也没有 H3 的 `content[]` 音频参考结构。本轮调整已拆分 MiniMax H3 v2、旧 Hailuo v1 与 BytePlus Seedance 协议，并把模型能力、音频策略和口型验收纳入生产数据。

因此，此前三段素材没有原生声音，反映的是**生成时使用了 Hailuo-02 视觉路径**，不能据此判断 H3 没有声音能力。该合成样片加入了外部配音和字幕，但没有执行口型重定向，也不应标记为“已完成口型同步”。

### Seedance 2.0 / 2.5

Seedance 2.0 采用统一多模态音视频联合生成。官方承认它能让对白、音效、音乐和画面更好协同并保持声音特征，但也明确披露偶发音频失真、多主体一致性与复杂编辑仍需改进。[^3]

截至 2026 年 9 月，BytePlus 已提供 Seedance 2.x 的可调用接口，而不再只是“即将开放”：

- `generate_audio=true` 输出与画面同步的声音；2.0 和 2.5 均支持图像、视频和音频组合参考。[^4]
- Seedance 2.0 的参考音频单段 2–15 秒，最多 3 段、合计 15 秒；2.5 单段 2–30 秒，最多 10 段、合计 30 秒。2.0 不能只输入音频，2.5 可以。[^4]
- 2.5 输出 4–30 秒、480p/720p、24 fps；2.0 输出 4–15 秒并可到更高分辨率。[^4]
- 2.5 支持时间戳级音画编辑，适合局部替换或修正，而不是每次整镜重生。[^5]
- 当前公开接口返回合成后的 `video_url`，并未承诺分别返回对白、音乐、环境和音效 stems；即便采用原生音频，平台仍应保存或重建可编辑声音资产。

Seedance 2.5 因此比传统“静音视频 + TTS”更适合作为对白镜头的主模型，尤其当平台先生成经过审片的对白音频，再把它作为参考交给模型。但“同步音频”仍然不是“指定文本必然逐字正确”的合同；官方没有公布中文逐字准确率、音素级口型误差或跨集声音相似度 SLA。

### 对照：Veo 与专用口型工作流

Veo 3/3.1 同样能原生生成对白、音效和环境声。Google 的 API 文档把 sound generation 列为支持能力，提示指南也允许写明角色台词和旁白。[^6] 这说明行业方向确实是联合音视频，而非永久依赖静音视频。

但主流工具仍保留专门的声音和表演阶段。Runway 的多角色对话官方流程要求先录制各角色表演，再用 Act-Two 分别施加口型和表情，最后合成，并明确说明某些视频编辑模型本身不是 lip-sync 模型。[^7] 这反映出生产端的现实：基础视频模型、声音资产、口型重定向和最终混音仍是可组合的不同能力。

## 外部配音何时不可省

### 固定角色与连续剧

同一角色跨镜、跨集的音色、年龄感、语速、情绪曲线和专有发音需要可复用的声音资产。仅凭每个镜头的文本提示重新抽取原生声音，容易发生“同一角色每镜换嗓”。H3 和 Seedance 都允许声音参考，最佳做法不是放弃外部音频，而是把确认过的角色声音作为生成条件。

### 台词必须逐字准确

剧情反转、品牌口播、人名地名、法律免责声明和审查用语不能接受近义改写、漏字或串词。原生音频可以作为候选，但应通过 ASR 回听与人工核对；不合格时优先更换确定音频并重做口型，而不是反复重生成整段画面。

### 本地化、审片与返工

独立对白轨可以不动画面就更换语言、演员、语气、敏感词和时间点，也能输出无障碍字幕、国际版和平台版。若声音只存在于不可分离的原生混合轨中，任何台词修改都可能迫使整镜重生，并同时改变表演、构图和连续性。

### 正式混音与交付

成片通常至少需要对白、环境、音效和音乐的独立 stems，以便降噪、EQ、动态处理、响度规范、ducking 和多版本导出。联合模型生成的完整混合声轨很适合预览，但可编辑性弱，不能天然取代后期声音工程。

### 权利与审计

固定角色声音需要记录声音来源、授权、使用范围和版本。Seedance 的 BytePlus 接口对含真人脸的参考素材还有素材库与白名单要求。[^4] 外部声音资产管理因此不仅是质量问题，也是可追踪生产与权利管理问题。

## 按镜头选择，而不是按项目一刀切

| 镜头类型 | 推荐策略 | 原因 |
|---|---|---|
| 清晰正脸/近景说指定台词 | 已确认对白音频 → H3/Seedance 音频参考联合生成；失败时专用口型重定向 | 同时控制台词、音色、口型和表演 |
| 多角色同框对话 | 各角色分轨 → 分角色驱动/重定向 → 合成 | 避免串音、错人开口；单次联合生成风险最高 |
| 画外音、旁白 | 外部配音直接混音 | 不存在口型约束，最便宜且最可控 |
| 远景、背影、蒙面、快速动作 | 原生音频或外部配音均可 | 嘴部不可辨，直接混音风险低 |
| 环境、动作、空镜 | 优先原生环境声/音效，再保留后期替换权 | 音画事件同步是联合模型的优势 |
| 一次性概念片、预演 | 原生音视频 | 速度优先，允许重抽 |
| 连续短剧主角 | 固定声音母版 + 音频参考联合生成 | 跨镜/跨集声音连续性优先 |
| 多语言发行 | 保留无对白 M&E 或 stems，外部配音 + 必要的口型本地化 | 同一画面可复用，版本成本更低 |

## 对 StoryBoarding 的产品建议

### P0：先纠正能力路由与产品表述

1. 移除把 H3 强制映射为 Hailuo-02 的兼容逻辑，分别实现 MiniMax v2 H3 `content[]` 与旧 Hailuo v1 适配器。
2. 为每个模型维护机器可读能力：`native_audio`、`audio_reference`、`voice_reference`、`dialogue_languages`、`max_audio_refs`、`max_duration`、`supports_lip_sync_edit`。
3. 当前样片标注为“外部配音与字幕已合成，未做口型重定向”，不要显示“原生配音”或“口型已同步”。
4. 清晰说话镜头禁止把“纯 TTS mux”直接升级为交付态；必须通过原生联合生成或专用口型处理。

### P1：把声音变成一等生产资产

每句对白应保存：文本、说话者、声音版本、音频 Take、起止时间、来源/授权、语言、采用状态和派生的口型视频 Take。视频 Take 还应记录 `audio_strategy`：

- `native_generated`
- `reference_audio_generated`
- `external_voiceover`
- `external_lipsync`
- `silent`

原生生成的完整音轨也要作为候选资产保存，不要只封装在最终 MP4 中。平台需要允许采用原生音频、替换对白、保留环境声，或全部改用外部 stems。

### P1：生成前选择策略

系统可以根据镜头自动建议，但由制作者确认：

- 检测到可见嘴部 + 指定对白：默认“先定声音、后生表演”。
- 旁白/画外音：默认外部 TTS，不做口型任务。
- 无对白动作镜头：默认原生音效，可关闭音乐以便统一配乐。
- 连续角色：默认加载该角色已采用的声音参考。
- 多角色同框：默认拆分说话者与音轨，必要时拆镜。

## 验收方式

不能只检查 MP4 是否含 AAC 音轨。每个对白 Take 至少需要以下验收：

| 维度 | 自动检查 | 人工检查 |
|---|---|---|
| 台词 | ASR 转写与剧本文本比较，报告 CER/WER、漏词和增词 | 专名、语气、重音是否正确 |
| 说话者 | 声纹/参考音色相似度，检测跨角色串音 | 是否像同一角色、情绪是否连贯 |
| 口型 | SyncNet 类 LSE-D/LSE-C 或同类同步评分 | 嘴形、闭口点、爆破音和表情是否自然 |
| 音质 | 峰值、削波、底噪、响度、声道和采样率 | 是否有金属感、失真、突变 |
| 连续性 | 相邻镜头音色、底噪、空间混响差异 | 场景空间和角色状态是否连续 |

LSE-D/LSE-C 是常见自动口型指标，原始 Wav2Lip 工作也同时采用同步准确度、视觉质量和整体体验的人评。[^8] 自动分数不应代替审片，因为口型修正可能提高同步却损伤脸部细节。

建议用同一组 10–20 个短对白镜头做 H3 与 Seedance 2.5 的真实 A/B：包含近景单人、双人对话、方言、快速台词、情绪爆发、角色跨镜复现。记录一次通过率、平均抽卡次数、台词正确率、口型通过率、声音一致性、每个采用镜头成本和人工分钟数，再决定默认模型；不能只比较官方样片。

## 最终判断

- **MiniMax H3 / Seedance 2.5 的确让“外部配音必选”变成了错误设计。** 两者都可以生成原生音视频，也能利用音频参考。
- **它们也没有让外部声音生产失去意义。** 正式短剧仍需要确定台词、固定角色声音、可返工资产、多语言版本、独立混音和验收。
- **最佳默认不是“先出静音视频再贴 TTS”，而是“先确定对白声音，再用支持音频参考的模型生成对应表演”。** 对没有可见口型的镜头，外部配音直接混音仍最经济。
- **StoryBoarding 已修正 H3 路由不真实的问题，但仍需真实样本 A/B。** 现有 Hailuo 样片不能用于评价 H3 或 Seedance 的原生配音、口型与连续性；应按上面的验收矩阵重新生成并记录证据。

## Sources

[^1]: Google DeepMind, “[Generating audio for video](https://deepmind.google/blog/generating-audio-for-video/),” 2024-06-17. 说明后配声音与未受对白条件约束的嘴部运动可能发生错配。
[^2]: MiniMax, “[Open General Intelligence: MiniMax H3 Is Now Open Source](https://www.minimax.io/news/minimax-h3-open-source),” 2026-08-03；MiniMax, “[MiniMax H3: An Open Model Breaking the Boundaries Between Tasks and Modalities](https://www.minimax.io/blog/minimax-h3),” 2026-07-31；[MiniMax Video Generation API guide](https://platform.minimax.io/docs/guides/video-generation)，访问于 2026-09-13。
[^3]: ByteDance Seed Team, “[Seedance 2.0 Official Launch](https://seed.bytedance.com/en/blog/seedance-2-0-official-launch),” 2026-02-12.
[^4]: BytePlus, “[Enhanced/basic video generation — Seedance 2.x](https://docs.byteplus.com/en/docs/Byteplus_LAS/video_gen_enhanced)，” 访问于 2026-09-13。页面列出模型、输入组合、音频限制、`generate_audio`、输出规格与当前 API。
[^5]: ByteDance Seed Team, “[One Take, Infinite Possibilities: Introducing Seedance 2.5](https://seed.bytedance.com/en/blog/one-take-creation-flexible-referencing-introducing-seedance-2-5),” 2026-07-31.
[^6]: Google DeepMind, “[Veo](https://deepmind.google/models/veo/)；” Google Cloud, “[Veo 3 model documentation](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/veo/3-0-generate-001)；” Google Cloud, “[Veo video generation prompt guide](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/video/video-gen-prompt-guide?hl=zh-CN)，” 访问于 2026-09-13。
[^7]: Runway, “[Creating Multi-Character Dialogues with Act-Two](https://help.runwayml.com/hc/en-us/articles/41748090660499-Creating-Multi-Character-Dialogues-with-Act-Two)，” 访问于 2026-09-13。
[^8]: Prajwal et al., “[A Lip Sync Expert Is All You Need for Speech to Lip Generation In the Wild](https://cdn.iiit.ac.in/cdn/cvit.iiit.ac.in/images/ConferencePapers/2020/LipSync2020.pdf),” ACM Multimedia 2020.
[^9]: European Broadcasting Union, “[EBU Technical Recommendation R83 — Synchronisation of Digital Audio Signals in a Television Environment](https://tech.ebu.ch/files/live/sites/tech/files/shared/r/r083.pdf),” 1996, re-issued 2002.
