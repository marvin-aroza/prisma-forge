# PrismForge

PrismForge is an open-source, token-platform-first design solution for multi-brand and multi-mode products.

## What this repository provides

- Canonical DTCG JSON tokens as source of truth.
- Layered token model: reference -> semantic -> component aliases.
- Deterministic artifact generation for CSS variables, JS/TS, Android XML, and iOS Swift.
- Typed mapping contracts for slot/state/property token mappings.
- Token Studio (Next.js) to browse, preview, diff, and propose token edits through PR workflow.
- Example integrations for React, Vue, and Angular.

## Quick start

```bash
corepack enable pnpm
pnpm install
pnpm build
pnpm test
pnpm test:studio:e2e
pnpm --filter @prismforge/token-cli prismforge validate
```

## Self-hosted Token Studio for consumers

Teams can scaffold their own Token Studio workspace and connect it to their own git repo:

```bash
npx @prismforge/token-cli init
```

Or use flags:

```bash
npx @prismforge/token-cli init \
  --dir prismforge-studio \
  --studio-name "Acme Token Studio" \
  --provider github \
  --repository your-org/your-token-repo \
  --base-branch main \
  --targets css,js,ios \
  --studio true
```

Then configure `apps/token-studio/.env.local` and run `pnpm dev` inside the generated workspace.

For tokens-only consumers (no Studio UI), pass `--studio false`.

For existing repos that want Studio in the same project, use embedded mode:

```bash
npx @prismforge/token-cli init --mode embedded --layout app-first --embedded-path tools/prismforge --tokens-path design-tokens
```

In embedded `app-first`, token source is placed at project root (`design-tokens/` by default), not under `tools/prismforge`.

Add custom brands to your token source:

```bash
npx @prismforge/token-cli brand add --brand acme-enterprise --modes light,dark --from acme
```

## Monorepo layout

- `packages/token-source` canonical token data.
- `packages/token-schema` schema, types, and validation APIs.
- `packages/token-mappings` component mapping schema + data.
- `packages/token-build` deterministic artifact builders.
- `packages/tokens-css` published CSS artifact package.
- `packages/tokens-js` published JS/TS artifact package.
- `packages/tokens-android` published Android artifact package.
- `packages/tokens-ios` published iOS artifact package.
- `packages/token-cli` PrismForge CLI.
- `apps/token-studio` docs + token management UI.
- `examples/*` framework integrations.

## Release model

- Stable: default `latest` channel.
- Next: prerelease `next` channel for early adopters.
- Additional prerelease channels: `alpha`, `beta`, `rc`, `canary`.
- Custom prerelease tags are supported via `channel=custom` + `dist_tag`.

## Release automation

GitHub Actions includes a manual release workflow:

- Workflow: `.github/workflows/release.yml`
- Trigger: `workflow_dispatch`
- Inputs:
  - `channel`: `stable|next|alpha|beta|rc|canary|custom`
  - `dist_tag`: required when `channel=custom`
  - `dry_run`: run full checks without publish/push

Required secret for publish:

- `NPM_TOKEN` with publish access to `@prismforge/*`.

Operational runbook:

- `docs/RELEASE_CHECKLIST.md`
- `docs/CHANGESET_EXAMPLES.md`
- `docs/PUBLISHING.md`

Semver guardrail:

- CI enforces breaking token guard on PRs (`pnpm guard:breaking`).
- Removing token IDs requires a `major` changeset.

## License

Apache-2.0. See [LICENSE](./LICENSE).

## Community

- [Code of Conduct](./CODE_OF_CONDUCT.md)
- [Security Policy](./SECURITY.md)


