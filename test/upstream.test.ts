import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { URI } from 'vscode-uri'
import { getFileSystemPath } from '../server/paths'
import { Diagnostics } from '../server/eslint'
import LanguageDefaults from '../server/languageDefaults'
import { resolveLintCommand } from '../src/task'

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

test('lintTask.command overrides executable discovery', async () => {
  assert.equal(await resolveLintCommand('/does/not/exist', 'custom-eslint'), 'custom-eslint')
  assert.equal(await resolveLintCommand('/does/not/exist', null), 'eslint')
})

test('marks core, plugin, and message-only unused diagnostics', () => {
  assert.equal(Diagnostics.isUnnecessary({ message: "'unused' is defined but never used.", ruleId: 'no-unused-vars' }), true)
  assert.equal(Diagnostics.isUnnecessary({ message: "'unused' is defined but never used.", ruleId: '@typescript-eslint/no-unused-vars' }), true)
  assert.equal(Diagnostics.isUnnecessary({ message: "'unused' is defined but never used.", ruleId: 'unused-imports/no-unused-imports' }), true)
  assert.equal(Diagnostics.isUnnecessary({ message: "'answer' is assigned a value but never used." }), true)
  assert.equal(Diagnostics.isUnnecessary({ message: 'Unexpected console statement.', ruleId: 'no-console' }), false)
})

test('uses a normal block comment for unknown languages', () => {
  assert.deepEqual(LanguageDefaults.getBlockComment('unknown-language'), ['/*', '*/'])
})
