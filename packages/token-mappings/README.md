# Token Mapping Contract

Each mapping record defines how a component state/slot/property consumes a token:

- `component`: UI component name (for example `button`).
- `variant`: variant key (for example `primary`).
- `slot`: element slot (for example `root`, `label`).
- `state`: interaction state (`default`, `hover`, `active`, `disabled`, `focus`).
- `platformProperty`: concrete styling property (`background-color`, `color`, `box-shadow`).
- `tokenRef`: preferred component token id.
- `fallbackRef`: semantic fallback token id.

Validation rules:

- all required fields must exist.
- every `tokenRef` must resolve in current token set.
- required states must be present per `component + variant` group.

