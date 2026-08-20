import assert from 'node:assert/strict'
import test from 'node:test'
import { commands } from 'coc.nvim'
import { Validator } from '../src/client'
import { CodeActionsOnSaveOptions, Validate } from '../src/shared/settings'

test('activates its Coc commands and probes JavaScript documents', () => {
  assert.equal(commands.has('eslint.createConfig'), true)
  assert.equal(commands.has('eslint.lintProject'), true)
  assert.equal(new Validator().check({ uri: 'file:///tmp/coc-eslint-test.js', languageId: 'javascript' }), Validate.probe)
})

test('accepts only object save options', () => {
  assert.deepEqual(CodeActionsOnSaveOptions.from({ fixTypes: ['problem'] }), { fixTypes: ['problem'] })
  assert.equal(CodeActionsOnSaveOptions.from(null), undefined)
  assert.equal(CodeActionsOnSaveOptions.from([]), undefined)
})
