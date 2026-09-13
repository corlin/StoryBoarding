const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const providerSource = fs.readFileSync(path.join(__dirname, '../src/lib/videoProvider.ts'), 'utf8');
const authSource = fs.readFileSync(path.join(__dirname, '../src/lib/auth.ts'), 'utf8');
const settingsSource = fs.readFileSync(path.join(__dirname, '../src/routes/settings.ts'), 'utf8');

test('MiniMax CN H3 uses the official V2 API origin without rewriting it', () => {
  assert.match(providerSource, /apiBase \|\| "https:\/\/api\.minimax\.cn"/);
  assert.doesNotMatch(providerSource, /replace\(\/\^https:\\\/\\\/api\\\.minimax\\\.cn/);
  assert.match(providerSource, /`\$\{baseUrl\}\/v2\/query\/video_generation\/\$\{encodeURIComponent\(taskId\)\}`/);
});

test('account and settings defaults use the official MiniMax CN API origin', () => {
  for (const source of [authSource, settingsSource]) {
    assert.match(source, /https:\/\/api\.minimax\.cn/);
    assert.doesNotMatch(source, /https:\/\/api\.minimaxi\.com/);
  }
});
