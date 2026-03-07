---
"@prismforge/token-cli": minor
---

Add `prismforge init --mode embedded` for existing repositories, with support for:

- embedding the PrismForge workspace into a project path (`--embedded-path`, default `tools/prismforge`),
- automatic root script wiring (`prismforge:install`, `prismforge:dev`, `prismforge:build`, `prismforge:test`),
- interactive mode selection (`standalone` or `embedded`) in the init wizard.

