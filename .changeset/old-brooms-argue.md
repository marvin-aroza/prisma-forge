---
"@prismforge/token-cli": minor
---

Enhance `prismforge init` with smarter onboarding defaults:

- auto-detect git provider/repository/base branch from `origin` when running inside an existing git repository,
- allow empty repository values for brand-new workspaces and defer repo setup to `.env.local`,
- improve template fetch resilience by trying configured fallback template repositories.

