const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const resolve = Module._resolveFilename;
Module._resolveFilename = function (name, ...args) {
  return resolve.call(this, name.startsWith('@/') ? path.join(__dirname, '../src', name.slice(2)) : name, ...args);
};
for (const ext of ['.ts', '.tsx']) require.extensions[ext] = (mod, filename) => {
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true, target: ts.ScriptTarget.ES2020 }
  });
  mod._compile(outputText, filename);
};
const React = require('react');
const { renderToStaticMarkup: render } = require('react-dom/server');
const { StoryboardCell } = require('../src/components/storyboard-view/StoryboardCell.tsx');
const { VoiceAlignmentDrawer } = require('../src/components/drawers/VoiceAlignmentDrawer.tsx');
const { computeProjectQualityDiagnostics: diagnose } = require('../src/lib/diagnostics.ts');
const { buildH3CutItem } = require('../src/hooks/useH3Prompt.ts');
const shot = { id: 's1', order: 1, duration: 4.5, shot_size: 'two_shot', camera_movement: {type:'static'}, action: '两人对峙', subject: '雨夜客厅中两人对峙', dialogue: '宋知远：“把大学念完。”', character_ids:['a','b'], storyboard_image_url: '/example.jpg' };
const characters = [{id:'a',name:'苏晓',voice_dna:'女声'}, {id:'b',name:'宋知远',voice_dna:'男声'}];
test('existing non-preset shot values remain selected in real rendered controls', () => {
  for (const duration of [4.5, 7.25]) {
    const html = render(React.createElement(StoryboardCell,{shot:{...shot,duration}, index:0, isSelected:false, onSelect() {}}));
    assert.match(html, new RegExp(`<option[^>]*value="${duration}"[^>]*selected`));
    assert.match(html, /<option[^>]*value="two_shot"[^>]*selected/);
  }
});
test('explicit dialogue speaker wins over the first visible character', () => {
  const html = render(React.createElement(VoiceAlignmentDrawer,{isOpen:true,onClose(){},shots:[shot],characters}));
  assert.match(html, />宋知远<\/span>/);
  assert.match(html, />男声<\/span>/);
});
test('narration and unknown speakers do not inherit a scene or arbitrary voice', () => {
  const html = render(React.createElement(VoiceAlignmentDrawer,{isOpen:true,onClose(){},shots:[{...shot,dialogue:'旁白：“四十八小时。”'},{...shot,id:'s2',order:2,dialogue:'没有名字的台词'}],characters}));
  assert.match(html, />旁白<\/span>/);
  assert.match(html, /待确认说话者/);
  assert.doesNotMatch(html, /沉稳中音，清晰自然/);
});
test('H3 exports resolve the same explicit speaker', () => {
  assert.equal(buildH3CutItem(shot).speakerName, '宋知远');
});
test('image references never imply approved content, including an empty project', () => {
  for (const shots of [[], [shot], [{...shot,is_dirty:true}]]) {
    const result = diagnose({sequences:[],characters:[],locations:[],props:[]},shots);
    const visual = result.diagnostics.find(d=>d.id==='storyboard_visual_readiness');
    assert.notEqual(visual.status,'pass');
    assert.doesNotMatch(visual.detail,/可直接投产/);
    assert.match(visual.detail,/未审|待审|待人工/);
  }
});
const { buildVoiceAlignmentRows, voiceAlignmentCsv, resolveDialogueSpeaker } = require('../src/lib/dialogueSpeaker.ts');
const { VIDEO_PROMPT_ENGINES } = require('../src/lib/videoPromptEngines.ts');
test('voice CSV and JSON source retain attribution, quotes, and planned duration', () => {
  const rows = buildVoiceAlignmentRows([shot],characters);
  assert.equal(rows[0].speakerName, '宋知远');
  assert.equal(rows[0].voiceDna, '男声');
  assert.equal(rows[0].duration, 4.5);
  assert.equal(rows[0].durationBasis, 'planned_shot');
  assert.match(voiceAlignmentCsv(rows), /"宋知远","男声"/);
  const quoted = voiceAlignmentCsv([{...rows[0],dialogue:'他说 "你好"\n再见'}]);
  assert.ok(quoted.includes('"他说 ""你好""\n再见"'));
  assert.equal(JSON.parse(JSON.stringify(rows))[0].shotId,'s1');
  const h3 = VIDEO_PROMPT_ENGINES.find(e=>e.id==='minimax_h3').generateText([shot],null);
  assert.ok(h3.includes('宋知远'));
  assert.ok(!h3.includes('雨夜客厅中两人对峙'));
});
test('multiple speakers require confirmation; parenthetical and English labels work', () => {
  assert.equal(resolveDialogueSpeaker({...shot,dialogue:'苏晓：“不。”\n宋知远：“好。”'},characters).status,'unresolved');
  assert.equal(resolveDialogueSpeaker({...shot,dialogue:'宋知远（低声）：走吧'},characters).speakerName,'宋知远');
  assert.equal(resolveDialogueSpeaker({...shot,dialogue:'Narrator: One day'},characters).speakerName,'旁白');
});
const { generateCallSheetCsvContent } = require('../src/lib/callSheetExporter.ts');
const productionKanban = require('../src/lib/productionKanban.ts');
test('preview assembly planner exists for adopted visual and dialogue takes', () => {
  assert.equal(typeof productionKanban.buildPreviewAssemblyPlan, 'function');
});
test('preview assembly plan orders episodes and maps adopted audio with subtitles', () => {
  const plan = productionKanban.buildPreviewAssemblyPlan(
    [
      { shot_id: 's2', sequence_id: 'ep2', episode_number: 2, order: 1, duration: 4, dialogue: '周明：好。', adopted_take_id: 'v2' },
      { shot_id: 's1', sequence_id: 'ep1', episode_number: 1, order: 1, duration: 3, dialogue: '林夏：走。', adopted_take_id: 'v1' },
    ],
    [
      { id: 'v2', shot_id: 's2', take_type: 'video', media_url: '/v2.mp4', is_adopted: true, duration: 4 },
      { id: 'a1', shot_id: 's1', take_type: 'audio', media_url: '/a1.mp3', is_adopted: true, duration: 2, metadata: JSON.stringify({ dialogue_id: 'd1' }) },
      { id: 'v1', shot_id: 's1', take_type: 'image', media_url: '/v1.jpg', is_adopted: true, duration: 0 },
    ],
    [{ id: 'd1', shotId: 's1', text: '走。', speaker: '林夏', audioVersion: 'a1', actualDuration: 2, orderIndex: 0 }],
  );
  assert.deepEqual(plan.clips.map((clip) => clip.shotId), ['s1', 's2']);
  assert.equal(plan.clips[0].duration, 3);
  assert.equal(plan.clips[0].visualKind, 'image');
  assert.deepEqual(plan.clips[0].audioUrls, ['/a1.mp3']);
  assert.deepEqual(plan.clips[0].audioTakeIds, ['a1']);
  assert.deepEqual(plan.subtitles.map((cue) => [cue.start, cue.end, cue.text]), [[0, 2, '林夏：走。'], [3, 7, '周明：好。']]);
});
test('preview assembly plan rejects missing adopted visuals', () => {
  assert.throws(
    () => productionKanban.buildPreviewAssemblyPlan(
      [{ shot_id: 's1', episode_number: 1, order: 1, duration: 3, adopted_take_id: null }],
      [],
      [],
    ),
    /1 个镜头缺少已采用画面/,
  );
});
test('final video assembly accepts only adopted video segments', () => {
  const shots = [
    { shot_id: 's1', episode_number: 1, order: 1, duration: 3, adopted_take_id: 'image-1' },
    { shot_id: 's2', episode_number: 1, order: 2, duration: 4, adopted_take_id: 'video-2' },
  ];
  const takes = [
    { id: 'image-1', shot_id: 's1', take_type: 'image', media_url: '/frame.jpg', is_adopted: true },
    { id: 'video-1', shot_id: 's1', take_type: 'video', media_url: '/segment-1.mp4', is_adopted: false, duration: 6 },
    { id: 'video-2', shot_id: 's2', take_type: 'video', media_url: '/segment-2.mp4', is_adopted: true, duration: 6 },
  ];
  assert.throws(
    () => productionKanban.buildVideoAssemblyPlan(shots, takes, []),
    /1 个镜头缺少已采用视频片段/,
  );
  assert.throws(
    () => productionKanban.buildVideoAssemblyPlan([{ ...shots[0], adopted_take_id: 'video-1' }], takes, []),
    /1 个镜头缺少已采用视频片段/,
  );

  const plan = productionKanban.buildVideoAssemblyPlan(
    [{ ...shots[0], adopted_take_id: 'video-1' }, shots[1]],
    takes.map((take) => ({ ...take, is_adopted: take.id !== 'image-1' })),
    [],
  );
  assert.deepEqual(plan.clips.map((clip) => clip.visualKind), ['video', 'video']);
  assert.deepEqual(plan.clips.map((clip) => clip.duration), [6, 6]);
  assert.ok(plan.clips.every((clip, index) => !productionKanban.buildPreviewClipCommands(clip, index, '9:16').visual.includes('-loop')));
});
test('preview subtitles serialize to valid SRT timestamps', () => {
  assert.equal(typeof productionKanban.previewSubtitlesToSrt, 'function');
  assert.equal(
    productionKanban.previewSubtitlesToSrt([{ start: 1.25, end: 3.5, text: '林夏：走。' }]),
    '1\n00:00:01,250 --> 00:00:03,500\n林夏：走。\n',
  );
});
test('preview clip commands normalize image and audio into a concat-safe MP4', () => {
  assert.equal(typeof productionKanban.buildPreviewClipCommands, 'function');
  const commands = productionKanban.buildPreviewClipCommands({
    shotId: 's1', duration: 3, visualKind: 'image', visualUrl: '/frame.jpg', audioUrls: ['/voice.mp3'],
  }, 0, '9:16');
  assert.deepEqual(commands.visual.slice(0, 3), ['-loop', '1', '-i']);
  assert.ok(commands.visual.includes('scale=720:1280:force_original_aspect_ratio=decrease,pad=720:1280:(ow-iw)/2:(oh-ih)/2:black,fps=24,format=yuv420p'));
  assert.ok(commands.audio.some((arg) => arg.includes('concat=n=1:v=0:a=1')));
  assert.ok(commands.mux.includes('-c:v'));
  assert.equal(commands.output, 'clip_000.mp4');
});
test('preview clip commands hold a short video frame through the planned shot duration', () => {
  const commands = productionKanban.buildPreviewClipCommands({
    shotId: 's1', duration: 5, visualKind: 'video', visualUrl: '/short.mp4', audioUrls: [],
  }, 0, '16:9');
  assert.ok(commands.visual.some((arg) => arg.includes('tpad=stop_mode=clone:stop_duration=5')));
});
test('production API exposes durable preview delivery upload', () => {
  const { api } = require('../src/lib/api.ts');
  assert.equal(typeof api.uploadDelivery, 'function');
});
test('production kanban exposes one-click preview assembly instead of only an FFmpeg script', () => {
  const source = fs.readFileSync(path.join(__dirname, '../src/components/workspace/kanban/ProductionKanbanView.tsx'), 'utf8');
  assert.match(source, /一键合成预演片/);
  assert.match(source, /assemblePreviewMp4/);
  assert.match(source, /episode_outputs/);
  const releaseNotes = fs.readFileSync(path.join(__dirname, '../src/data/releaseNotes.ts'), 'utf8');
  assert.match(releaseNotes, /一键生成分集与全片预演/);
});
test('production kanban distinguishes animatic previews from real video merges', () => {
  const source = fs.readFileSync(path.join(__dirname, '../src/components/workspace/kanban/ProductionKanbanView.tsx'), 'utf8');
  assert.match(source, /合并已采用视频/);
  assert.match(source, /buildVideoAssemblyPlan/);
});
test('theater review loads and plays the current assembled preview', () => {
  const source = fs.readFileSync(path.join(__dirname, '../src/components/workspace/views/TheaterReviewStudioView.tsx'), 'utf8');
  assert.match(source, /getEditVersions/);
  assert.match(source, /currentPreviewUrl/);
  assert.match(source, /<video/);
});
test('active video jobs are reconciled with the provider automatically', () => {
  const source = fs.readFileSync(path.join(__dirname, '../src/components/workspace/kanban/ProductionKanbanView.tsx'), 'utf8');
  assert.match(source, /Promise\.allSettled\(activeJobs\.map\(\(job\) => api\.pollVideo\(job\.id\)\)\)/);
});
test('generated TTS duration is measured and saved back to the dialogue timeline', () => {
  const source = fs.readFileSync(path.join(__dirname, '../src/components/workspace/kanban/ProductionKanbanView.tsx'), 'utf8');
  assert.match(source, /measureAudioDuration/);
  assert.match(source, /actual_duration: actualDuration/);
});
test('call sheet keeps missing bindings unknown and respects valid cast/location bindings', () => {
  const csv = generateCallSheetCsvContent(null,[{...shot,character_ids:[],location_id:''}]);
  assert.ok(csv.includes('"待确认场景"'));
  assert.ok(csv.includes('"待确认出场人物"'));
  assert.ok(!csv.includes(shot.subject));
  assert.ok(csv.includes('有图片引用 · 内容未审'));
  const known = generateCallSheetCsvContent(null,[{...shot,location_id:'room'}],[{id:'room',name:'客厅'}],characters);
  assert.ok(known.includes('"客厅"'));
  assert.ok(known.includes('"苏晓 / 宋知远"'));
  assert.ok(known.includes('"4.5"'));
});

