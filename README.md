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
pnpm --filter @prismforge/token-cli prismforge validate
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

## License

Apache-2.0. See [LICENSE](./LICENSE).


