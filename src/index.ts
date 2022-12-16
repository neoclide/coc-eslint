/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict'

import path from 'path'
import fs from 'fs'
import {
  workspace as Workspace, events, window as Window, commands as Commands, Disposable, ExtensionContext, Uri, TextDocument, CodeActionContext, Diagnostic, ProviderResult, Command,
  WorkspaceFolder as VWorkspaceFolder, MessageItem,
  Range,
  CancellationTokenSource,
  LanguageClient, LanguageClientOptions, RequestType, TransportKind, TextDocumentIdentifier, NotificationType, ErrorHandler,
  ErrorAction, CloseAction, State as ClientState, RevealOutputChannelOn,
  ServerOptions, DocumentFilter,
  WorkspaceFolder, NotificationType0,
  services
} from 'coc.nvim'
import {
  CodeActionKind,
  VersionedTextDocumentIdentifier,
  ExecuteCommandParams, DidCloseTextDocumentNotification, DidOpenTextDocumentNotification,
  ExecuteCommandRequest,
  CodeActionRequest,
  CodeActionParams,
  CodeAction
} from 'vscode-languageserver-protocol'

import { findEslint, convert2RegExp, toOSPath, toPosixPath } from './utils'
import EslintTask from './task'

namespace Is {
  const toString = Object.prototype.toString

  export function boolean(value: any): value is boolean {
    return value === true || value === false
  }

  export function string(value: any): value is string {
    return toString.call(value) === '[object String]'
  }

  export function objectLiteral(value: any): value is object {
    return value !== null && value !== undefined && !Array.isArray(value) && typeof value === 'object'
  }
}

interface ValidateItem {
  language: string
  autoFix?: boolean
}

namespace ValidateItem {
  export function is(item: any): item is ValidateItem {
    const candidate = item as ValidateItem
    return candidate && Is.string(candidate.language) && (Is.boolean(candidate.autoFix) || candidate.autoFix === void 0)
  }
}

interface LegacyDirectoryItem {
  directory: string
  changeProcessCWD: boolean
}

namespace LegacyDirectoryItem {
  export function is(item: any): item is LegacyDirectoryItem {
    const candidate = item as LegacyDirectoryItem
    return candidate && Is.string(candidate.directory) && Is.boolean(candidate.changeProcessCWD)
  }
}

enum ModeEnum {
  auto = 'auto',
  location = 'location'
}

namespace ModeEnum {
  export function is(value: string): value is ModeEnum {
    return value === ModeEnum.auto || value === ModeEnum.location
  }
}

interface ModeItem {
  mode: ModeEnum
}

namespace ModeItem {
  export function is(item: any): item is ModeItem {
    const candidate = item as ModeItem
    return candidate && ModeEnum.is(candidate.mode)
  }
}

interface DirectoryItem {
  directory: string
  '!cwd'?: boolean
}

namespace DirectoryItem {
  export function is(item: any): item is DirectoryItem {
    const candidate = item as DirectoryItem
    return candidate && Is.string(candidate.directory) && (Is.boolean(candidate['!cwd']) || candidate['!cwd'] === undefined)
  }
}

interface PatternItem {
  pattern: string
  '!cwd'?: boolean
}

namespace PatternItem {
  export function is(item: any): item is PatternItem {
    const candidate = item as PatternItem
    return candidate && Is.string(candidate.pattern) && (Is.boolean(candidate['!cwd']) || candidate['!cwd'] === undefined)
  }
}

type RunValues = 'onType' | 'onSave'

interface CodeActionSettings {
  disableRuleComment: {
    enable: boolean
    location: 'separateLine' | 'sameLine'
  }
  showDocumentation: {
    enable: boolean
  }
}

enum CodeActionsOnSaveMode {
  all = 'all',
  problems = 'problems'
}

namespace CodeActionsOnSaveMode {
  export function from(value: string | undefined | null): CodeActionsOnSaveMode {
    if (value === undefined || value === null || !Is.string(value)) {
      return CodeActionsOnSaveMode.all
    }
    switch (value.toLowerCase()) {
      case CodeActionsOnSaveMode.problems:
        return CodeActionsOnSaveMode.problems
      default:
        return CodeActionsOnSaveMode.all
    }
  }
}

namespace CodeActionsOnSaveRules {
  export function from(value: string[] | undefined | null): string[] | undefined {
    if (value === undefined || value === null || !Array.isArray(value)) {
      return undefined
    }
    return value.filter(item => Is.string(item))
  }
}

interface CodeActionsOnSaveSettings {
  enable: boolean
  mode: CodeActionsOnSaveMode
  rules?: string[]
}

