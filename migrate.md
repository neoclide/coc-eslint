# Upstream synchronization — 2026-10-03

Reviewed microsoft/vscode-eslint `f5e644a38575bdc652856be6c8e45559b18f52ad..1f98cf2eb61f768879fe7c0f02ee456121b3f38b` (origin/main fetched 2026-10-03).

- Adopted server dependency updates from `2ec7b76`: vscode-languageserver 10.1.1, textdocument 1.0.14, vscode-uri 3.2.0, semver 7.8.5. Aligned direct protocol to the upstream server lockfile's 3.18.3, removing incompatible duplicate RPC types.
- Adapted diagnostic hashing to accept the protocol's markup message type while retaining text-based key identity; added a regression test for plain/markup equivalence, different text and different rules.
- `3745b0d` uses VS Code languageclient `stdioOptions`/LogOutputChannel. Coc exposes neither; its language client already appends stderr directly with a Stderr label rather than treating debug lines as errors. Retained this existing output behavior and transport/lifecycle.
- Omitted VS Code CI migration (`1f98cf2`), client languageclient dependency, upstream lint/webpack development dependencies and playground lockfile updates (`2d7eac4`, `b952bca`, `6b1732a`, `23a05df`, `bd23869`, `d0d2cab`); these packages/configurations are not used here. Existing esbuild already matches upstream 0.28.2.

Validation: baseline build passed; baseline typecheck failed on duplicate protocol/RPC types and markup diagnostic hashing. After alignment and fix, build and TypeScript check pass; Neovim 14/14 and Vim 14/14 integration tests pass using local coc.nvim. Vim initially required escalation for its local Unix socket. Coc contract comparison and git diff --check pass. Existing commands, settings, save behavior, quickfix integration, adapters and lifecycle remain unchanged.

## PR #160 follow-up

Integrated release 3.1.2 (`bf4173ae9d7141f221f9c55e3ace0e04a7744626`): history.md retains both the Unreleased port notes and 3.1.2 release notes; package.json/package-lock.json use version 3.1.2 while retaining the port's dependency graph.

Addressed review `discussion_r4171443569`: extract diagnostic message text before testing emptiness, so plain empty strings and empty Markdown/plaintext messages retain the original unhashed empty key. Added a regression covering all three forms.

Validation: build and TypeScript checks pass; Neovim 15/15 and Vim 15/15 integration tests pass using local coc.nvim. Manifest/lockfile versions and dependency specs match; git diff --check passes.