test('project refresh preserves screenplay anchors and beat data for every episode', async () => {
  const { api } = require('../src/lib/api.ts');
  const { useWorkspaceStore } = require('../src/stores/workspaceStore.ts');
  const originalGetProject = api.getProject;
  api.getProject = async () => ({
    id: 'project-refresh',
    user_id: 'director',
    title: '三集样片',
    style_config: {},
    target_duration: 180,
    aspect_ratio: '9:16',
    sequences: [{
      id: 'ep-3',
      project_id: 'project-refresh',
      order: 3,
      episode_number: 3,
      hook_summary: '信封已经被拆开',
      cliffhanger_summary: '欠款对象揭晓',
      payoff_summary: '两人重新谈判',
      target_duration: 60,
      screenplay_text: '第三集母本',
      beats_data: [{ id: 'beat-1', type: 'dialogue', speaker: '林夏', content: '这封信写给谁？', duration: 2.2 }],
      shots: [],
    }],
    characters: [],
    locations: [],
    props: [],
  });

  try {
    await useWorkspaceStore.getState().fetchProject('project-refresh');
    const episode = useWorkspaceStore.getState().currentProject.sequences[0];
    assert.equal(episode.hook_summary, '信封已经被拆开');
    assert.equal(episode.cliffhanger_summary, '欠款对象揭晓');
    assert.equal(episode.payoff_summary, '两人重新谈判');
    assert.equal(episode.beats_data[0].content, '这封信写给谁？');
    assert.equal(useWorkspaceStore.getState().currentProject.aspect_ratio, '9:16');
  } finally {
    api.getProject = originalGetProject;
  }
});

