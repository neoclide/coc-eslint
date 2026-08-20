import { WorkspaceChange } from 'vscode-languageserver/node'

export interface ChangeCommandParams {
  uri: string
  version: number
  ruleId?: string
  sequence?: number
}

export function getCommandParams(args: readonly unknown[] | undefined): ChangeCommandParams | undefined {
  const value = args?.[0]
  if (value === null || typeof value !== 'object') return undefined
  const candidate = value as Record<string, unknown>
  if (typeof candidate.uri !== 'string' || typeof candidate.version !== 'number') return undefined
  return {
    uri: candidate.uri,
    version: candidate.version,
    ruleId: typeof candidate.ruleId === 'string' ? candidate.ruleId : undefined,
    sequence: typeof candidate.sequence === 'number' ? candidate.sequence : undefined
  }
}

/** Stores edits only for the document/version that produced them. */
export class Changes {
  private readonly values = new Map<string, WorkspaceChange>()
  private uri: string | undefined
  private version: number | undefined

  public clear(textDocument?: { uri: string; version: number }): void {
    this.uri = textDocument?.uri
    this.version = textDocument?.version
    this.values.clear()
  }

  public isUsable(uri: string, version: number): boolean {
    return this.uri === uri && this.version === version
  }

  public set(key: string, change: WorkspaceChange): void {
    this.values.set(key, change)
  }

  public get(key: string): WorkspaceChange | undefined {
    return this.values.get(key)
  }

  public key(command: string, params: ChangeCommandParams): string {
    return `${command}:${params.uri}:${params.version}:${params.ruleId ?? ''}:${params.sequence ?? ''}`
  }
}

export function isCachedCommand(command: string): boolean {
  return command === 'eslint.applySingleFix'
    || command === 'eslint.applySuggestion'
    || command === 'eslint.applySameFixes'
    || command === 'eslint.applyDisableLine'
    || command === 'eslint.applyDisableFile'
}
