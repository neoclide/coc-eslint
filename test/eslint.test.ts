import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { URI } from 'vscode-uri'
import { Diagnostics, RuleSeverities } from '../server/eslint'
import LanguageDefaults from '../server/languageDefaults'
import { getFileSystemPath } from '../server/paths'
import { RuleSeverity } from '../server/shared/settings'
import { Changes, getCommandParams, isCachedCommand } from '../server/codeActionChanges'

test('useRealpaths resolves symlinks only when enabled', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'coc-eslint-realpath-'))
  const target = path.join(root, 'target.js')
  const link = path.join(root, 'link.js')
  try {
    fs.writeFileSync(target, '')
    fs.symlinkSync(target, link)
    assert.equal(getFileSystemPath(URI.file(link), false), link)
    assert.equal(getFileSystemPath(URI.file(link), true), fs.realpathSync.native(target))
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test('marks core, plugin, and message-only unused diagnostics', () => {
  assert.equal(Diagnostics.isUnnecessary({ message: "'unused' is defined but never used.", ruleId: 'no-unused-vars' }), true)
  assert.equal(Diagnostics.isUnnecessary({ message: "'unused' is defined but never used.", ruleId: '@typescript-eslint/no-unused-vars' }), true)
  assert.equal(Diagnostics.isUnnecessary({ message: "'unused' is defined but never used.", ruleId: 'unused-imports/no-unused-imports' }), true)
  assert.equal(Diagnostics.isUnnecessary({ message: "'answer' is assigned a value but never used." }), true)
  assert.equal(Diagnostics.isUnnecessary({ message: 'Unexpected console statement.', ruleId: 'no-console' }), false)
})

test('keeps rule severity customizations isolated by resource settings', () => {
  RuleSeverities.clear()
  assert.equal(RuleSeverities.getOverride('no-console', [{ rule: 'no-console', severity: RuleSeverity.error }]), RuleSeverity.error)
  assert.equal(RuleSeverities.getOverride('no-console', [{ rule: 'no-console', severity: RuleSeverity.warn }]), RuleSeverity.warn)
  assert.equal(RuleSeverities.getOverride('no-console', [{ rule: 'no-console', severity: RuleSeverity.error }], true), RuleSeverity.error)
})

test('isolates cached code actions by rule, URI, and document version', () => {
  const changes = new Changes()
  const first = { uri: 'file:///a.js', version: 1, ruleId: 'one' }
  const second = { uri: 'file:///a.js', version: 1, ruleId: 'two' }
  changes.clear(first)
  changes.set(changes.key('eslint.applySameFixes', first), {} as any)
  assert.notEqual(changes.key('eslint.applySameFixes', first), changes.key('eslint.applySameFixes', second))
  assert.equal(changes.isUsable(first.uri, first.version), true)
  assert.equal(changes.isUsable('file:///other.js', first.version), false)
  assert.equal(changes.isUsable(first.uri, 2), false)
  assert.equal(isCachedCommand('eslint.applySameFixes'), true)
  assert.equal(isCachedCommand('eslint.applyAllFixes'), false)
  assert.equal(getCommandParams(undefined), undefined)
  assert.equal(getCommandParams([]), undefined)
  assert.equal(JSON.stringify(getCommandParams([{ uri: first.uri, version: first.version, ruleId: first.ruleId }])), JSON.stringify(first))
})

test('uses a normal block comment for unknown languages', () => {
  assert.deepEqual(LanguageDefaults.getBlockComment('unknown-language'), ['/*', '*/'])
})