test('three-episode production order and filenames retain episode identity', () => {
  const {
    compareProductionShots,
    configuredTtsVoiceOptions,
    deriveDialogueLineFromShot,
    estimateVideoGeneration,
    planVideoGeneration,
    productionMediaFileBase,
    productionShotLabel,
  } = require('../src/lib/productionKanban.ts');
  const ep2s1 = { shot_id: 'ep2-s1', episode_number: 2, order: 1, duration: 4, dialogue: '周明：“钥匙打不开。”' };
  const ep1s2 = { shot_id: 'ep1-s2', episode_number: 1, order: 2, duration: 3.5, dialogue: '旁白：“门锁换过了。”' };
  const ep1s1 = { shot_id: 'ep1-s1', episode_number: 1, order: 1, duration: 3, dialogue: '' };
  const ordered = [ep2s1, ep1s2, ep1s1].sort(compareProductionShots);
  assert.deepEqual(ordered.map((s) => s.shot_id), ['ep1-s1', 'ep1-s2', 'ep2-s1']);
  assert.equal(productionShotLabel(ep2s1), 'EP 02 · SHOT 01');
  assert.equal(productionMediaFileBase(ep2s1), 'ep_02_shot_01');
  assert.notEqual(productionMediaFileBase(ep2s1), productionMediaFileBase(ep1s1));
  const derived = deriveDialogueLineFromShot(ep2s1);
  assert.equal(derived.speaker, '周明');
  assert.equal(derived.plannedDuration, 4);
  assert.equal(derived.derivedFromShot, true);
  assert.deepEqual(estimateVideoGeneration(3.2), { billableDuration: 6 });
  assert.deepEqual(estimateVideoGeneration(8), { billableDuration: 10 });
  assert.deepEqual(planVideoGeneration('9:16', true, 4), {
    billableDuration: 6,
    generationMode: 'image_to_video',
    usesFirstFrameAspectConstraint: true,
    requiresLandscapeFallbackConfirmation: false,
  });
  assert.equal(planVideoGeneration('9:16', false, 4).requiresLandscapeFallbackConfirmation, true);
  assert.equal(planVideoGeneration('16:9', false, 4).requiresLandscapeFallbackConfirmation, false);
  assert.equal(planVideoGeneration('9:16', false, 7, 'MiniMax-H3').requiresLandscapeFallbackConfirmation, false);
  assert.equal(planVideoGeneration('9:16', false, 7, 'MiniMax-H3').billableDuration, 7);
  assert.deepEqual(configuredTtsVoiceOptions({
    model: 'hexgrad/kokoro-82m',
    voiceFemale: 'zf_xiaoxiao',
    voiceMale: 'zm_yunxi',
    voiceNarrator: 'zf_xiaobei',
  }), [
    { value: 'zf_xiaoxiao', label: '设置默认女声' },
    { value: 'zm_yunxi', label: '设置默认男声' },
    { value: 'zf_xiaobei', label: '设置默认旁白' },
  ]);
  assert.deepEqual(configuredTtsVoiceOptions({
    model: 'same-voice-model',
    voiceFemale: ' shared ',
    voiceMale: 'shared',
    voiceNarrator: '',
  }), [{ value: 'shared', label: '设置默认女声' }]);
});