enum Validate {
  on = 'on',
  off = 'off',
  probe = 'probe'
}

enum ESLintSeverity {
  off = 'off',
  warn = 'warn',
  error = 'error'
}

namespace ESLintSeverity {
  export function from(value: string | undefined | null): ESLintSeverity {
    if (value === undefined || value === null) {
      return ESLintSeverity.off
    }
    switch (value.toLowerCase()) {
      case ESLintSeverity.off:
        return ESLintSeverity.off
      case ESLintSeverity.warn:
        return ESLintSeverity.warn
      case ESLintSeverity.error:
        return ESLintSeverity.error
      default:
        return ESLintSeverity.off
    }
  }
}

enum RuleSeverity {
  // Original ESLint values
  info = 'info',
  warn = 'warn',
  error = 'error',
  off = 'off',

  // Added severity override changes
  default = 'default',
  downgrade = 'downgrade',
  upgrade = 'upgrade'
}

interface RuleCustomization {
  rule: string
  severity: RuleSeverity
}

interface ConfigurationSettings {
  validate: Validate
  packageManager: 'npm' | 'yarn' | 'pnpm'
  experimental: {
    useFlatConfig: boolean
  }
  useESLintClass: boolean
  codeAction: CodeActionSettings
  codeActionOnSave: CodeActionsOnSaveSettings
  format: boolean
  quiet: boolean
  onIgnoredFiles: ESLintSeverity
  options: any | undefined
  rulesCustomizations: RuleCustomization[]
  run: RunValues
  nodePath: string | null
  workspaceFolder: WorkspaceFolder | undefined
  workingDirectory: ModeItem | DirectoryItem | undefined
}

interface NoESLintState {
  global?: boolean
  workspaces?: { [key: string]: boolean }
}

enum Status {
  ok = 1,
  warn = 2,
  error = 3
}

interface StatusParams {
  uri: string
  state: Status
}

namespace StatusNotification {
  export const type = new NotificationType<StatusParams>('eslint/status')
}

interface NoConfigParams {
  message: string
  document: TextDocumentIdentifier
}

interface NoConfigResult {
}

namespace NoConfigRequest {
  export const type = new RequestType<NoConfigParams, NoConfigResult, void>('eslint/noConfig')
}


interface NoESLintLibraryParams {
  source: TextDocumentIdentifier
}

interface NoESLintLibraryResult {
}

namespace NoESLintLibraryRequest {
  export const type = new RequestType<NoESLintLibraryParams, NoESLintLibraryResult, void>('eslint/noLibrary')
}

interface OpenESLintDocParams {
  url: string
}

interface OpenESLintDocResult {

}

namespace OpenESLintDocRequest {
  export const type = new RequestType<OpenESLintDocParams, OpenESLintDocResult, void>('eslint/openDoc')
}

interface ProbeFailedParams {
  textDocument: TextDocumentIdentifier
}

namespace ProbeFailedRequest {
  export const type = new RequestType<ProbeFailedParams, void, void>('eslint/probeFailed')
}

namespace ShowOutputChannel {
  export const type = new NotificationType0('eslint/showOutputChannel')
}

const exitCalled = new NotificationType<[number, string]>('eslint/exitCalled')

async function pickFolder(folders: ReadonlyArray<VWorkspaceFolder>, placeHolder: string): Promise<VWorkspaceFolder | undefined> {
  if (folders.length === 1) {
    return Promise.resolve(folders[0])
  }

  const selected = await Window.showQuickpick(
    folders.map<string>((folder) => { return folder.name }),
    placeHolder
  )
  if (selected === -1) {
    return undefined
  }
  return folders[selected]
}

function createDefaultConfiguration(): void {
  const folders = Workspace.workspaceFolders
  if (!folders) {
    void Window.showErrorMessage('An ESLint configuration can only be generated if VS Code is opened on a workspace folder.')
    return
  }
  const noConfigFolders = folders.filter(folder => {
    const configFiles = ['.eslintrc.js', '.eslintrc.yaml', '.eslintrc.yml', '.eslintrc', '.eslintrc.json']
    for (const configFile of configFiles) {
      if (fs.existsSync(path.join(Uri.parse(folder.uri).fsPath, configFile))) {
        return false
      }
    }
    return true
  })
  if (noConfigFolders.length === 0) {
    if (folders.length === 1) {
      void Window.showInformationMessage('The workspace already contains an ESLint configuration file.')
    } else {
      void Window.showInformationMessage('All workspace folders already contain an ESLint configuration file.')
    }
    return
  }
  void pickFolder(noConfigFolders, 'Select a workspace folder to generate a ESLint configuration for').then(async (folder) => {
    if (!folder) {
      return
    }
    const folderRootPath = Uri.parse(folder.uri).fsPath
    const terminal = await Workspace.createTerminal({
      name: `ESLint init`,
      cwd: folderRootPath
    })
    const eslintCommand = await findEslint(folderRootPath)
    terminal.sendText(`${eslintCommand} --init`)
    terminal.show()
  })
}

