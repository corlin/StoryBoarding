const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '../src/routes/production.ts'), 'utf8');

function routeBody(method, route) {
  const marker = `router.${method}("${route}"`;
  const start = source.indexOf(marker);
  assert.notEqual(start, -1, `missing ${method.toUpperCase()} ${route}`);
  const next = source.indexOf('\nrouter.', start + marker.length);
  return source.slice(start, next === -1 ? source.length : next);
}

test('production reads authorize their project or shot scope', () => {
  for (const [method, route] of [
    ['get', '/takes'],
    ['get', '/jobs'],
    ['get', '/dialogue'],
    ['get', '/edit-versions'],
    ['get', '/costs'],
    ['get', '/asset-versions'],
  ]) {
    assert.match(routeBody(method, route), /authorize(Project|Shot)Owner\(/, `${route} must authorize ownership`);
  }
});

test('production writes authorize the target resource', () => {
  for (const [method, route] of [
    ['post', '/takes/upload'],
    ['post', '/deliveries/upload'],
    ['post', '/dialogue'],
    ['post', '/edit-versions'],
  ]) {
    assert.match(routeBody(method, route), /authorize(Project|Shot)Owner\(/, `${route} must authorize ownership`);
  }
});

test('project-scoped production reads reject a missing project id before authorization', () => {
  for (const route of ['/edit-versions', '/costs', '/asset-versions']) {
    const body = routeBody('get', route);
    assert.match(body, /if \(!projectId\) return c\.json\(\{ detail: "project_id required" \}, 400\)/);
    assert.ok(body.indexOf('project_id required') < body.indexOf('authorizeProjectOwner('));
  }
});

test('sequence references are authorized and constrained to the requested project', () => {
  for (const route of ['/dialogue', '/edit-versions']) {
    const body = routeBody('post', route);
    assert.match(body, /authorizeSequenceOwner\(/, `${route} must authorize sequence ownership`);
    assert.match(body, /sequenceAccess\.project\.id !== project_id/, `${route} must reject cross-project sequences`);
  }
  assert.match(routeBody('post', '/dialogue'), /shotAccess\.sequence\.id !== sequence_id/);
});

test('dialogue text, speaker, performance, and voiceover edits all refresh lip-sync readiness', () => {
  const body = routeBody('post', '/dialogue');
  assert.match(body, /\[speaker, text, performance, emotion, is_voiceover\]\.some/);
  assert.match(body, /refreshShotLipSyncFromDialogue/);
});

test('loading dialogue repairs provider-generated legacy TTS consent metadata', () => {
  const body = routeBody('get', '/dialogue');
  assert.match(body, /take\?\.source === "ai_generated"/);
  assert.match(body, /voiceConsentStatus: "provider_preset"/);
});
