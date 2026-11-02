const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

let plugin;
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../client.js'), 'utf8'), {
  window: { __ModuleLoader__: { load({ factory }) { plugin = factory(() => ({})); } } }
});
const { withSkills } = plugin._test;
const plain = value => JSON.parse(JSON.stringify(value));
const input = (draft, occurrences = []) => ({ draft, occurrences, phase: 'plain', attachmentIds: ['keep-image'] });

test('multiple skills become editable slash references without losing the prompt', () => {
  const original = input('Describe the project');
  const result = plain(withSkills(original, '', ['review', 'documents']));
  assert.equal(result.draft.text, 'Skills: /review /documents\nDescribe the project');
  assert.deepEqual(result.draft.references, []);
  assert.deepEqual(original.attachmentIds, ['keep-image']);
  assert.equal(original.draft, 'Describe the project');
});

test('changing the pending selection replaces only its intact managed prefix', () => {
  const first = withSkills(input('Keep this text'), '', ['review', 'documents']);
  const second = withSkills(input(first.draft.text, first.draft.references), first.prefix, ['documents']);
  assert.equal(second.draft.text, 'Skills: /documents\nKeep this text');
  const cleared = withSkills(input(second.draft.text, second.draft.references), second.prefix, []);
  assert.equal(cleared.draft.text, 'Keep this text');
  assert.equal(cleared.draft.references.length, 0);
});

test('preserves semantic file chips and shifts their offsets correctly', () => {
  const reference = { offset: 5, length: 8, source: 'reference', ref: '@file.ts', label: 'file.ts', clipboardText: '@file.ts', appearance: 'file' };
  const result = plain(withSkills(input('Read @file.ts please', [reference]), '', ['review']));
  assert.deepEqual(result.draft.references[0], { ...reference, offset: reference.offset + result.prefix.length });
  const cleared = plain(withSkills(input(result.draft.text, result.draft.references), result.prefix, []));
  assert.deepEqual(cleared.draft.references, [reference]);
});

test('does not duplicate explicit skills or interpret file paths as skills', () => {
  const result = withSkills(input('Use /review on /usr/bin and 5/8'), '', ['review', 'usr']);
  assert.equal(result.draft.text, 'Skills: /usr\nUse /review on /usr/bin and 5/8');
});

test('does not delete edited text or an already submitted prefix', () => {
  const result = withSkills(input('User changed the draft'), '/review\n', ['documents']);
  assert.equal(result.draft.text, 'Skills: /documents\nUser changed the draft');
  assert.equal(withSkills(input(''), '/review\n', ['documents']).draft.text, 'Skills: /documents\n');
});

test('registers the requested composer slot and locale with lifecycle ownership', () => {
  const calls = [];
  const ctx = {
    effect(effect) { const cleanup = effect(); assert.equal(typeof cleanup, 'function'); },
    locale: { register(namespace, locales) { calls.push(namespace); assert.ok(locales.zh.button); return () => {}; } },
    slots: {
      inject(owner, effect) { calls.push(owner); effect(); },
      register(options, component) { calls.push(options); assert.equal(typeof component, 'function'); return () => {}; }
    }
  };
  plugin.apply(ctx);
  assert.equal(calls[1], 'conversation.input.left');
  assert.equal(calls[2].id, 'local-session-skills');
  assert.equal(calls[2].order, 30);
  assert.ok(plugin.inject.includes('remote.skills'));
  assert.ok(plugin.inject.includes('remote'));
});
