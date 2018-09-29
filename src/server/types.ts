import { WorkspaceFolder } from 'vscode-languageserver'

export interface ESLintError extends Error {
  messageTemplate?: string
  messageData?: {
    pluginName?: string
  }
}

export interface ESLintAutoFixEdit {
  range: [number, number]
  text: string
}

export interface ESLintProblem {
  line: number
  column: number
  endLine?: number
  endColumn?: number
  severity: number
  ruleId: string
  message: string
  fix?: ESLintAutoFixEdit
}

export interface ESLintDocumentReport {
  filePath: string
  errorCount: number
  warningCount: number
  messages: ESLintProblem[]
  output?: string
}

export interface ESLintReport {
  errorCount: number
  warningCount: number
  results: ESLintDocumentReport[]
}

export interface CLIOptions {
  cwd?: string
}

export interface ESLintConfig {
  [index: string]: any
}

export interface FixResult {
  fixed: boolean
  output: string
  messages: string[]
}

export interface ESLintLinter {
  verifyAndFix(code: string, config: ESLintConfig, options: LinterOptions): FixResult
}

export interface LinterOptions {
  filename: string
  allowInlineConfig: boolean
  fix: boolean
}

export interface CLIEngine {
  executeOnText(content: string, file?: string): ESLintReport
  getConfigForFile(file: string): ESLintConfig
}

export interface CLIEngineConstructor {
  new(options: CLIOptions): CLIEngine
}

export interface LinterConstructor {
  new(): ESLintLinter
}

export interface ESLintModule {
  CLIEngine: CLIEngineConstructor
  Linter: LinterConstructor
}

type RunValues = 'onType' | 'onSave'

interface DirectoryItem {
  directory: string
  changeProcessCWD?: boolean
}

export namespace Is {
  const toString = Object.prototype.toString

  export function boolean(value: any): value is boolean {
    return value === true || value === false
  }

  export function string(value: any): value is string {
    return toString.call(value) === '[object String]'
  }
}

export namespace DirectoryItem {
  export function is(item: any): item is DirectoryItem {
    let candidate = item as DirectoryItem
    return (
      candidate &&
      Is.string(candidate.directory) &&
      (Is.boolean(candidate.changeProcessCWD) ||
        candidate.changeProcessCWD === void 0)
    )
  }
}

export interface TextDocumentSettings {
  validate: boolean
  packageManager: 'npm' | 'yarn'
  autoFix: boolean
  autoFixOnSave: boolean
  options: any | undefined
  run: RunValues
  nodePath: string | undefined
  workspaceFolder: WorkspaceFolder | undefined
  workingDirectory: DirectoryItem | undefined
  library: ESLintModule | undefined
  resolvedGlobalPackageManagerPath: string | undefined
}
