# Contributing to PrismForge

## Principles

- Git is the source of truth for tokens.
- Token changes must be validated by schema and mapping checks.
- Breaking token changes require changelog entries and migration notes.

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


