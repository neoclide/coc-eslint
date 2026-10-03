const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { spawnSync } = require('node:child_process')
const test = require('node:test')

const projectRoot = path.resolve(__dirname, '..')

function buildFixture(t, valid) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'coc-eslint-build-'))
  t.after(() => fs.rmSync(root, { recursive: true, force: true }))
  fs.copyFileSync(path.join(projectRoot, 'esbuild.js'), path.join(root, 'esbuild.js'))
  fs.symlinkSync(path.join(projectRoot, 'node_modules'), path.join(root, 'node_modules'), 'junction')
  if (valid) {
    fs.mkdirSync(path.join(root, 'src'))
    fs.mkdirSync(path.join(root, 'server'))
    fs.writeFileSync(path.join(root, 'src/extension.ts'), 'export function activate() {}')
    fs.writeFileSync(path.join(root, 'server/eslintServer.ts'), 'export {}')
  }
  const result = spawnSync(process.execPath, ['esbuild.js'], {
    cwd: root,
    encoding: 'utf8',
    timeout: 30000
  })
  assert.ifError(result.error)
  assert.equal(result.signal, null)
  return { root, result }
}

test('build exits nonzero when esbuild cannot resolve entry modules', t => {
  const { result } = buildFixture(t, false)
  assert.match(result.stderr, /Could not resolve/)
  assert.equal(result.status, 1, result.stderr)
})

test('successful build exits zero and emits both bundles', t => {
  const { root, result } = buildFixture(t, true)
  assert.equal(result.status, 0, result.stderr)
  assert.ok(fs.statSync(path.join(root, 'lib/index.js')).size > 0)
  assert.ok(fs.statSync(path.join(root, 'lib/server.js')).size > 0)
})
