---
"@prismforge/token-cli": minor
---

Add embedded init layout controls for existing repositories:

- new `--layout <workspace|app-first>` option for `prismforge init`,
- new `--tokens-path <path>` option for embedded app-first setups,
- `app-first` as default layout for embedded mode, placing token source at project root (`design-tokens` by default),
- updated embedded scaffolding to patch Studio/token source paths for app-first layout.
