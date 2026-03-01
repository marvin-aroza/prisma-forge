# Publishing Surface

This document defines the PrismForge v1 npm publishing boundary.

## Public packages

These packages are published to npm under `@prismforge/*` and use `publishConfig.access=public`:

- `@prismforge/token-build`
- `@prismforge/token-cli`
- `@prismforge/token-mappings`
- `@prismforge/token-schema`
- `@prismforge/tokens-android`
- `@prismforge/tokens-css`
- `@prismforge/tokens-ios`
- `@prismforge/tokens-js`

## Private workspace packages

These packages stay private and are not published:

- `@prismforge/token-source` (canonical source-of-truth token data)
- `@prismforge/token-studio` (maintainer UI app)
- `@prismforge/example-angular`
- `@prismforge/example-react`
- `@prismforge/example-vue`

## Notes

- `@prismforge/token-source` remains private by design to keep Git as the canonical token source.
- Consumers should use published artifacts and APIs from `tokens-*`, `token-schema`, and `token-mappings`.
