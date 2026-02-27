# Token Schema and Validation

This package provides:

- token JSON schema files
- runtime validation (`validateTokens`)
- alias resolution with cycle/unresolved checks (`resolveAliases`)

Validation enforces:

- required metadata fields
- naming convention `namespace.category.intent.variant.state`
- token type/value compatibility
- semver `since` field

