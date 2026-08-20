/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import {
  commands as Commands, Disposable, ExtensionContext,
  LanguageClient,
  State,
  TextDocument,
  Uri,
  window as Window,
  workspace as Workspace
} from 'coc.nvim';
import fs from 'fs';
import path from 'path';


import { Validate } from './shared/settings';

import EslintTask from './task'
import { ESLintClient, Validator } from './client';
import { findEslint } from './node-utils';
import { pickFolder } from './vscode-utils';

const eslintConfigFiles = [
  '.eslintrc.js', '.eslintrc.cjs', '.eslintrc.yaml', '.eslintrc.yml', '.eslintrc', '.eslintrc.json',
  'eslint.config.js', 'eslint.config.mjs', 'eslint.config.cjs', 'eslint.config.ts', 'eslint.config.mts', 'eslint.config.cts'
];

export function hasEslintConfig(root: string): boolean {
  return eslintConfigFiles.some(configFile => fs.existsSync(path.join(root, configFile)));
}

function createDefaultConfiguration(): void {
  const folders = Workspace.workspaceFolders;
  if (!folders || folders.length === 0) {
    void Window.showErrorMessage('An ESLint configuration can only be generated if VS Code is opened on a workspace folder.');
    return;
  }
  const noConfigFolders = folders.filter(folder => {
    return !hasEslintConfig(Uri.parse(folder.uri).fsPath);
  });
  if (noConfigFolders.length === 0) {
    if (folders.length === 1) {
      void Window.showInformationMessage('The workspace already contains an ESLint configuration file.');
    } else {
      void Window.showInformationMessage('All workspace folders already contain an ESLint configuration file.');
    }
    return;
  }
  void pickFolder(noConfigFolders, 'Select a workspace folder to generate a ESLint configuration for').then(async (folder) => {
    if (!folder) {
      return;
    }
    const folderRootPath = Uri.parse(folder.uri).fsPath;
    const terminal = await Window.createTerminal({
      name: `ESLint init`,
      cwd: folderRootPath
    });
    const eslintCommand = await findEslint(folderRootPath);
    terminal.sendText(`${eslintCommand} --init`);
    terminal.show();
  });
}

let onActivateCommands: Disposable[] | undefined;
let delayedActivationDisposables: Disposable[] | undefined;
let client: LanguageClient;
// const taskProvider: TaskProvider = new TaskProvider();
const validator: Validator = new Validator();

export function activate(context: ExtensionContext) {

  function didOpenTextDocument(textDocument: TextDocument) {
    if (activated) {
      return;
    }
    if (validator.check(textDocument) !== Validate.off) {
      openListener.dispose();
      configurationListener.dispose();
      delayedActivationDisposables = undefined;
      activated = true;
      realActivate(context);
    }
  }

  function configurationChanged() {
    if (activated) {
      return;
    }
    for (const textDocument of Workspace.textDocuments) {
      if (validator.check(textDocument) !== Validate.off) {
        openListener.dispose();
        configurationListener.dispose();
        delayedActivationDisposables = undefined;
        activated = true;
        realActivate(context);
        return;
      }
    }
  }

  let activated: boolean = false;
  const openListener: Disposable = Workspace.onDidOpenTextDocument(didOpenTextDocument);
  const configurationListener: Disposable = Workspace.onDidChangeConfiguration(configurationChanged);
  delayedActivationDisposables = [openListener, configurationListener];
  context.subscriptions.push(openListener, configurationListener);

  const notValidating = () => {
    const enabled = Workspace.getConfiguration('eslint', Window.activeTextEditor?.document).get('enable', true);
    if (!enabled) {
      void Window.showInformationMessage(`ESLint is not running because the deprecated setting 'eslint.enable' is set to false. Remove the setting and use the extension disablement feature.`);
    } else {
      void Window.showInformationMessage('ESLint is not running. By default only TypeScript and JavaScript files are validated. If you want to validate other file types please specify them in the \'eslint.probe\' setting.');
    }
  };
  onActivateCommands = [
    Commands.registerCommand('eslint.executeAutofix', notValidating),
    Commands.registerCommand('eslint.showOutputChannel', notValidating),
    Commands.registerCommand('eslint.migrateSettings', notValidating),
    Commands.registerCommand('eslint.restart', notValidating),
    Commands.registerCommand('eslint.revalidate', notValidating)
  ];

  context.subscriptions.push(
    Commands.registerCommand('eslint.createConfig', createDefaultConfiguration)
  );

  context.subscriptions.push(new EslintTask())
  configurationChanged();
}

function realActivate(context: ExtensionContext): void {

  if (onActivateCommands) {
    onActivateCommands.forEach(command => command.dispose());
    onActivateCommands = undefined;
  }

  let acknowledgePerformanceStatus: () => void;
  [client, acknowledgePerformanceStatus] = ESLintClient.create(context, validator);

  context.subscriptions.push(
    Commands.registerCommand('eslint.showOutputChannel', async () => {
      client.outputChannel.show();
      acknowledgePerformanceStatus();
    }),
    Commands.registerCommand('eslint.migrateSettings', () => {
      void ESLintClient.migrateSettings(client);
    }),
    Commands.registerCommand('eslint.restart', async () => {
      if (client.state === State.StartFailed) {
        await client.dispose();
        [client, acknowledgePerformanceStatus] = ESLintClient.create(context, validator);
        return client.start().then(() => {
          client.info('ESLint server restarted.');
        }).catch((error) => client.error('Starting the server failed.', error, 'force'));
      }
      return client.restart().then(() => {
        client.info('ESLint server restarted.');
      }).catch((error) => client.error('Restarting client failed', error, 'force'));
    }),
    Commands.registerCommand('eslint.revalidate', () => {
      let feature = client.getFeature('textDocument/diagnostic')
      if (typeof feature.refresh === 'function') feature.refresh()
    })
  );

  client.start().catch((error) => {
    client.error(`Starting the server failed.`, error, 'force');
    const message = typeof error === 'string' ? error : typeof error.message === 'string' ? error.message : undefined;
    if (message !== undefined && message.indexOf('ENOENT') !== -1) {
      client.info(`PATH environment variable is: ${process.env['PATH']}`);
    }
  });
}

export function deactivate(): Promise<void> {
  delayedActivationDisposables?.forEach(disposable => disposable.dispose());
  delayedActivationDisposables = undefined;
  if (onActivateCommands !== undefined) {
    onActivateCommands.forEach(command => command.dispose());
  }
  ESLintClient.dispose();
  return client !== undefined ? client.stop() : Promise.resolve();
}