test('production API records normalize media casing and persisted edit artifacts', () => {
  const { normalizeProductionTake, normalizeEditVersion } = require('../src/lib/api.ts');
  const video = normalizeProductionTake({
    id: 'take-1', shotId: 'shot-1', takeType: 'video', mediaUrl: '/api/assets/takes/one.mp4',
    reviewStatus: 'approved', isAdopted: 1, createdAt: '2026-09-09 00:00:00',
  });
  assert.equal(video.shot_id, 'shot-1');
  assert.equal(video.take_type, 'video');
  assert.equal(video.media_url, '/api/assets/takes/one.mp4');
  assert.equal(video.review_status, 'approved');
  assert.equal(video.is_adopted, true);

  const version = normalizeEditVersion({
    id: 'edit-1', versionTag: 'v1.1-subtitled-delivery', versionName: '三集交付',
    totalDuration: 144, isCurrent: 1,
    exportResult: JSON.stringify({ mp4_url: '/api/assets/deliveries/full.mp4', episode_mp4_urls: ['/ep1.mp4'] }),
  });
  assert.equal(version.version_tag, 'v1.1-subtitled-delivery');
  assert.equal(version.total_duration, 144);
  assert.equal(version.is_current, true);
  assert.equal(version.export_result.mp4_url, '/api/assets/deliveries/full.mp4');
});