let onActivateCommands: Disposable[] | undefined

const probeFailed: Set<string> = new Set()
function computeValidate(textDocument: TextDocument): Validate {
  const config = Workspace.getConfiguration('eslint', textDocument.uri)
  if (!config.get('enable', true)) {
    return Validate.off
  }
  const languageId = textDocument.languageId
  const validate = config.get<(ValidateItem | string)[]>('validate')
  if (Array.isArray(validate)) {
    for (const item of validate) {
      if (Is.string(item) && item === languageId) {
        return Validate.on
      } else if (ValidateItem.is(item) && item.language === languageId) {
        return Validate.on
      }
    }
  }
  const uri: string = textDocument.uri.toString()
  if (probeFailed.has(uri)) {
    return Validate.off
  }
  const probe: string[] | undefined = config.get<string[]>('probe')
  if (Array.isArray(probe)) {
    for (const item of probe) {
      if (item === languageId) {
        return Validate.probe
      }
    }
  }
  return Validate.off
}

function parseRulesCustomizations(rawConfig: unknown): RuleCustomization[] {
  if (!rawConfig || !Array.isArray(rawConfig)) {
    return []
  }

  return rawConfig.map(rawValue => {
    if (typeof rawValue.severity === 'string' && typeof rawValue.rule === 'string') {
      return {
        severity: rawValue.severity,
        rule: rawValue.rule,
      }
    }

    return undefined
  }).filter((value): value is RuleCustomization => !!value)
}

// Copied from LSP libraries. We should have a flag in the client to know whether the
// client runs in debugger mode.
function isInDebugMode(): boolean {
  const debugStartWith: string[] = ['--debug=', '--debug-brk=', '--inspect=', '--inspect-brk=']
  const debugEquals: string[] = ['--debug', '--debug-brk', '--inspect', '--inspect-brk']
  let args: string[] = (process as any).execArgv
  if (args) {
    return args.some((arg) => {
      return debugStartWith.some(value => arg.startsWith(value)) ||
        debugEquals.some(value => arg === value)
    })
  }
  return false
}

export function activate(context: ExtensionContext) {

  function didOpenTextDocument(textDocument: TextDocument) {
    if (activated) {
      return
    }
    if (computeValidate(textDocument) !== Validate.off) {
      openListener.dispose()
      configurationListener.dispose()
      activated = true
      realActivate(context)
    }
  }

  function configurationChanged() {
    if (activated) {
      return
    }
    for (const textDocument of Workspace.textDocuments) {
      if (computeValidate(textDocument) !== Validate.off) {
        openListener.dispose()
        configurationListener.dispose()
        activated = true
        realActivate(context)
        return
      }
    }
  }

  let activated: boolean = false
  const openListener: Disposable = Workspace.onDidOpenTextDocument(didOpenTextDocument)
  const configurationListener: Disposable = Workspace.onDidChangeConfiguration(configurationChanged)

  const notValidating = async () => {
    let bufnr = await Workspace.nvim.call('bufnr', ['%'])
    let doc = Workspace.getDocument(bufnr)
    const enabled = Workspace.getConfiguration('eslint', doc ? doc.uri : undefined).get('enable', true)
    if (!enabled) {
      void Window.showInformationMessage(`ESLint is not running because the deprecated setting 'eslint.enable' is set to false. Remove the setting and use the extension disablement feature.`)
    } else {
      void Window.showInformationMessage('ESLint is not running. By default only TypeScript and JavaScript files are validated. If you want to validate other file types please specify them in the \'eslint.probe\' setting.')
    }
  }
  onActivateCommands = [
    Commands.registerCommand('eslint.executeAutofix', notValidating),
    Commands.registerCommand('eslint.showOutputChannel', notValidating),
    Commands.registerCommand('eslint.restart', notValidating)
  ]

  context.subscriptions.push(
    Commands.registerCommand('eslint.createConfig', createDefaultConfiguration)
  )
  context.subscriptions.push(new EslintTask())
  configurationChanged()
}

