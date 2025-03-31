
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
