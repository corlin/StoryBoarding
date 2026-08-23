# AI Storyboard 产品方案修正：分镜头脚本与故事板双向协同

这里需要对前面的产品定义做一个重要修正：

**“生成分镜头脚本”和“生成故事板”不应该设计成前后串行的两个步骤。**

更合理的产品逻辑是：

> **分镜头脚本与视觉故事板，是同一个 Shot Model 的两种表达。**

一个偏向文字、时间和制作信息，一个偏向构图、空间和视觉信息。
用户可以从任何一边开始，也可以在任何一边修改，系统负责保持二者同步。

------

# 一、不要设计成传统流水线

不建议设计成：

> 故事 → 分镜头脚本 → 故事板 → 视频

因为真实导演工作并不是这么严格线性的。

导演经常会：

- 先写 Shot
- 再画草图
- 看见画面以后修改 Shot
- 因为镜头构图调整台词
- 因为时长重新拆镜
- 因为空间关系合并两个镜头
- 看到故事板后增加一个反应镜头

因此更符合真实创作过程的是：

> **Script ⇄ Storyboard**

二者不断来回修正。

真正处在中间的应该是：

**Shot Model** 

而不是某一份文档。

------

# 二、产品核心数据结构需要重新定义

整个项目可以抽象成：

```text
PROJECT
│
├── Story / Creative Brief
│
├── Character Bible
├── Location Bible
├── Visual Style
│
├── Sequence
│   │
│   ├── Shot 01
│   │   ├── Script Data
│   │   ├── Visual Data
│   │   ├── Camera Data
│   │   ├── Timing Data
│   │   ├── Audio Data
│   │   └── Continuity Data
│   │
│   ├── Shot 02
│   ├── Shot 03
│   └── ...
│
├── Storyboard View
│
├── Shot Script View
│
└── Video Generation View
```

这里最重要的是：

**Storyboard Page 和 Shot Script 都不是主数据。**

真正的主数据是：

> **Shot**

------

# 三、一个 Shot 同时包含“文字层”和“视觉层”

例如：

## SHOT 06

### 分镜头脚本视角

**镜号：06**

**时长：2.5 秒**

**景别：中近景**

**机位：略低机位**

**人物动作：**
老鼠贴着桌腿快速移动，突然停下，探头观察桌上的油瓶。

**摄影机：**
低机位横向跟拍，角色停下后摄影机轻微推进。

**声音：**
脚步声突然停止，音乐短暂停顿。

**叙事目的：**
第一次明确建立“油瓶”作为目标。

------

### Storyboard 视角

同一个 Shot 对应一格画面：

- 老鼠位于画面左下
- 油瓶位于右上视觉焦点
- 桌腿形成纵深
- 红色箭头表示老鼠运动
- 蓝色箭头表示摄影机跟拍
- 绿色标记油瓶视觉中心
- 紫色标记音乐停顿
- 黑色文字标明 `SHOT 06 / MCU / 2.5s`

两者表达的是**同一个镜头**。

不是两个独立生成结果。

------

# 四、因此产品应该支持四种起点

## 起点 A：从故事开始

用户输入：

> 一只老鼠夜里偷偷进入厨房偷油，过程中不断发生小意外，最后成功逃走。

AI 同时生成：

**分镜头脚本 + Storyboard Draft**

例如自动规划：

1. Establishing
2. Character Entrance
3. Discover Target
4. Approach
5. Obstacle
6. Reaction
7. Attempt
8. Accident
9. Chaos
10. Escape
11. Relief
12. Ending

用户之后可以编辑任意一侧。

------

# 起点 B：从分镜头脚本开始

专业导演可能已经写好了：

> SHOT 01
> Wide shot，夜晚厨房，老鼠从门缝进入。

> SHOT 02
> Low-angle tracking，老鼠沿墙根移动。

系统直接将这些 Shot 解析成视觉构图，生成整页 Storyboard。

此时：

> **Script → Visual Interpretation**

------

# 起点 C：从故事板开始

用户也可能直接画：

- 一个简单草图
- 一格 Storyboard
- 十二格粗略分镜

系统识别：

- 人物位置
- 镜头尺度
- 空间关系
- 动作方向
- 镜头运动

然后自动补全对应的：

**分镜头脚本。**

即：

> **Visual → Shot Description**

------

# 起点 D：脚本与图片混合输入

这应该是最自然的 AI 创作方式。

例如：

用户上传：

- 角色参考图
- 场景参考图
- 3 格自己画的分镜
- 一段故事描述

然后说：

> 中间帮我补完整，总共做成 12 镜头，约 30 秒。

AI 应该同时补全：

- 缺失 Shot
- 分镜头脚本
- Storyboard
- 时长
- 镜头语言
- 连续性

而不是强迫用户先进入某一个固定流程。

------

# 五、产品 UI 应该设计成“双视图”

非常适合采用：

```text
┌─────────────────────────────────────┐
│ Story / Characters / Location / Style │
├────────────────┬────────────────────┤
│                │                    │
│ Shot Script    │ Storyboard         │
│                │                    │
│ SHOT 01        │ [01] [02] [03]     │
│ SHOT 02        │                    │
│ SHOT 03        │ [04] [05] [06]     │
│ ...            │                    │
│                │ [07] [08] [09]     │
│                │                    │
│                │ [10] [11] [12]     │
├────────────────┴────────────────────┤
│ Timeline / Duration / Continuity     │
└─────────────────────────────────────┘
```

左边回答：

> **这一镜具体怎么拍？**

右边回答：

> **这一镜看起来是什么？**

底部 Timeline 回答：

> **这些镜头连接起来以后节奏怎么样？**

------

# 六、两边必须实现真正的双向同步

这是产品体验最关键的一部分。

