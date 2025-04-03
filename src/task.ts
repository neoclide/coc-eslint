import { commands, Disposable, disposeAll, Location, StatusBarItem, Task, TaskOptions, Uri, window, workspace } from 'coc.nvim'
import path from 'path'
import { findEslint } from './utils'

const errorRegex = /^(.+):(\d+):(\d+):\s*(.+?)\s\[(\w+)\/?(.*)\]/

interface ErrorItem {
  location: Location
  text: string
  type: string
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
    this.disposables.push(commands.registerCommand(EslintTask.id, async () => {
      let opts = await this.getOptions()
      cwd = await workspace.nvim.call('getcwd')
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
      if (code != 0) {
        window.showWarningMessage(`Eslint found: ${lastline}`)
      } else {
        window.showInformationMessage(`Eslint no problem.`)
      }
      this.onStop()
    })
    task.onStdout(lines => {
      let pre: string[] = []
      for (let i = 0; i < lines.length; i++) {
        let line = lines[i]
        if (line.endsWith(']')) {
          if (pre.length > 0) {
            let joined = pre.join(' ') + ' ' + line
            this.onLine(joined, cwd)
            pre = []
          } else {
            this.onLine(line, cwd)
          }
        } else {
          pre.push(line)
        }
      }
      let last = lines[lines.length - 1]
      if (last.includes('problem')) lastline = last
    })
    task.onStderr(lines => {
      window.showErrorMessage(`Eslint error: ` + lines.join('\n'))
    })
    this.disposables.push(Disposable.create(() => {
      task.dispose()
    }))
  }

  private async start(options: TaskOptions): Promise<boolean> {
    return await this.task.start(options)
  }

  private onStop(): void {
    this.statusItem.hide()
  }

  private onLine(line: string, cwd?: string): void {
    let ms = line.match(errorRegex)
    if (!ms) return
    let fullpath = ms[1]
    let uri = Uri.file(fullpath).toString()
    let filepath = cwd ? path.relative(cwd, fullpath) : fullpath
    let doc = workspace.getDocument(uri)
    let bufnr = doc ? doc.bufnr : null
    let cols = workspace.env.columns - filepath.length
    let msg = ms[4].length > cols ? ms[4].slice(0, cols) + '...' : ms[4]
    let item = {
      filename: filepath,
      lnum: Number(ms[2]),
      col: Number(ms[3]),
      text: `${msg} ${ms[6] ? `[${ms[6]}]` : ''}`,
      type: /error/i.test(ms[5]) ? 'E' : 'W'
    } as any
    if (bufnr) item.bufnr = bufnr
    workspace.nvim.call('setqflist', [[item], 'a'], true)
  }

  public async getOptions(): Promise<TaskOptions> {
    let folders = workspace.workspaceFolders
    if (folders.length === 0) return
    let root = Uri.parse(folders[0].uri).fsPath
    let cmd = await findEslint(root)
    let config = workspace.getConfiguration('eslint', folders[0])
    let args = config.get<string[]>('lintTask.options', ['.'])
    return {
      cmd,
      args: args.concat(['-f', 'unix', '--no-color']),
      cwd: root
    }
  }

  public dispose(): void {
    disposeAll(this.disposables)
  }
}
