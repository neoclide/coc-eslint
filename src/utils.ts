import path from 'path'
import fs from 'fs'
import which from 'which'

function exists(file: string): boolean {
  return fs.existsSync(file)
}

export async function findEslint(rootPath: string): Promise<string> {
  const platform = process.platform
  if (
    platform === 'win32' &&
    (exists(path.join(rootPath, 'node_modules', '.bin', 'eslint.cmd')))
  ) {
    return path.join('.', 'node_modules', '.bin', 'eslint.cmd')
  } else if (
    (platform === 'linux' || platform === 'darwin') &&
    (exists(path.join(rootPath, 'node_modules', '.bin', 'eslint')))
  ) {
    return path.join('.', 'node_modules', '.bin', 'eslint')
  } else {
    try {
      return which.sync('eslint')
    } catch (e) {
      return ''
    }
  }
}
