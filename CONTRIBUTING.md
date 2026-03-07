# Contributing to PrismForge

## Principles

- Git is the source of truth for tokens.
- Token changes must be validated by schema and mapping checks.
- Breaking token changes require changelog entries and migration notes.
- Publish boundaries are defined in `docs/PUBLISHING.md`.

## Local setup

```bash
corepack enable pnpm
pnpm install
pnpm validate
pnpm test
```

## Workflow

1. Create a branch.
2. Add or modify tokens/mappings with required metadata.
3. Run `prismforge validate` and tests.
4. Add a changeset (stable or next).
5. Open PR with screenshots from Token Studio if UI-related.
6. If token IDs were removed, include a `major` changeset (enforced by CI guard).

## Releases

- Release workflow: `.github/workflows/release.yml`.
- Run via GitHub Actions `workflow_dispatch`.
- Channels:
  - `stable`: publishes with npm tag `latest`.
  - `next`: publishes with npm tag `next`.
  - `alpha|beta|rc|canary`: publish to matching prerelease tags.
  - `custom`: publish to any custom npm dist-tag (requires `dist_tag` input).
- Use `dry_run=true` first to validate guard/test/build without publish.
- For publish, set repository secret `NPM_TOKEN`.
- Follow the operator checklist: `docs/RELEASE_CHECKLIST.md`.
- If release fails or is partial, file `.github/ISSUE_TEMPLATE/release-incident.md`.

## Community and security

- Follow `CODE_OF_CONDUCT.md`.
- Report vulnerabilities using `SECURITY.md` guidance.

## Token naming

Use: `namespace.category.intent.variant.state`

Examples:

- `dk.color.surface.default.base.enabled`
- `dk.spacing.layout.container.default.base`
- `dk.motion.duration.fast.default.base`

## Required metadata

Each token must include:

- `id`
- `$type`
- `$value`
- `description`
- `brand`
- `mode`
- `state`
- `category`
- `deprecated`
- `since`
- `tags`


