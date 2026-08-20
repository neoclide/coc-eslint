import { commands, Disposable, disposeAll, StatusBarItem, Task, TaskOptions, Uri, window, workspace } from 'coc.nvim'
import path from 'path'
import { findEslint } from './utils'

export async function resolveLintCommand(root: string, command: string | null | undefined): Promise<string> {
  return typeof command === 'string' && command.length > 0 ? command : findEslint(root)
}

export interface LintQuickfixItem {
  filename: string
  lnum: number
  col: number
  text: string
  type: 'E' | 'W'
}

/** Convert ESLint's built-in JSON formatter output to Vim quickfix entries. */
export function parseLintOutput(output: string, cwd?: string): LintQuickfixItem[] {
  let reports: Array<{ filePath?: string; messages?: Array<{ line?: number; column?: number; message?: string; ruleId?: string; severity?: number }> }>
  try {
    const parsed = JSON.parse(output)
    if (!Array.isArray(parsed)) return []
    reports = parsed
  } catch {
    return []
  }
  const result: LintQuickfixItem[] = []
  for (const report of reports) {
    if (typeof report.filePath !== 'string' || !Array.isArray(report.messages)) continue
    const filename = cwd ? path.relative(cwd, report.filePath) : report.filePath
    for (const message of report.messages) {
      if (typeof message.line !== 'number' || typeof message.column !== 'number' || typeof message.message !== 'string') continue
      result.push({
        filename,
        lnum: message.line,
        col: message.column,
        text: `${message.message}${message.ruleId ? ` [${message.ruleId}]` : ''}`,
        type: message.severity === 2 ? 'E' : 'W'
      })
    }
  }
  return result
}

export default class EslintTask implements Disposable {
  private disposables: Disposable[] = []
  public static readonly id: string = 'eslint.lintProject'
  private statusItem: StatusBarItem
  private task: Task

  public constructor() {
    this.statusItem = window.createStatusBarItem(1, { progress: true })
    let task = this.task = workspace.createTask('ESLINT')
    let cwd: string
    let stdout: string[] = []
    this.disposables.push(commands.registerCommand(EslintTask.id, async () => {
      let opts = await this.getOptions()
      if (opts === undefined) {
        void window.showWarningMessage('ESLint project linting requires an open workspace folder.')
        return
      }
      stdout = []
      lastline = ''
      cwd = await workspace.nvim.call('getcwd') as string
      let started = await this.start(opts)
      if (started) {
        this.statusItem.text = 'Eslint running'
        this.statusItem.isProgress = true
        this.statusItem.show()
        workspace.nvim.call('setqflist', [[]], true)
      }
    }))
    let lastline: string = ''
    task.onExit(code => {
      for (const item of parseLintOutput(stdout.join('\n'), cwd)) {
        this.onQuickfixItem(item, cwd)
      }
      if (code != 0) {
        window.showWarningMessage(`Eslint found: ${lastline || 'problems'}`)
      } else {
        window.showInformationMessage(`Eslint no problem.`)
      }
      this.onStop()
    })
    task.onStdout(lines => {
      stdout = stdout.concat(lines)
      let last = lines[lines.length - 1]
      if (last && last.includes('problem')) lastline = last
    })
    task.onStderr(lines => {
      window.showErrorMessage(`Eslint error: ` + lines.join('\n'))
    })
    this.disposables.push(Disposable.create(() => {
      task.dispose()
    }), this.statusItem)
  }

  private async start(options: TaskOptions): Promise<boolean> {
    return await this.task.start(options)
  }

  private onStop(): void {
    this.statusItem.hide()
  }

  private onQuickfixItem(item: LintQuickfixItem, cwd?: string): void {
    const fullpath = cwd ? path.resolve(cwd, item.filename) : item.filename
    const uri = Uri.file(fullpath).toString()
    const doc = workspace.getDocument(uri)
    const bufnr = doc ? doc.bufnr : null
    const filepath = cwd ? path.relative(cwd, fullpath) : fullpath
    const cols = workspace.env.columns - filepath.length
    const msg = item.text.length > cols ? item.text.slice(0, cols) + '...' : item.text
    const quickfix = {
      filename: filepath,
      lnum: item.lnum,
      col: item.col,
      text: msg,
      type: item.type
    } as any
    if (bufnr) quickfix.bufnr = bufnr
    workspace.nvim.call('setqflist', [[quickfix], 'a'], true)
  }

  public async getOptions(): Promise<TaskOptions | undefined> {
    let folders = workspace.workspaceFolders
    if (folders.length === 0) return undefined
    let root = Uri.parse(folders[0].uri).fsPath
    let config = workspace.getConfiguration('eslint', folders[0])
    let cmd = await resolveLintCommand(root, config.get<string | null>('lintTask.command', null))
    let args = config.get<string[]>('lintTask.options', ['.'])
    return {
      cmd,
      args: args.concat(['-f', 'json', '--no-color']),
      cwd: root
    }
  }

  public dispose(): void {
    disposeAll(this.disposables)
  }
}
