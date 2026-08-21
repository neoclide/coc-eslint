# coc-eslint

Eslint language server extension for [coc.nvim](https://github.com/neoclide/coc.nvim).

Forked from [vscode-eslint](https://github.com/Microsoft/vscode-eslint).

## Install

In your vim/neovim run the following command:

```sh
:CocInstall coc-eslint
```

`eslint` and a config file must be available, for example:

```sh
npm install eslint --global
```

Example config file, in the root of the project: `eslint.config.mjs`:

```javascript
export default [
	{
		rules: {
			"prefer-const": "error",
			"no-undef": "error"
		}
	}
];
```

## Important notice

* This extension may not work with files just created, save the file and execute
  `:CocCommand eslint.restart` on that case.
* The eslint config file should inside your workspace folder for project lint to
  work `:h coc-workspace-folders`.
* Configuration `eslint.probe` is ignored when `eslint.validate` exists, configure
  `eslint.validate` for your project is recommended.
* `eslint.autoFixOnSave` is deprecated, use `:CocCommand eslint.migrateSettings`
  for migrate to new configuration by use `editor.codeActionsOnSave` configuration.
* `eslint.useFlatConfig` default to true and can't be turned off, consider
  migrate your old configuration to use flat config instead.

## Features

- Lint `javascript` files using eslint.
- Provide `codeActions` for fixing lint issues.
- Provide eslint commands:
  - `eslint.lintProject` Lint current project and set errors & warnings to vim's quickfix list.
  - `eslint.executeAutofix` Fix all auto-fixable Problems
  - `eslint.createConfig` Create ESLint configuration
  - `eslint.showOutputChannel` Show Output Channel
  - `eslint.migrateSettings` Migrate Settings
  - `eslint.restart` Restart ESLint Server
  - `eslint.revalidate` Revalidate all open files

## Differences with vscode-eslint

- Option `eslint.lintTask.enable` not exists, use `:CocCommand eslint.lintProject` to run eslint for current project.

## Configuration options

**Notice** these configuration settings allow you to configure the behaviour of the coc-eslint extension. They should be set in your `coc-settings.json` file, which can be opened with the `:CocConfig` command.

- `eslint.enable`: Controls whether eslint is enabled or not.  Default: `true`
- `eslint.packageManager`: The package manager you use to install node modules.  Default: `"npm"`
    Valid options: ["npm","yarn","pnpm"]
- `eslint.alwaysShowStatus`: Always show the ESlint status bar item.  Default: `false`
- `eslint.fixOnSaveTimeout`: Timeout in miliseconds when run auto fix on save.  Default: `1000`
- `eslint.nodeEnv`: The value of `NODE_ENV` to use when running eslint tasks.  Default: `null`
- `eslint.nodePath`: A path added to `NODE_PATH` when resolving the eslint module.  Default: `null`
- `eslint.options`: The eslint options object to provide args normally passed to eslint when executed from a command line (see https://eslint.org/docs/developer-guide/nodejs-api#eslint-class).  Default: `{}`
- `eslint.trace.server`: Traces the communication between VSCode and the eslint linter service.  Default: `"off"`
- `eslint.run`: Run the linter on save (onSave) or on type (onType)  Default: `"onType"`
    Valid options: ["onSave","onType"]
- `eslint.autoFixOnSave`: Turns auto fix on save on or off.  Default: `false`
- `eslint.quiet`: Turns on quiet mode, which ignores warnings and info diagnostics.  Default: `false`
- `eslint.bulkSuppression.enable`: Show file-level bulk-suppressed violations. Requires ESLint 10.1 or later.  Default: `false`
- `eslint.bulkSuppression.location`: Path to the suppressions file relative to the workspace.
- `eslint.bulkSuppression.severity`: Diagnostic severity for bulk-suppressed violations.  Default: `"info"`
- `eslint.onIgnoredFiles`: Whether ESLint should issue a warning on ignored files.  Default: `"off"`
    Valid options: ["warn","off"]
- `eslint.useESLintClass`: Since version 7 ESLint offers a new API call ESLint. Use it even if the old CLIEngine is available. From version 8 on forward on ESLint class is available.  Default: `false`
- `eslint.experimental.useFlatConfig`: Enables support of experimental Flat Config (aka eslint.config.js, supported by ESLint version 8.21 or later).  Default: `false`
- `eslint.useRealpaths`: Whether ESLint should use real paths when resolving files. This is useful when working with symlinks or when the casing of file paths is inconsistent.  Default: `false`
- `eslint.workingDirectories`: Specifies how the working directories ESLint is using are computed. ESLint resolves configuration files (e.g. `eslintrc`, `.eslintignore`) relative to a working directory so it is important to configure this correctly.
- `eslint.validate`: An array of language ids which should be validated by ESLint. If not installed ESLint will show an error.
- `eslint.probe`: An array of language ids for which the extension should probe if support is installed.  Default: `["astro","civet","javascript","javascriptreact","typescript","typescriptreact","css","glimmer-js","glimmer-ts","html","mdx","svelte","vue","markdown","json","jsonc","graphql"]`
- `eslint.runtime`: The location of the node binary to run ESLint under.  Default: `null`
- `eslint.debug`: Enables ESLint debug mode (same as `--debug` on the command line)  Default: `false`
- `eslint.execArgv`: Additional exec argv argument passed to the runtime. This can for example be used to control the maximum heap space using --max_old_space_size  Default: `null`
- `eslint.codeAction.disableRuleComment`: Show disable lint rule in the quick fix menu.  Default: `{"enable":true,"location":"separateLine"}`
- `eslint.codeAction.showDocumentation`: Show open lint rule documentation web page in the quick fix menu.  Default: `{"enable":true}`
- `eslint.codeActionsOnSave.mode`: Specifies the code action mode. Possible values are 'all' and 'problems'.  Default: `"all"`
    Valid options: ["all","problems"]
- `eslint.codeActionsOnSave.rules`: The rules that should be executed when computing the code actions on save or formatting a file. Defaults to the rules configured via the ESLint configuration  Default: `null`
- `eslint.codeActionsOnSave.options`: The ESLint options object to use on save. Rules configured with `eslint.codeActionsOnSave.rules` take priority.  Default: `{}`
- `eslint.format.enable`: Enables ESLint as a formatter.  Default: `false`
- `eslint.rules.customizations`: Override the severity of one or more rules reported by this extension, regardless of the project's ESLint config. Use globs to apply default severities for multiple rules.
- `eslint.lintTask.options`: Command line options applied when running the task for linting the whole workspace (see https://eslint.org/docs/user-guide/command-line-interface).  Default: `["."]`
- `eslint.lintTask.command`: The command used to lint the whole workspace. When unset, coc-eslint detects the workspace ESLint executable.  Default: `null`
- `eslint.problems.shortenToSingleLine`: Shortens the text spans of underlined problems to their first related line.  Default: `false`
- `eslint.migration.2_x`: Whether ESlint should migrate auto fix on save settings.  Default: `"on"`
    Valid options: ["off","on"]
- `eslint.useFlatConfig`: Controls whether flat config should be used or not. This setting requires ESLint version 8.57 or later and is interpreted according to the [ESLint Flat Config rollout plan](https://eslint.org/blog/2023/10/flat-config-rollout-plans/). This means:   - *8.57.0 <= ESLint version < 9.x*: setting is honored and defaults to false - *9.0.0 <= ESLint version < 10.x*: settings is honored and defaults to true - *10.0.0 <= ESLint version*: setting is ignored. Flat configs are the default and can't be turned off.  Default: `null`
- `eslint.ignoreUntitled`: If true, untitled files won't be validated by ESLint.  Default: `false`
- `eslint.timeBudget.onValidation`: The time budget in milliseconds to spend on validation before showing a warning or error.  Default: `{"warn":4000,"error":8000}`
- `eslint.timeBudget.onFixes`: The time budget in milliseconds to spend on computing fixes before showing a warning or error.  Default: `{"warn":3000,"error":6000}`

## Auto-fixing

The extension supports automatic fixing of warnings to the extent that it is supported by eslint.
For warnings which support an auto-fix. You can apply the quick fix by either:

- Configure `editor.codeActionsOnSave` with property `"source.fixAll.eslint": true`.
- ~Set `eslint.autoFixOnSave` to `true` and save your file~
- Trigger `<Plug>(coc-codeaction)` with mapped keys, and select a fix action in the input list.
- Run command `:CocCommand eslint.executeAutofix`.
- Trigger command `eslint.executeAutofix` from `:CocCommand`.

## Supporting

### ESLint dependency

`coc-eslint` loads the ESLint library from the current workspace when possible;
it does not bundle ESLint or project-specific ESLint plugins and configurations.
Install `eslint`, its plugins, and shared configurations in the workspace that
contains the files being linted. If no workspace installation can be resolved,
the extension falls back to the global package location for the configured
`eslint.packageManager`. You can also set `eslint.nodePath` to the directory
that contains a resolvable ESLint installation.

## License

MIT
