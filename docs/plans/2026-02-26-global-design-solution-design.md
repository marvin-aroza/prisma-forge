# Global Open-Source Design Solution Platform

## Scope

Platform-first design system repository that manages:

- canonical DTCG-style token JSON
- multi-brand and multi-mode token resolution
- deterministic build outputs for CSS/JS/Android/iOS
- typed token mapping contracts
- token management UI with PR-first editing workflow

## Architecture

- `packages/token-source`: canonical token layers.
- `packages/token-schema`: validation and alias resolution.
- `packages/token-mappings`: component mapping schema and maps.
- `packages/token-build`: deterministic multi-target builders.
- `packages/token-cli`: `prismforge` command surface.
- `packages/tokens-*`: publish-ready output packages.
- `apps/token-studio`: docs and management UI.
- `examples/*`: integration references.

## Token methodology

Layered model:

1. `reference`: scales and primitives.
2. `semantic`: intent-level aliasing.
3. `component`: component-level state tokens.

Naming convention:

`namespace.category.intent.variant.state`

Required metadata:

`id`, `$type`, `$value`, `description`, `brand`, `mode`, `state`, `category`, `deprecated`, `since`, `tags`.

## Governance and release

- Apache-2.0 license.
- stable + next release channels.
- PR templates, issue template, RFC docs, CODEOWNERS.


