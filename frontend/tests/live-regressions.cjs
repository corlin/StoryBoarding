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
const { computeProjectQualityDiagnostics: diagnose } = require('../src/components/modals/ProjectQualityRadarModal.tsx');
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
  } finally {
    api.getProject = originalGetProject;
  }
});

test('three-episode production order and filenames retain episode identity', () => {
  const {
    compareProductionShots,
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
