# Changeset Examples

Use these templates to create release entries quickly.

## Stable patch template

Create a file under `.changeset/` such as `.changeset/stable-patch-YYYYMMDD.md`:

```md
---
"@prismforge/token-build": patch
"@prismforge/token-cli": patch
"@prismforge/token-mappings": patch
"@prismforge/token-schema": patch
"@prismforge/tokens-android": patch
"@prismforge/tokens-css": patch
"@prismforge/tokens-ios": patch
"@prismforge/tokens-js": patch
---

Short summary of maintenance, test coverage, and release hardening updates.
```

## Next prerelease template

After stable is published, create a new file under `.changeset/` such as `.changeset/next-prerelease-YYYYMMDD.md`:

```md
---
"@prismforge/token-cli": patch
"@prismforge/token-mappings": patch
"@prismforge/tokens-css": patch
"@prismforge/tokens-js": patch
---

Preview release for upcoming token and tooling updates on the `next` channel.
```

## Other prerelease tags (`alpha`, `beta`, `rc`, `canary`, custom)

Changeset files stay the same format. The tag is chosen at publish time via release workflow input `channel`:

- `alpha` -> npm tag `alpha`
- `beta` -> npm tag `beta`
- `rc` -> npm tag `rc`
- `canary` -> npm tag `canary`
- `custom` + `dist_tag=<tag>` -> npm tag `<tag>`

## Notes

- Keep entries focused on packages that actually changed.
- If token IDs are removed, include at least one `major` entry to satisfy breaking-change guardrails.
- `@prismforge/token-source` is private and should not be included for npm publish planning.
