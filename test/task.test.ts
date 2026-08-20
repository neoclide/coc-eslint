import assert from 'node:assert/strict'
import test from 'node:test'
import { parseLintOutput, resolveLintCommand } from '../src/task'

test('lintTask.command overrides executable discovery', async () => {
  assert.equal(await resolveLintCommand('/does/not/exist', 'custom-eslint'), 'custom-eslint')
  assert.equal(await resolveLintCommand('/does/not/exist', null), 'eslint')
})

test('parses built-in JSON formatter output for quickfix', () => {
  const items = parseLintOutput(JSON.stringify([{ filePath: '/workspace/src/a.js', messages: [
    { line: 2, column: 3, message: 'bad', ruleId: 'no-console', severity: 2 },
    { line: 4, column: 1, message: 'warn', ruleId: null, severity: 1 }
  ] }]), '/workspace')
  assert.equal(JSON.stringify(items), JSON.stringify([
    { filename: 'src/a.js', lnum: 2, col: 3, text: 'bad [no-console]', type: 'E' },
    { filename: 'src/a.js', lnum: 4, col: 1, text: 'warn', type: 'W' }
  ]))
})
