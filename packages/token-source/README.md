# Token Source

Canonical DTCG-inspired token source files are split by layer:

- `reference/global.json`: primitive scales.
- `semantic/<brand>/<mode>.json`: brand/mode intent tokens.
- `component/<brand>/<mode>.json`: component-state aliases.

Supported brands/modes in v1:

- `acme`: `light`, `dark`
- `nova`: `light`, `dark`

Use `loadTokenSource({ brand, mode })` from `src/index.js` to load merged token sets.

