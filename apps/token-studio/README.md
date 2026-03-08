# Token Studio

Next.js application for:

- browsing tokens by brand/mode/type/state/category
- visual previews (color, typography, spacing, radius, shadow, motion)
- diffing two token sets
- validating draft token edits and generating PR draft URLs
- MDX integration docs for React, Vue, and Angular

## Run locally

```bash
pnpm --filter @prismforge/token-studio dev
```

Open `http://localhost:3000`.

## Bootstrap your own Studio workspace

If you're consuming PrismForge tokens in another app/repo, scaffold your own Studio:

```bash
npx @prismforge/token-cli init \
  --dir prismforge-studio \
  --provider github \
  --repository your-org/your-token-repo \
  --base-branch main
```

## Browser smoke tests (Playwright)

Run e2e smoke tests locally:

```bash
pnpm --filter @prismforge/token-studio test:e2e
```

If browsers are not installed:

```bash
pnpm --filter @prismforge/token-studio exec playwright install chromium
```

## PR Autopilot

Token Studio supports two PR modes:

- `compare-url` fallback (default): validates token payload and returns a GitHub compare URL
- `auto-pr`: creates branch + commit + draft PR automatically from Studio
- supports both `update` (existing token) and `create` (new token) workflows
- supports batch submissions (`tokens[]`) for component template generation
- component template families: `form-control`, `overlay`, `navigation`, `feedback`

## Self-host configuration

Token Studio supports git repository integrations in two modes:

- `compare-url` mode: works with GitHub, GitLab, Bitbucket, or generic git hosts
- `auto-pr` mode: currently supported for GitHub when `GITHUB_TOKEN` is configured

Core git configuration (`.env.local`):

- `GIT_PROVIDER` one of `github|gitlab|bitbucket|generic`
- `GIT_REPOSITORY` repo id or host path (`owner/repo`, `group/project`, or domain/path for generic)
- `GIT_BASE_BRANCH` target branch (default `main`)
- `GIT_COMPARE_URL_TEMPLATE` optional custom compare/PR URL format

GitHub autopilot configuration (optional):

- `GITHUB_TOKEN` with repo write + pull request permissions
- `GITHUB_REPOSITORY` in `owner/repo` format
- `GITHUB_BASE_BRANCH`

Example `.env.local`:

```bash
NEXT_PUBLIC_STUDIO_NAME=PrismForge Token Studio
NEXT_PUBLIC_STUDIO_SUBTITLE=Cross-platform token governance
NEXT_PUBLIC_STUDIO_FLAG_PREVIEW=true
NEXT_PUBLIC_STUDIO_FLAG_DIFF=true
NEXT_PUBLIC_STUDIO_FLAG_EDIT=true
NEXT_PUBLIC_STUDIO_FLAG_CATALOG=true
NEXT_PUBLIC_STUDIO_FLAG_COMPONENTS=true
NEXT_PUBLIC_STUDIO_FLAG_DOCS=true
STUDIO_FLAG_GITHUB_AUTOPILOT=true

GIT_PROVIDER=github
GIT_REPOSITORY=your-org/your-repo
GIT_BASE_BRANCH=main

# Optional for custom hosts:
# GIT_COMPARE_URL_TEMPLATE=https://git.example.com/{repository}/compare/{baseBranch}...{branch}?title={title}&body={body}

# Optional GitHub autopilot:
# GITHUB_TOKEN=ghp_xxxxx
GITHUB_REPOSITORY=your-org/your-repo
GITHUB_BASE_BRANCH=main
```

### Add custom brands

Use CLI scaffolding for new brand folders/files:

```bash
npx @prismforge/token-cli brand add --brand acme-enterprise --modes light,dark --from acme
```

New token creation is inserted into a generated bucket in the selected layer file:

- semantic: `packages/token-source/src/tokens/semantic/<brand>/<mode>.json`
- component: `packages/token-source/src/tokens/component/<brand>/<mode>.json`
- reference: `packages/token-source/src/tokens/reference/global.json`

## API contract (`POST /api/pr`)

Request fields:

- `tokens`: array of token payloads
- `brand`, `mode`, `operation`, `layer`
- `includeMappings` (optional)
- `mappings` (required when `includeMappings=true`)

Token payload fields:

- `id`, `$type`, `$value`, `description`, `state`, `category`, `tags`

Mapping payload fields:

- `component`, `variant`, `slot`, `state`, `platformProperty`, `tokenRef`, `fallbackRef`

Sample request:

```json
{
  "tokens": [
    {
      "id": "dk.color.accent.primary.base",
      "$type": "color",
      "$value": "#1473E6",
      "description": "Primary accent token for base state.",
      "state": "base",
      "category": "color",
      "tags": ["semantic", "accent"]
    }
  ],
  "brand": "acme",
  "mode": "light",
  "operation": "update",
  "layer": "semantic",
  "includeMappings": false
}
```

### Response modes

- `compare-url`: returned when `GITHUB_TOKEN` is not configured
  - response includes `prUrl`, `branch`, `tokenCount`, `mappingCount`
- `auto-pr`: returned when autopilot is configured and PR creation succeeds
  - response includes created draft PR URL in `prUrl`

### Common error codes

- `empty_payload`
- `duplicate_payload_id`
- `token_source_error`
- `token_not_found`
- `token_exists`
- `mapping_payload_empty`
- `mapping_invalid`
- `mapping_multiple_groups`
- `mapping_token_ref_missing`
- `mapping_contract_invalid`
- `github_error`

## Mapping safety rules

- One API request can target only one `component+variant` group when mappings are included.
- Every mapping entry must have all required fields.
- `tokenRef` must resolve in the candidate token set.
- Mapping contracts are validated before PR creation.
