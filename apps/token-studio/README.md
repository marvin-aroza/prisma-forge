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

To enable `auto-pr`, configure these environment variables for `apps/token-studio`:

- `GITHUB_TOKEN` with repo write + pull request permissions
- `GITHUB_REPOSITORY` in `owner/repo` format (optional, defaults to `prismforge/prismforge`)
- `GITHUB_BASE_BRANCH` (optional, defaults to `main`)

Example `.env.local`:

```bash
GITHUB_TOKEN=ghp_xxxxx
GITHUB_REPOSITORY=your-org/your-repo
GITHUB_BASE_BRANCH=main
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
