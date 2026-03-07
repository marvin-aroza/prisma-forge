# @prismforge/token-cli

## 0.6.0

### Minor Changes

- 3545f16: Add `prismforge init --mode embedded` for existing repositories, with support for:

  - embedding the PrismForge workspace into a project path (`--embedded-path`, default `tools/prismforge`),
  - automatic root script wiring (`prismforge:install`, `prismforge:dev`, `prismforge:build`, `prismforge:test`),
  - interactive mode selection (`standalone` or `embedded`) in the init wizard.

## 0.5.1

### Patch Changes

- 35f2963: Fix `prismforge init` dependency installation on Windows/npm environments by improving command execution fallback for package manager commands.

## 0.5.0

### Minor Changes

- d5a921f: Improve `prismforge init` for real-world consumer repos by:

  - auto-detecting git provider, repository, and base branch from `origin` when available,
  - allowing empty repository values for new workspaces,
  - supporting package manager-aware scaffolding and install flows (`npm` and `pnpm`),
  - adding more resilient template fetch fallbacks.

## 0.4.0

### Minor Changes

- cad25f3: Enhance `prismforge init` with smarter onboarding defaults:

  - auto-detect git provider/repository/base branch from `origin` when running inside an existing git repository,
  - allow empty repository values for brand-new workspaces and defer repo setup to `.env.local`,
  - improve template fetch resilience by trying configured fallback template repositories.

## 0.3.0

### Minor Changes

- 07face8: Improve `prismforge init` for external consumers with an interactive setup flow (targets + optional Token Studio) and tokens-only scaffold support. Also fix CLI startup module resolution by lazy-loading runtime token modules so `npx @prismforge/token-cli` works outside the monorepo.

## 0.2.0

### Minor Changes

- 0c5a212: Add an interactive `prismforge init` wizard that asks for provider, repository, token targets, and optional Token Studio inclusion. Extend non-interactive init flags with `--targets` and `--studio`, and support tokens-only workspace scaffolds for consumers who do not want the Studio UI.

## 0.1.1

### Patch Changes

- 2dac624: Release infrastructure and quality hardening for PrismForge v0.1.x:

  - add release preflight + breaking-change semver guardrails
  - strengthen CI/release workflows and operator checklists
  - expand CLI release/diff test coverage
  - improve token mapping and studio verification coverage
