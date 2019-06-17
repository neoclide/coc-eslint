import fastDiff from 'fast-diff'
import { TextDocument, TextEdit } from 'vscode-languageserver'
import { CLIOptions, TextDocumentSettings } from './types'
import { URI } from 'vscode-uri'
import resolveFrom from 'resolve-from'

interface Change {
  start: number
  end: number
  newText: string
}

export function getAllFixEdits(textDocument: TextDocument, settings: TextDocumentSettings): TextEdit[] {
  let u = URI.parse(textDocument.uri)
  if (u.scheme != 'file') return []
  let content = textDocument.getText()
  let newOptions: CLIOptions = Object.assign(
    {},
    settings.options,
    {
      fix: true
    },
  )
  let filename = URI.parse(textDocument.uri).fsPath
  let engine = new settings.library.CLIEngine(newOptions)
  let res = engine.executeOnText(content, filename)
  if (!res.results.length) return []
  let { output } = res.results[0]
  if (output == null) return []
  let change = getChange(content, output)
  return [{
    range: {
      start: textDocument.positionAt(change.start),
      end: textDocument.positionAt(change.end)
    },
    newText: change.newText
  }]
}

export function getChange(oldStr: string, newStr: string): Change {
  let result = fastDiff(oldStr, newStr, 1)
  let curr = 0
  let start = -1
  let end = -1
  let newText = ''
  let remain = ''
  for (let item of result) {
    let [t, str] = item
    // equal
    if (t == 0) {
      curr = curr + str.length
      if (start != -1) remain = remain + str
    } else {
      if (start == -1) start = curr
      if (t == 1) {
        newText = newText + remain + str
        end = curr
      } else {
        newText = newText + remain
        end = curr + str.length
      }
      remain = ''
      if (t == -1) curr = curr + str.length
    }
  }
  return { start, end, newText }
}

export function resolveModule(name: string, localPath: string, globalPath: string): Promise<string> {
  if (localPath) {
    let path = resolveFrom.silent(localPath, name)
    if (path) return Promise.resolve(path)
  }
  try {
    let path = resolveFrom(globalPath, name)
    return Promise.resolve(path)
  } catch (e) {
    return Promise.reject(e)
  }
}