test('video jobs share one active slot and one stable review candidate', () => {
  const { generatedVideoTakeId, isActiveVideoJob } = require('../../backend/src/lib/videoJobState.ts');
  assert.equal(isActiveVideoJob({ jobType: 'video', status: 'submitted' }), true);
  assert.equal(isActiveVideoJob({ jobType: 'video', status: 'processing' }), true);
  assert.equal(isActiveVideoJob({ jobType: 'video', status: 'succeeded' }), false);
  assert.equal(isActiveVideoJob({ jobType: 'audio', status: 'processing' }), false);
  assert.equal(generatedVideoTakeId('job-123'), 'video-job-123');
  assert.equal(generatedVideoTakeId('job-123'), generatedVideoTakeId('job-123'));
});

test('video provider contracts keep H3 native AV and Seedance distinct from legacy Hailuo', () => {
  const {
    VIDEO_MODEL_CAPABILITIES,
    buildVideoProviderRequest,
    parseVideoProviderPoll,
    recommendedShotAudioWorkflow,
    resolveVideoProviderConfig,
  } = require('../../backend/src/lib/videoProvider.ts');

  const h3 = resolveVideoProviderConfig('minimax', 'https://api.minimax.cn/v1', 'MiniMax-H3');
  assert.equal(h3.model, 'MiniMax-H3');
  assert.equal(h3.protocol, 'minimax_v2');
  assert.equal(h3.submitUrl, 'https://api.minimaxi.com/v2/video_generation');
  assert.equal(h3.queryUrl('task-h3'), 'https://api.minimaxi.com/v2/query/video_generation/task-h3');
  assert.equal(VIDEO_MODEL_CAPABILITIES['MiniMax-H3'].nativeAudio, true);
  assert.equal(VIDEO_MODEL_CAPABILITIES['MiniMax-H3'].audioReference, true);
  assert.deepEqual(recommendedShotAudioWorkflow('林夏：门开了。'), {
    audioStrategy: 'reference_audio_av', lipSyncStatus: 'pending',
  });
  assert.deepEqual(recommendedShotAudioWorkflow('旁白：雨一直下。'), {
    audioStrategy: 'post_dub', lipSyncStatus: 'not_applicable',
  });

  const h3Request = buildVideoProviderRequest(h3, {
    prompt: '林夏说：门已经开了。',
    aspectRatio: '9:16',
    duration: 7,
    firstFrameImage: 'https://assets.example/frame.jpg',
    audioStrategy: 'reference_audio_av',
    referenceAudioUrls: ['https://assets.example/dialogue.wav'],
    referenceAudioDurations: [7], referenceAudioSizes: [1024], referenceAudioMimeTypes: ['audio/wav'],
  });
  assert.equal(h3Request.body.model, 'MiniMax-H3');
  assert.equal(h3Request.body.ratio, '9:16');
  assert.ok(h3Request.body.content.some((item) => item.role === 'reference_image'));
  assert.ok(h3Request.body.content.some((item) => item.role === 'reference_audio'));
  assert.ok(!h3Request.body.content.some((item) => item.role === 'first_frame'));
  assert.throws(() => buildVideoProviderRequest(h3, {
    prompt: '多人对白', aspectRatio: '9:16', duration: 7, firstFrameImage: '',
    audioStrategy: 'reference_audio_av', referenceAudioUrls: ['a', 'b', 'c', 'd'],
  }), /最多接受 3 条参考音频/);

  const legacy = resolveVideoProviderConfig('minimax', 'https://api.minimaxi.com', 'MiniMax-Hailuo-02');
  assert.equal(legacy.model, 'MiniMax-Hailuo-02');
  assert.equal(legacy.protocol, 'minimax_v1');
  assert.equal(legacy.submitUrl, 'https://api.minimaxi.com/v1/video_generation');
  assert.throws(() => buildVideoProviderRequest(legacy, {
    prompt: '对白镜头', aspectRatio: '9:16', duration: 6, firstFrameImage: 'https://assets.example/frame.jpg',
    audioStrategy: 'native_av', referenceAudioUrls: [],
  }), /不生成原生音轨/);
  assert.throws(() => buildVideoProviderRequest(h3, {
    prompt: '口型编辑', aspectRatio: '9:16', duration: 7, firstFrameImage: 'https://assets.example/frame.jpg',
    audioStrategy: 'performance_lipsync', referenceAudioUrls: ['https://assets.example/dialogue.wav'],
  }), /不支持口型专项处理/);

  const seedance = resolveVideoProviderConfig('byteplus', '', 'dreamina-seedance-2-5-260628');
  assert.equal(seedance.protocol, 'byteplus_las');
  assert.equal(seedance.baseUrl, 'https://operator.las.ap-southeast-1.bytepluses.com/api/v1');
  assert.match(seedance.submitUrl, /contents\/generations\/tasks$/);
  const seedanceRequest = buildVideoProviderRequest(seedance, {
    prompt: '旁白介绍雨夜。', aspectRatio: '9:16', duration: 12,
    firstFrameImage: 'https://assets.example/frame.jpg', audioStrategy: 'post_dub', referenceAudioUrls: [],
  });
  assert.equal(seedanceRequest.body.generate_audio, false);
  const nativeWithoutReferences = buildVideoProviderRequest(h3, {
    prompt: '原生对白', aspectRatio: '9:16', duration: 8, firstFrameImage: '',
    audioStrategy: 'native_av', referenceAudioUrls: ['https://assets.example/adopted-but-unused.wav'],
  });
  assert.ok(!nativeWithoutReferences.body.content.some((item) => item.role === 'reference_audio'));

  const seedance20 = resolveVideoProviderConfig('byteplus', 'https://operator.las.ap-southeast-1.bytepluses.com', 'dreamina-seedance-2-0-260128');
  assert.throws(() => buildVideoProviderRequest(seedance20, {
    prompt: '声音驱动画面', aspectRatio: '9:16', duration: 8, firstFrameImage: '',
    audioStrategy: 'reference_audio_av', referenceAudioUrls: ['https://assets.example/dialogue.wav'],
  }), /不能单独输入/);
  assert.doesNotThrow(() => buildVideoProviderRequest(seedance, {
    prompt: '声音驱动画面', aspectRatio: '9:16', duration: 8, firstFrameImage: '',
    audioStrategy: 'reference_audio_av', referenceAudioUrls: ['https://assets.example/dialogue.wav'],
    referenceAudioDurations: [8], referenceAudioSizes: [1024], referenceAudioMimeTypes: ['audio/wav'],
  }));
  assert.throws(() => buildVideoProviderRequest(h3, {
    prompt: '过长对白', aspectRatio: '9:16', duration: 8, firstFrameImage: '',
    audioStrategy: 'reference_audio_av', referenceAudioUrls: ['a', 'b'],
    referenceAudioDurations: [8, 8], referenceAudioSizes: [1024, 1024],
    referenceAudioMimeTypes: ['audio/wav', 'audio/wav'],
  }), /总时长不能超过 15 秒/);
  assert.throws(() => buildVideoProviderRequest(h3, {
    prompt: '格式错误', aspectRatio: '9:16', duration: 8, firstFrameImage: '',
    audioStrategy: 'reference_audio_av', referenceAudioUrls: ['a'],
    referenceAudioDurations: [8], referenceAudioSizes: [1024], referenceAudioMimeTypes: ['audio/aac'],
  }), /仅支持 WAV 或 MP3/);
  assert.throws(() => buildVideoProviderRequest(h3, {
    prompt: '缺元数据', aspectRatio: '9:16', duration: 8, firstFrameImage: '',
    audioStrategy: 'reference_audio_av', referenceAudioUrls: ['a'],
  }), /缺少可验证的时长/);

  assert.deepEqual(parseVideoProviderPoll(h3, {
    task: { status: 'succeeded', content: { url: 'https://assets.example/h3.mp4' }, duration: 7, resolution: '768P', ratio: '9:16' },
  }), {
    status: 'succeeded', videoUrl: 'https://assets.example/h3.mp4', fileId: '', error: '',
    duration: 7, resolution: '768P', ratio: '9:16', rawStatus: 'succeeded',
  });
  assert.deepEqual(parseVideoProviderPoll(seedance, { status: 'expired' }).status, 'failed');
  assert.match(parseVideoProviderPoll(seedance, { status: 'expired' }).error, /已过期/);

  const videoRoute = fs.readFileSync(path.join(__dirname, '../../backend/src/routes/video.ts'), 'utf8');
  assert.match(videoRoute, /resolveVideoProviderConfig/);
  assert.match(videoRoute, /buildVideoProviderRequest/);
  assert.match(videoRoute, /VOICE_CONSENT_UNVERIFIED/);
  assert.match(videoRoute, /REFERENCE_AUDIO_NOT_ADOPTED/);
  assert.match(videoRoute, /provider_base_url/);
  assert.match(videoRoute, /VIDEO_PERSISTENCE_PENDING/);
  assert.match(videoRoute, /asset:\\\/\\\//);
  const productionRoute = fs.readFileSync(path.join(__dirname, '../../backend/src/routes/production.ts'), 'utf8');
  assert.match(productionRoute, /take\.takeType === "video"/);
  assert.match(productionRoute, /lipSyncStatus: lipSyncStatusForStrategy/);
  assert.doesNotMatch(videoRoute, /function normalizeMiniMaxConfig/);
  const settingsRoute = fs.readFileSync(path.join(__dirname, '../../backend/src/routes/settings.ts'), 'utf8');
  assert.match(settingsRoute, /ACTIVE_VIDEO_JOBS_LOCK_SETTINGS/);
  assert.match(settingsRoute, /A key rotation must remain possible/);

  const { DEFAULT_VIDEO_CONFIG } = require('../src/types/modelConfig.ts');
  const { VIDEO_MODELS, VIDEO_PROVIDER_PRESETS } = require('../src/data/modelCatalog.ts');
  assert.equal(DEFAULT_VIDEO_CONFIG.model, 'MiniMax-H3');
  assert.equal(DEFAULT_VIDEO_CONFIG.apiBase, 'https://api.minimaxi.com');
  assert.equal(VIDEO_PROVIDER_PRESETS.byteplus.model, 'dreamina-seedance-2-5-260628');
  assert.ok(VIDEO_MODELS.some((model) => model.id === 'MiniMax-H3' && model.provider === 'minimax'));
  assert.ok(VIDEO_MODELS.some((model) => model.id === 'dreamina-seedance-2-5-260628' && model.provider === 'byteplus'));
});

test('final assembly preserves verified native audio and blocks unresolved visible dialogue', () => {
  const shot = {
    shot_id: 's-native', episode_number: 1, order: 1, duration: 6,
    dialogue: '林夏：门已经开了。', adopted_take_id: 'v-native',
    audio_strategy: 'native_av', lip_sync_status: 'verified',
  };
  const take = {
    id: 'v-native', shot_id: 's-native', take_type: 'video', media_url: '/native.mp4',
    is_adopted: true, duration: 6,
    metadata: JSON.stringify({ audio_strategy: 'native_av', native_audio: true, lip_sync_status: 'verified' }),
  };
  const plan = productionKanban.buildVideoAssemblyPlan([shot], [take], []);
  assert.equal(plan.clips[0].preserveSourceAudio, true);
  assert.equal(plan.clips[0].audioStrategy, 'native_av');
  const commands = productionKanban.buildPreviewClipCommands(plan.clips[0], 0, '9:16');
  assert.ok(!commands.visual.includes('-an'));
  assert.ok(commands.visual.includes('0:a:0'));
  assert.ok(!commands.visual.includes('0:a:0?'));
  assert.ok(!commands.mux.some((arg) => arg.includes('anullsrc')));

  const referencePlan = productionKanban.buildVideoAssemblyPlan(
    [{ ...shot, audio_strategy: 'reference_audio_av' }],
    [{ ...take, metadata: JSON.stringify({ audio_strategy: 'reference_audio_av', native_audio: true, lip_sync_status: 'verified' }) }],
    [{ id: 'line-1', shot_id: 's-native', text: '门已经开了。', audio_version: 'a-1', audio_url: '/reference.mp3' }],
  );
  assert.equal(referencePlan.clips[0].preserveSourceAudio, true);
  assert.deepEqual(referencePlan.clips[0].audioUrls, []);

  assert.throws(
    () => productionKanban.buildVideoAssemblyPlan([{ ...shot, lip_sync_status: 'pending' }], [take], []),
    /1 个对白镜头尚未通过口型验收/,
  );
  assert.throws(
    () => productionKanban.buildVideoAssemblyPlan([{ ...shot, lip_sync_status: 'not_applicable' }], [take], []),
    /1 个对白镜头尚未通过口型验收/,
  );
  assert.throws(
    () => productionKanban.buildVideoAssemblyPlan(
      [{ ...shot, dialogue: '', lip_sync_status: 'pending' }],
      [take],
      [{ id: 'line-visible', shot_id: 's-native', text: '独立录入对白', is_voiceover: false }],
    ),
    /1 个对白镜头尚未通过口型验收/,
  );
  assert.throws(
    () => productionKanban.buildVideoAssemblyPlan(
      [{ ...shot, dialogue: '镜头字段中的可见对白', lip_sync_status: 'not_applicable' }],
      [take],
      [{ id: 'line-empty', shot_id: 's-native', text: '', is_voiceover: false }],
    ),
    /1 个对白镜头尚未通过口型验收/,
  );
  assert.throws(
    () => productionKanban.buildVideoAssemblyPlan(
      [{ ...shot, dialogue: '', audio_strategy: 'post_dub', lip_sync_status: 'not_applicable' }],
      [{ ...take, metadata: '{}' }],
      [{ id: 'line-vo', shot_id: 's-native', text: '旁白内容', is_voiceover: true, audio_version: '' }],
    ),
    /使用后期配音，但仍有台词缺少已采用音频/,
  );
});

test('OpenRouter TTS strips screenplay attribution and selects traceable Chinese voices', () => {
  const {
    buildOpenRouterTtsRequest,
    chooseTtsVoice,
    dialogueIdFromTakeMetadata,
    spokenTextFromDialogue,
  } = require('../../backend/src/lib/tts.ts');
  assert.equal(spokenTextFromDialogue('林夏：“打不开……”', '林夏'), '打不开……');
  assert.equal(spokenTextFromDialogue('旁白：父亲只留下这一把钥匙。', '旁白'), '父亲只留下这一把钥匙。');
  const configured = { female: 'zf_xiaoxiao', male: 'zm_yunxi', narrator: 'zf_xiaobei' };
  assert.equal(chooseTtsVoice('旁白', '', configured), 'zf_xiaobei');
  assert.equal(chooseTtsVoice('周明', 'calm male baritone', configured), 'zm_yunxi');
  assert.equal(chooseTtsVoice('林夏', 'clear young female voice', configured), 'zf_xiaoxiao');
  assert.equal(dialogueIdFromTakeMetadata('{"dialogue_id":"line-1"}'), 'line-1');
  assert.equal(dialogueIdFromTakeMetadata('{bad json'), '');
  assert.deepEqual(buildOpenRouterTtsRequest('hexgrad/kokoro-82m', '你好', 'zf_xiaoxiao', 1), {
    model: 'hexgrad/kokoro-82m', input: '你好', voice: 'zf_xiaoxiao', response_format: 'mp3', speed: 1,
  });
  const { DEFAULT_TTS_CONFIG } = require('../src/types/modelConfig.ts');
  const { getTtsVoicePreset } = require('../src/data/modelCatalog.ts');
  assert.deepEqual(DEFAULT_TTS_CONFIG, {
    apiBase: 'https://openrouter.ai/api/v1', model: 'hexgrad/kokoro-82m',
    voiceFemale: 'zf_xiaoxiao', voiceMale: 'zm_yunxi', voiceNarrator: 'zf_xiaobei',
  });
  assert.deepEqual(getTtsVoicePreset('hexgrad/kokoro-82m'), {
    female: 'zf_xiaoxiao', male: 'zm_yunxi', narrator: 'zf_xiaobei',
  });
});

test('generation jobs keep unknown provider charges out of recorded-cost totals', () => {
  const ttsRoute = fs.readFileSync(path.join(__dirname, '../../backend/src/routes/tts.ts'), 'utf8');
  const imageRoute = fs.readFileSync(path.join(__dirname, '../../backend/src/routes/generation.ts'), 'utf8');
  const videoRoute = fs.readFileSync(path.join(__dirname, '../../backend/src/routes/video.ts'), 'utf8');
  assert.match(ttsRoute, /costCurrency: "unknown"/);
  assert.match(ttsRoute, /cost_recorded: false/);
  assert.match(imageRoute, /costCurrency: "unknown"/);
  assert.match(videoRoute, /0, 'unknown', 'video'/);
});

test('TTS test errors preserve JSON and plain-text provider details after one body read', async () => {
  const { readTtsErrorDetail } = require('../src/components/settings/TtsConfigSection.tsx');
  let reads = 0;
  const jsonDetail = await readTtsErrorDetail({
    status: 502,
    text: async () => { reads += 1; return '{"detail":"上游音色无效"}'; },
  });
  assert.equal(jsonDetail, '上游音色无效');
  assert.equal(reads, 1);
  assert.equal(await readTtsErrorDetail({ status: 502, text: async () => 'gateway timeout' }), 'gateway timeout');
});
