## 3.1.3

- Merge pull request #160 from neoclide/codex/upstream-sync-20261003 (ca49ba9)
- fix(build): fail CI when esbuild rejects (e1d5b85)
- ci: validate pull requests with Vim and Neovim (101e3b5)
- docs(agents): add task branch workflow instructions (b5e348c)
- Resolve release 3.1.2 conflicts and preserve empty diagnostic keys (6abe321)
- Sync ESLint server dependencies with upstream patches (bb69dc3)

## Unreleased

- Update ESLint server protocol and utility dependencies to the reviewed upstream patch versions.
- Support markup diagnostic messages when computing stable code-action keys.

## 3.1.2

- fix release.yml (994c937)
- not use npm whoami (b86f40d)
- improve npmignore (65d1a70)

## 3.1

- Added ESLint 10 flat-config support and related compatibility warnings.
- Added bulk suppressions diagnostics for ESLint ≥10.1.
- Added probing support for more languages and ESLint plugins.
- Added `eslint.useRealpaths` for improved symlink/path resolution.
- Added `eslint.codeActionsOnSave.options`.
- Added `eslint.lintTask.command` for custom project lint commands.
- Fixed code actions being applied to the wrong rule, document, or version.
- Fixed duplicate listeners and status bars after ESLint restarts.
- Improved global ESLint lookup, including pnpm failure handling.
- Fixed `eslint.lintProject` quickfix population using JSON output.
- Improved nested workspace, monorepo, and flat-config resolution.
- Added an automated release workflow; nothing has been pushed or published yet.

## 3.0.13

- Remove configuration `eslint.fixOnSaveTimeout`
- Add commands `eslint.migrateSettings`, `eslint.revalidate`
- Add configurations:
  - `eslint.problems.shortenToSingleLine`
  - `eslint.migration.2_x`
  - `eslint.ignoreUntitled`
  - `eslint.useFlatConfig`
  - `eslint.timeBudget.onValidation`
  - `eslint.timeBudget.onFixes`
- Flat config is used by default, you may need to configure `eslint.config.js`
  in your home folder to make it works for all of your files.