function realActivate(context: ExtensionContext): void {

  const statusBarItem = Window.createStatusBarItem(0)
  context.subscriptions.push(statusBarItem)
  let serverRunning: boolean | undefined

  const starting = 'ESLint server is starting.'
  const running = 'ESLint server is running.'
  const stopped = 'ESLint server stopped.'
  statusBarItem.text = 'ESLint'

  const documentStatus: Map<string, Status> = new Map()

  function updateDocumentStatus(params: StatusParams): void {
    documentStatus.set(params.uri, params.state)
    updateStatusBar(params.uri)
  }

  function updateStatusBar(uri: string | undefined) {
    const status = function() {
      if (serverRunning === false) {
        return Status.error
      }
      // if (uri === undefined) {
      //   uri = Window.activeTextEditor?.document.uri.toString()
      // }
      return (uri !== undefined ? documentStatus.get(uri) : undefined) ?? Status.ok
    }()
    let text: string = 'ESLint'
    switch (status) {
      case Status.ok:
        text = ''
        break
      case Status.warn:
        text = 'Eslint warning'
        break
      case Status.error:
        text = 'Eslint error'
        break
      default:
        text = ''
    }
    statusBarItem.text = serverRunning === undefined ? starting : text
    const alwaysShow = Workspace.getConfiguration('eslint').get('alwaysShowStatus', false)
    if (alwaysShow || status !== Status.ok) {
      statusBarItem.show()
    } else {
      statusBarItem.hide()
    }
  }

  function sanitize<T, D>(value: T, type: 'bigint' | 'boolean' | 'function' | 'number' | 'object' | 'string' | 'symbol' | 'undefined', def: D): T | D {
    if (Array.isArray(value)) {
      return value.filter(item => typeof item === type) as unknown as T
    } else if (typeof value !== type) {
      return def
    }
    return value
  }

  const serverModule = context.asAbsolutePath('lib/server.js')
  // Uri.joinPath(context.extensionUri, 'server', 'out', 'eslintServer.js').fsPath
  const eslintConfig = Workspace.getConfiguration('eslint')
  const debug = sanitize(eslintConfig.get<boolean>('debug', false) ?? false, 'boolean', false)
  const runtime = sanitize(eslintConfig.get<string | null>('runtime', null) ?? undefined, 'string', undefined)
  const execArgv = sanitize(eslintConfig.get<string[] | null>('execArgv', null) ?? undefined, 'string', undefined)
  const nodeEnv = sanitize(eslintConfig.get('nodeEnv', null) ?? undefined, 'string', undefined)

  let env: { [key: string]: string | number | boolean } = {}
  if (debug) env.DEBUG = 'eslint:*,-eslint:code-path'
  if (nodeEnv !== undefined) env.NODE_ENV = nodeEnv
  env.PATH = process.env.PATH
  const debugArgv = ['--nolazy', '--inspect=6011']
  const serverOptions: ServerOptions = {
    run: { module: serverModule, transport: TransportKind.ipc, runtime, options: { execArgv, cwd: process.cwd(), env } },
    debug: { module: serverModule, transport: TransportKind.ipc, runtime, options: { execArgv: execArgv !== undefined ? execArgv.concat(debugArgv) : debugArgv, cwd: process.cwd(), env } }
  }

  let defaultErrorHandler: ErrorHandler
  let serverCalledProcessExit: boolean = false

  const packageJsonFilter: DocumentFilter = { scheme: 'file', pattern: '**/package.json' }
  const configFileFilter: DocumentFilter = { scheme: 'file', pattern: '**/.eslintr{c.js,c.yaml,c.yml,c,c.json}' }
  const syncedDocuments: Map<string, TextDocument> = new Map<string, TextDocument>()

  const supportedQuickFixKinds: Set<string> = new Set([CodeActionKind.Source, CodeActionKind.SourceFixAll, `${CodeActionKind.SourceFixAll}.eslint`, CodeActionKind.QuickFix])
  const clientOptions: LanguageClientOptions = {
    documentSelector: [{ scheme: 'file' }, { scheme: 'untitled' }],
    diagnosticCollectionName: 'eslint',
    revealOutputChannelOn: RevealOutputChannelOn.Never,
    initializationOptions: {
    },
    progressOnInitialization: true,
    synchronize: {
      // configurationSection: 'eslint',
      fileEvents: [
        Workspace.createFileSystemWatcher('**/.eslintr{c.js,c.yaml,c.yml,c,c.json}'),
        Workspace.createFileSystemWatcher('**/.eslintignore'),
        Workspace.createFileSystemWatcher('**/package.json')
      ]
    },
    initializationFailedHandler: (error) => {
      client.error('Server initialization failed.', error)
      client.outputChannel.show(true)
      return false
    },
    errorHandler: {
      error: (error, message, count): ErrorAction => {
        return defaultErrorHandler.error(error, message, count)
      },
      closed: (): CloseAction => {
        if (serverCalledProcessExit) {
          return CloseAction.DoNotRestart
        }
        return defaultErrorHandler.closed()
      }
    },
    middleware: {
      didOpen: async (document, next) => {
        if (Workspace.match([packageJsonFilter], document) || Workspace.match([configFileFilter], document) || computeValidate(document) !== Validate.off) {
          const result = next(document)
          syncedDocuments.set(document.uri.toString(), document)
          return result
        }
      },
      didChange: async (event, next) => {
        if (syncedDocuments.has(event.textDocument.uri.toString())) {
          return next(event)
        }
      },
      willSave: async (event, next) => {
        if (syncedDocuments.has(event.document.uri.toString())) {
          return next(event)
        }
      },
      willSaveWaitUntil: (event, next) => {
        if (syncedDocuments.has(event.document.uri.toString())) {
          return next(event)
        } else {
          return Promise.resolve([])
        }
      },
      didSave: async (document, next) => {
        if (syncedDocuments.has(document.uri.toString())) {
          return next(document)
        }
      },
      didClose: async (document, next) => {
        const uri = document.uri.toString()
        if (syncedDocuments.has(uri)) {
          syncedDocuments.delete(uri)
          return next(document)
        }
      },
      provideCodeActions: (document, range, context, token, next): ProviderResult<(Command | CodeAction)[]> => {
        if (!syncedDocuments.has(document.uri.toString())) {
          return []
        }
        if (context.only !== undefined && !supportedQuickFixKinds.has(context.only[0])) {
          return []
        }
        if (context.only === undefined && (!context.diagnostics || context.diagnostics.length === 0)) {
          return []
        }
        const eslintDiagnostics: Diagnostic[] = []
        for (const diagnostic of context.diagnostics) {
          if (diagnostic.source === 'eslint') {
            eslintDiagnostics.push(diagnostic)
          }
        }
        if (context.only === undefined && eslintDiagnostics.length === 0) {
          return []
        }
        const newContext: CodeActionContext = Object.assign({}, context, { diagnostics: eslintDiagnostics })
        return next(document, range, newContext, token)
      },
      workspace: {
        didChangeWatchedFile: (event, next) => {
          probeFailed.clear()
          return next(event)
        },
        didChangeConfiguration: async (sections, next) => {
          return next(sections)
        },
        configuration: async (params, _token, _next): Promise<any[]> => {
          if (params.items === undefined) {
            return []
          }
          const result: (ConfigurationSettings | null)[] = []
          for (const item of params.items) {
            if (item.section || !item.scopeUri) {
              result.push(null)
              continue
            }
            const resource = Uri.parse(item.scopeUri)
            const config = Workspace.getConfiguration('eslint', resource.fsPath)
            let workspaceFolder = resource.scheme === 'untitled'
              ? Workspace.workspaceFolders !== undefined ? Workspace.workspaceFolders[0] : undefined
              : Workspace.getWorkspaceFolder(resource.toString())
            const settings: ConfigurationSettings = {
              validate: Validate.off,
              packageManager: config.get('packageManager', 'npm'),
              useESLintClass: config.get('useESLintClass', false),
              experimental: {
                useFlatConfig: config.get<boolean>('experimental.useFlatConfig', false)
              },
              codeActionOnSave: {
                enable: false,
                mode: CodeActionsOnSaveMode.all
              },
              format: false,
              quiet: config.get('quiet', false),
              onIgnoredFiles: ESLintSeverity.from(config.get<string>('onIgnoredFiles', ESLintSeverity.off)),
              options: config.get('options', {}),
              rulesCustomizations: parseRulesCustomizations(config.get('rules.customizations')),
              run: config.get('run', 'onType'),
              nodePath: config.get<string | undefined>('nodePath', undefined) ?? null,
              workingDirectory: undefined,
              workspaceFolder: undefined,
              codeAction: {
                disableRuleComment: config.get('codeAction.disableRuleComment', { enable: true, location: 'separateLine' as 'separateLine' }),
                showDocumentation: config.get('codeAction.showDocumentation', { enable: true })
              }
            }
            const document: TextDocument | undefined = syncedDocuments.get(item.scopeUri)
            if (document === undefined) {
              result.push(settings)
              continue
            }
            if (config.get('enabled', true)) {
              settings.validate = computeValidate(document)
            }
            if (settings.validate !== Validate.off) {
              settings.format = !!config.get('format.enable', false)
              settings.codeActionOnSave.enable = !!config.get('autoFixOnSave', false) //readCodeActionsOnSaveSetting(document)
              settings.codeActionOnSave.mode = CodeActionsOnSaveMode.from(config.get('codeActionsOnSave.mode', CodeActionsOnSaveMode.all))
              settings.codeActionOnSave.rules = CodeActionsOnSaveRules.from(config.get('codeActionsOnSave.rules', null))
            }
            if (workspaceFolder != null) {
              settings.workspaceFolder = {
                name: workspaceFolder.name,
                uri: workspaceFolder.uri
              }
            }
            const workingDirectories = config.get<(string | LegacyDirectoryItem | DirectoryItem | PatternItem | ModeItem)[] | undefined>('workingDirectories', undefined)
            if (Array.isArray(workingDirectories)) {
              let workingDirectory: ModeItem | DirectoryItem | undefined = undefined
              const workspaceFolderPath = workspaceFolder && Uri.parse(workspaceFolder.uri).scheme === 'file' ? Uri.parse(workspaceFolder.uri).fsPath : undefined
              for (const entry of workingDirectories) {
                let directory: string | undefined
                let pattern: string | undefined
                let noCWD = false
                if (Is.string(entry)) {
                  directory = entry
                } else if (LegacyDirectoryItem.is(entry)) {
                  directory = entry.directory
                  noCWD = !entry.changeProcessCWD
                } else if (DirectoryItem.is(entry)) {
                  directory = entry.directory
                  if (entry['!cwd'] !== undefined) {
                    noCWD = entry['!cwd']
                  }
                } else if (PatternItem.is(entry)) {
                  pattern = entry.pattern
                  if (entry['!cwd'] !== undefined) {
                    noCWD = entry['!cwd']
                  }
                } else if (ModeItem.is(entry)) {
                  workingDirectory = entry
                  continue
                }

                let itemValue: string | undefined
                if (directory !== undefined || pattern !== undefined) {
                  const uri = Uri.parse(document.uri)
                  const filePath = uri.scheme === 'file' ? uri.fsPath : undefined
                  if (filePath !== undefined) {
                    if (directory !== undefined) {
                      directory = toOSPath(directory)
                      if (!path.isAbsolute(directory) && workspaceFolderPath !== undefined) {
                        directory = path.join(workspaceFolderPath, directory)
                      }
                      if (directory.charAt(directory.length - 1) !== path.sep) {
                        directory = directory + path.sep
                      }
                      if (filePath.startsWith(directory)) {
                        itemValue = directory
                      }
                    } else if (pattern !== undefined && pattern.length > 0) {
                      if (!path.posix.isAbsolute(pattern) && workspaceFolderPath !== undefined) {
                        pattern = path.posix.join(toPosixPath(workspaceFolderPath), pattern)
                      }
                      if (pattern.charAt(pattern.length - 1) !== path.posix.sep) {
                        pattern = pattern + path.posix.sep
                      }
                      const regExp: RegExp | undefined = convert2RegExp(pattern)
                      if (regExp !== undefined) {
                        const match = regExp.exec(filePath)
                        if (match !== null && match.length > 0) {
                          itemValue = match[0]
                        }
                      }
                    }
                  }
                }
                if (itemValue !== undefined) {
                  if (workingDirectory === undefined || ModeItem.is(workingDirectory)) {
                    workingDirectory = { directory: itemValue, '!cwd': noCWD }
                  } else {
                    if (workingDirectory.directory.length < itemValue.length) {
                      workingDirectory.directory = itemValue
                      workingDirectory['!cwd'] = noCWD
                    }
                  }
                }
              }
              settings.workingDirectory = workingDirectory
            }
            result.push(settings)
          }
          return result
        }
      }
    }
  }

  let client: LanguageClient
  try {
    client = new LanguageClient('ESLint', serverOptions, clientOptions)
  } catch (err) {
    void Window.showErrorMessage(`The ESLint extension couldn't be started. See the ESLint output channel for details.`)
    return
  }
  context.subscriptions.push(services.registLanguageClient(client))

  Workspace.registerAutocmd({
    request: true,
    event: 'BufWritePre',
    arglist: [`+expand('<abuf>')`],
    callback: async (bufnr: number) => {
      let doc = Workspace.getDocument(bufnr)
      if (!doc || !doc.attached) return
      if (computeValidate(doc.textDocument) == Validate.off) return
      const config = Workspace.getConfiguration('eslint', doc.uri)
      const onSaveTimeout = config.get<number>('fixOnSaveTimeout', 1000)
      if (config.get('autoFixOnSave', false)) {
        client.outputChannel.appendLine(`Auto fix on save for buffer: ${bufnr}`)
        const params: CodeActionParams = {
          textDocument: {
            uri: doc.uri
          },
          range: Range.create(0, 0, doc.textDocument.lineCount, 0),
          context: {
            only: [`${CodeActionKind.SourceFixAll}.eslint`],
            diagnostics: []
          },
        }
        const source = new CancellationTokenSource()
        let timer: NodeJS.Timeout
        let tf = new Promise<void>(resolve => {
          timer = setTimeout(() => {
            client.outputChannel.appendLine(`Auto fix timeout for buffer: ${bufnr}`)
            source.cancel()
            resolve()
          }, onSaveTimeout)
        })
        // await Promise.race
        let res = await Promise.race([tf, client.sendRequest(CodeActionRequest.type.method, params, source.token)])
        clearTimeout(timer)
        if (source.token.isCancellationRequested) return
        if (res && Array.isArray(res)) {
          if (CodeAction.is(res[0])) {
            client.outputChannel.appendLine(`Apply auto fix for buffer: ${bufnr}`)
            await Workspace.applyEdit(res[0].edit)
          }
        }
      }
    }
  })
  // client.registerProposedFeatures()

  Workspace.onDidChangeConfiguration(() => {
    probeFailed.clear()
    for (const textDocument of syncedDocuments.values()) {
      if (computeValidate(textDocument) === Validate.off) {
        try {
          const provider = (client as any).getFeature(DidCloseTextDocumentNotification.method).getProvider(textDocument)
          provider?.send(textDocument)
        } catch (err) {
          // A feature currently throws if no provider can be found. So for now we catch the exception.
        }
      }
    }
    for (const textDocument of Workspace.textDocuments) {
      if (!syncedDocuments.has(textDocument.uri.toString()) && computeValidate(textDocument) !== Validate.off) {
        try {
          const provider = (client as any).getFeature(DidOpenTextDocumentNotification.method).getProvider(textDocument)
          provider?.send(textDocument)
        } catch (err) {
          // A feature currently throws if no provider can be found. So for now we catch the exception.
        }
      }
    }
  })

  defaultErrorHandler = (client as any).createDefaultErrorHandler()
  client.onDidChangeState((event) => {
    if (event.newState === ClientState.Starting) {
      client.info('ESLint server is starting')
      serverRunning = undefined
    } else if (event.newState === ClientState.Running) {
      client.info(running)
      serverRunning = true
    } else {
      client.info(stopped)
      serverRunning = false
    }
    updateStatusBar(undefined)
  })

  const readyHandler = () => {
    client.onNotification(ShowOutputChannel.type, () => {
      client.outputChannel.show()
    })

    client.onNotification(StatusNotification.type, (params) => {
      updateDocumentStatus(params)
    })

    client.onNotification(exitCalled, (params) => {
      serverCalledProcessExit = true
      if (params[0] == 0) return
      client.error(`Server process exited with code ${params[0]}. This usually indicates a misconfigured ESLint setup.`, params[1])
      void Window.showErrorMessage(`ESLint server shut down itself. See 'ESLint' output channel for details.`, { title: 'Open Output', id: 1 }).then((value) => {
        if (value !== undefined && value.id === 1) {
          client.outputChannel.show()
        }
      })
    })

    client.onRequest(NoConfigRequest.type, (params) => {
      const uri = Uri.parse(params.document.uri)
      const workspaceFolder = Workspace.getWorkspaceFolder(params.document.uri)
      const fileLocation = uri.fsPath
      if (workspaceFolder) {
        client.warn([
          '',
          `No ESLint configuration (e.g .eslintrc) found for file: ${fileLocation}`,
          `File will not be validated. Consider running 'eslint --init' in the workspace folder ${workspaceFolder.name}`,
          `Alternatively you can disable ESLint by executing the 'Disable ESLint' command.`
        ].join('\n'))
      } else {
        client.warn([
          '',
          `No ESLint configuration (e.g .eslintrc) found for file: ${fileLocation}`,
          `File will not be validated. Alternatively you can disable ESLint by executing the 'Disable ESLint' command.`
        ].join('\n'))
      }

      updateDocumentStatus({ uri: params.document.uri, state: Status.error })
      return {}
    })

    client.onRequest(NoESLintLibraryRequest.type, (params) => {
      const key = 'noESLintMessageShown'
      const state = context.globalState.get<NoESLintState>(key, {})

      const uri: Uri = Uri.parse(params.source.uri)
      const workspaceFolder = Workspace.getWorkspaceFolder(uri.toString())
      const packageManager = Workspace.getConfiguration('eslint', uri.toString()).get('packageManager', 'npm')
      const localInstall = {
        npm: 'npm install eslint',
        pnpm: 'pnpm install eslint',
        yarn: 'yarn add eslint',
      }
      const globalInstall = {
        npm: 'npm install -g eslint',
        pnpm: 'pnpm install -g eslint',
        yarn: 'yarn global add eslint'
      }
      const isPackageManagerNpm = packageManager === 'npm'
      interface ButtonItem extends MessageItem {
        id: number
      }
      const outputItem: ButtonItem = {
        title: 'Go to output',
        id: 1
      }
      if (workspaceFolder) {
        client.info([
          '',
          `Failed to load the ESLint library for the document ${uri.fsPath}`,
          '',
          `To use ESLint please install eslint by running ${localInstall[packageManager]} in the workspace folder ${workspaceFolder.name}`,
          `or globally using '${globalInstall[packageManager]}'. You need to reopen the workspace after installing eslint.`,
          '',
          isPackageManagerNpm ? 'If you are using yarn or pnpm instead of npm set the setting `eslint.packageManager` to either `yarn` or `pnpm`' : null,
          `Alternatively you can disable ESLint for the workspace folder ${workspaceFolder.name} by executing the 'Disable ESLint' command.`
        ].filter((str => (str !== null))).join('\n'))

        if (state.workspaces === undefined) {
          state.workspaces = {}
        }
        if (!state.workspaces[workspaceFolder.uri.toString()]) {
          state.workspaces[workspaceFolder.uri.toString()] = true
          void context.globalState.update(key, state)
          void Window.showInformationMessage(`Failed to load the ESLint library for the document ${uri.fsPath}. See the output for more information.`, outputItem).then((item) => {
            if (item && item.id === 1) {
              client.outputChannel.show(true)
            }
          })
        }
      } else {
        client.info([
          `Failed to load the ESLint library for the document ${uri.fsPath}`,
          `To use ESLint for single JavaScript file install eslint globally using '${globalInstall[packageManager]}'.`,
          isPackageManagerNpm ? 'If you are using yarn or pnpm instead of npm set the setting `eslint.packageManager` to either `yarn` or `pnpm`' : null,
          'You need to reopen VS Code after installing eslint.',
        ].filter((str => (str !== null))).join('\n'))

        if (!state.global) {
          state.global = true
          void context.globalState.update(key, state)
          void Window.showInformationMessage(`Failed to load the ESLint library for the document ${uri.fsPath}. See the output for more information.`, outputItem).then((item) => {
            if (item && item.id === 1) {
              client.outputChannel.show(true)
            }
          })
        }
      }
      return {}
    })

    client.onRequest(OpenESLintDocRequest.type, async (params) => {
      await Commands.executeCommand('vscode.open', Uri.parse(params.url))
      return {}
    })

    client.onRequest(ProbeFailedRequest.type, (params) => {
      probeFailed.add(params.textDocument.uri)
      const closeFeature = (client as any).getFeature(DidCloseTextDocumentNotification.method)
      for (const document of Workspace.textDocuments) {
        if (document.uri.toString() === params.textDocument.uri) {
          closeFeature.getProvider(document)?.send(document)
        }
      }
    })
  }

  client.onReady().then(readyHandler).catch((error) => client.error(`On ready failed`, error))

  if (onActivateCommands) {
    onActivateCommands.forEach(command => command.dispose())
    onActivateCommands = undefined
  }

  context.subscriptions.push(
    events.on('BufEnter', () => {
      updateStatusBar(undefined)
    }),
    Workspace.onDidCloseTextDocument((document) => {
      const uri = document.uri.toString()
      documentStatus.delete(uri)
      updateStatusBar(undefined)
    }),
    Commands.registerCommand('eslint.executeAutofix', async () => {
      const doc = await Workspace.document
      if (!doc || !doc.attached) {
        return
      }
      const textDocument: VersionedTextDocumentIdentifier = {
        uri: doc.uri,
        version: doc.version
      }
      const params: ExecuteCommandParams = {
        command: 'eslint.applyAllFixes',
        arguments: [textDocument]
      }
      await client.onReady()
      client.sendRequest(ExecuteCommandRequest.type.method, params).then(undefined, () => {
        void Window.showErrorMessage('Failed to apply ESLint fixes to the document. Please consider opening an issue with steps to reproduce.')
      })
    }),
    Commands.registerCommand('eslint.showOutputChannel', async () => {
      client.outputChannel.show()
    }),
    Commands.registerCommand('eslint.restart', async () => {
      await client.stop()
      // Wait a little to free debugger port. Can not happen in production
      // So we should add a dev flag.
      const start = () => {
        client.start()
        client.onReady().then(readyHandler).catch((error) => client.error(`On ready failed`, error))
      }
      if (isInDebugMode()) {
        setTimeout(start, 1000)
      } else {
        start()
      }
    })
  )
}