例如用户在脚本侧修改：

> SHOT 05
> Medium Shot → Extreme Close-Up

Storyboard 自动重新构图。

------

用户在 Storyboard 中把人物从：

> 画面左侧

拖到：

> 画面右侧

系统自动检查：

> 是否破坏 Screen Direction？

并更新 Shot Script：

> Character positioned frame right.

------

用户在 Storyboard 增加：

> 摄影机 Push-in

脚本侧自动出现：

**Camera Movement：Slow Push-in**

------

用户修改：

> 2 秒 → 4 秒

Timeline 和总时长立即重新计算。

如果原本：

> 12 Shots / 30s

变成：

> 12 Shots / 32s

系统提示：

> **Current runtime exceeds target by 2 seconds.**

然后建议从其他镜头压缩时间。

------

# 七、AI 的作用不是“两个任务分别生成”

这里尤其需要避免一种错误实现：

```text
LLM
→ 生成一套分镜脚本

Image Model
→ 独立生成十二张图
```

这样非常容易发生：

> **文字说一套，图片画另一套。**

更合理的是：

```text
Story
   ↓
Director Agent
   ↓
Structured Shot Model
   ↓
┌───────────────┬────────────────┐
↓               ↓                ↓
Shot Script   Storyboard       Video Prompt
View          View             View
```

例如内部统一保存：

```text
SHOT_06

duration: 2.5s

shot_size:
medium_close_up

subject:
mouse

action:
approach oil bottle
stop
look upward

camera:
low_angle
tracking_right
slow_push_in

composition:
mouse_left_foreground
oil_bottle_right_background

character_direction:
left_to_right

narrative_function:
reveal_target

lighting:
moonlight_side_light

audio:
music_pause

emotion:
curiosity_comedy
```

然后：

### Script Renderer

把这些数据变成：

> “低机位中近景，摄影机横向跟随老鼠……”

### Storyboard Renderer

把这些数据变成：

> Storyboard 面板。

### Video Prompt Renderer

继续变成：

> AI Video Generation Prompt。

这样三者才真正统一。

------

# 八、故事板页面本身也应该同时承担“脚本索引”

最终生成的整张 12 格 Storyboard Page，不应该仅仅显示：

> SHOT 01

建议每格至少显示：

**01 · WS · 2.0s**

简短动作：

> Mouse enters kitchen.

摄影机：

> TRACK →

这样用户即使只拿到这一页，也能快速理解基本分镜脚本。

而完整的 Shot Script 则提供更详细信息。

形成两级信息密度：

### Storyboard Page

**快速阅读**

### Shot Script

**专业执行**

两者共享同一个 Shot ID。

------

# 九、最终交付物应该是“一套项目”，而不是两份文件

一次生成完成以后，产品可以同时提供：

### 1. Storyboard Page

12 格完整导演故事板。

适用于：

- 创意沟通
- 客户确认
- 导演预演
- 团队快速阅读

### 2. Shot Script

完整分镜头脚本。

包含：

- 镜号
- 时长
- 景别
- 机位
- 镜头运动
- 人物动作
- 场景
- 台词
- 声音
- 灯光
- 转场
- 叙事意图

适用于：

- 导演
- 摄影
- 制片
- AI 视频生成

### 3. Shot Generation Package

每一个 Shot 对应：

> Shot Spec
>
> - Reference Images
> - Video Prompt
> - Continuity Constraints

用于下一阶段视频生成。

因此实际上是：

```text
                 ┌─ Storyboard Page
                 │
Story → Shot Model ─ Shot Script
                 │
                 └─ Video Generation
```

------

# 十、修改后的核心用户故事

> **作为导演、编导、广告创意或 AI 视频创作者，**
>
> **我希望 AI 能够帮助我同时设计分镜头脚本和视觉故事板，并让我可以从文字或画面中的任何一端开始创作和修改。**
>
> **系统应当保证两者始终描述同一组镜头，并统一管理角色、场景、动作、景别、摄影机、时间、声音和连续性。**
>
> **这样我可以像真正进行导演创作一样，在“写镜头”和“看镜头”之间不断来回调整，而不需要重复工作。**

------

# 十一、产品核心闭环也应该随之修改

原来的：

> Describe → Structure → Storyboard → Generate

建议调整为：

> **Imagine → Structure → Direct → Synchronize → Generate**

具体为：

**Imagine**

输入故事、脚本、图片或草图。

↓

**Structure**

AI 建立 Narrative / Sequence / Shot。

↓

**Direct**

用户同时通过文字和视觉调整镜头。

↓

**Synchronize**

系统不断同步：

**Shot Script ⇄ Storyboard**

并检查：

- Character Continuity
- Spatial Continuity
- Screen Direction
- Timing
- Visual Style
- Narrative Rhythm

↓

**Generate**

将确认后的 Shot Model 输出为：

- Storyboard
- Shot Script
- Video Prompt
- Previz
- Final Video

------

# 十二、最终产品定位

这样修改以后，这个产品最准确的定位已经不是：

> **AI Storyboard Generator**

甚至不仅是：

> **AI Storyboard + Shot Script Generator**

而应该是：

> **AI Director Workspace**

它内部存在一个统一的：

**Cinematic Shot Model**

而外部呈现为三个互相呼应的工作界面：

> **Script View ⇄ Storyboard View ⇄ Timeline View**

核心原则可以浓缩成一句话：

> **一套镜头数据，两种创作语言，双向编辑，始终同步。**

文字告诉我们：

> **镜头为什么这样拍，以及具体怎么拍。**

故事板告诉我们：

> **这个镜头在空间和画面中究竟长什么样。**

而 AI Director 真正负责的是：

> **保证这两件事始终是同一件事。**