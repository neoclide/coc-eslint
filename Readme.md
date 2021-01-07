# coc-eslint

Eslint language server extension for [coc.nvim](https://github.com/neoclide/coc.nvim).

Forked from [vscode-eslint](https://github.com/Microsoft/vscode-eslint).

**Note** invoke `eslint.showOutputChannel` to invoke command of current eslint statusline.

## Supporting

If you like my extension, consider supporting me on Patreon or PayPal:

<a href="https://www.patreon.com/chemzqm"><img src="https://c5.patreon.com/external/logo/become_a_patron_button.png" alt="Patreon donate button" /> </a>
<a href="https://www.paypal.com/paypalme/chezqm"><img src="https://werwolv.net/assets/paypal_banner.png" alt="PayPal donate button" /> </a>

## Install

In your vim/neovim run the following command:

```sh
:CocInstall coc-eslint
```

## Features

- Lint `javascript` files using eslint.
- Provide `codeActions` for fixing lint issues.
- Provide eslint commands:
  - `eslint.executeAutofix` Fix all auto-fixable Problems.
  - `eslint.createConfig` Create ESLint configuration.
  - `eslint.showOutputChannel` Show Output Channel.
  - `eslint.resetLibraryExecution` Reset Library Execution Decisions.
  - `eslint.manageLibraryExecution` Manage Library Execution.
  - `eslint.lintProject` Run eslint for current project, add errors to quickfix list.

## Configuration options

**Notice** these configuration settings allow you to configure the behaviour of the coc-eslint extension. They should be set in your `coc-settings.json` file, which can be opened with the `:CocConfig` command.

- `eslint.enable`: Controls whether eslint is enabled or not. default: `true`
- `eslint.execArgv`: Arguments of node used on language server start. default: `[]`
- `eslint.packageManager`: The package manager you use to install node modules. default: `"npm"`
  Valid options: ["npm","yarn","pnpm"]
- `eslint.alwaysShowStatus`: Always show the ESlint status bar item. default: `false`
- `eslint.nodeEnv`: The value of `NODE_ENV` to use when running eslint tasks. default: `null`
- `eslint.nodePath`: A path added to `NODE_PATH` when resolving the eslint module. default: `null`
- `eslint.options`: The eslint options object to provide args normally passed to eslint when executed from a command line (see http://eslint.org/docs/developer-guide/nodejs-api#cliengine). default: `{}`
- `eslint.trace.server`: Traces the communication between VSCode and the eslint linter service. default: `"off"`
- `eslint.run`: Run the linter on save (onSave) or on type (onType) default: `"onType"`
  Valid options: ["onSave","onType"]
- `eslint.autoFixOnSave`: Turns auto fix on save on or off. default: `false`
- `eslint.quiet`: Turns on quiet mode, which ignores warnings. default: `false`
- `eslint.onIgnoredFiles`: Whether ESLint should issue a warning on ignored files. default: `"off"`
  Valid options: ["warn","off"]
- `eslint.workingDirectories`: Working directories for files in different folders.
- `eslint.validate`: An array of language ids which should be validated by ESLint. If not installed ESLint will show an error.
- `eslint.probe`: An array of language ids for which the extension should probe if support is installed. default: `["javascript","javascriptreact","typescript","typescriptreact","html","vue","markdown"]`
- `eslint.runtime`: The location of the node binary to run ESLint under. default: `null`
- `eslint.debug`: Enables ESLint debug mode (same as --debug on the command line) default: `false`
- `eslint.codeAction.disableRuleComment`: default: `{"enable":true,"location":"separateLine"}`
- `eslint.codeAction.showDocumentation`: default: `{"enable":true}`
- `eslint.codeActionsOnSave.mode`: Specifies the code action mode. Possible values are 'all' and 'problems'. default: `"all"`
  Valid options: ["all","problems"]
- `eslint.format.enable`: Enables ESLint as a formatter. default: `false`
- `eslint.lintTask.options`: Command line options applied when running the task for linting the whole workspace (see https://eslint.org/docs/user-guide/command-line-interface). default: `["."]`

## Auto-fixing

The extension supports automatic fixing of warnings to the extent that it is supported by eslint.
For warnings which support an auto-fix. You can apply the quick fix by either:

- Set `eslint.autoFixOnSave` to `true` and save your file (recommended).
- Trigger `<Plug>(coc-codeaction)` with mapped keys, and select a fix action in the input list.
- Run command `:CocCommand eslint.executeAutofix`.
- Trigger command `eslint.executeAutofix` from `:CocCommand`.

## License

MIT
