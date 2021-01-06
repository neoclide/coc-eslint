import { commands, disposeAll, StatusBarItem, Task, TaskOptions, Uri, window, workspace } from 'coc.nvim'
import { Disposable, Location } from 'coc.nvim'
import { findEslint } from './utils'

const errorRegex = /^(.+):(\d+):(\d+):\s*(.+?)\s\[(\w+)\/(.*)\]/

interface ErrorItem {
  location: Location
  text: string
  type: string
}

export default class EslintTask implements Disposable {
  private disposables: Disposable[] = []
  public static readonly id: string = 'eslint.lintProject'
  public static readonly startTexts: string[] = ['Starting compilation in watch mode', 'Starting incremental compilation']
  private statusItem: StatusBarItem
  private task: Task

  public constructor() {
    this.statusItem = window.createStatusBarItem(1, { progress: true })
    let task = this.task = workspace.createTask('ESLINT')
    this.disposables.push(commands.registerCommand(EslintTask.id, async () => {
      let opts = await this.getOptions()
      let started = await this.start(opts)
      if (started) {
        this.statusItem.text = 'compiling'
        this.statusItem.isProgress = true
        this.statusItem.show()
        workspace.nvim.call('setqflist', [[]], true)
      }
    }))
    task.onExit(code => {
      if (code != 0) {
        window.showMessage(`Eslint found issues`, 'warning')
      }
      this.onStop()
    })
    task.onStdout(lines => {
      for (let line of lines) {
        this.onLine(line)
      }
    })
    task.onStderr(lines => {
      window.showMessage(`TSC error: ` + lines.join('\n'), 'error')
    })
    this.disposables.push(Disposable.create(() => {
      task.dispose()
    }))
  }

  //   private async check(): Promise<void> {
  //     let running = await this.task.running
  //     if (running) await this.task.stop()
  //   }
  // 
  private async start(options: TaskOptions): Promise<boolean> {
    return await this.task.start(options)
  }

  private onStop(): void {
    this.statusItem.hide()
  }

  private onLine(line: string): void {
    let ms = line.match(errorRegex)
    if (!ms) return
    let fullpath = ms[1]
    let uri = Uri.file(fullpath).toString()
    let doc = workspace.getDocument(uri)
    let bufnr = doc ? doc.bufnr : null
    let item = {
      filename: fullpath,
      lnum: Number(ms[2]),
      col: Number(ms[3]),
      text: `${ms[4]} [${ms[6]}]`,
      type: /error/i.test(ms[5]) ? 'E' : 'W'
    } as any
    if (bufnr) item.bufnr = bufnr
    workspace.nvim.call('setqflist', [[item], 'a'])
  }
  public async getOptions(): Promise<TaskOptions> {
    let root = Uri.parse(workspace.workspaceFolder.uri).fsPath
    let cmd = await findEslint(root)
    let config = workspace.getConfiguration('eslint')
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
