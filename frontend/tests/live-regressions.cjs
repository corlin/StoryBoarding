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
