import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { hasEslintConfig } from '../src/extension'

test('recognizes flat config files when creating configuration', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'coc-eslint-config-'))
  try {
    assert.equal(hasEslintConfig(root), false)
    fs.writeFileSync(path.join(root, 'eslint.config.mts'), '')
    assert.equal(hasEslintConfig(root), true)
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})
