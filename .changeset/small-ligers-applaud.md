---
"@prismforge/token-cli": minor
---

Improve `prismforge init` for real-world consumer repos by:

- auto-detecting git provider, repository, and base branch from `origin` when available,
- allowing empty repository values for new workspaces,
- supporting package manager-aware scaffolding and install flows (`npm` and `pnpm`),
- adding more resilient template fetch fallbacks.

