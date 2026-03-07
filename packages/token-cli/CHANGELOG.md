# @prismforge/token-cli

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
