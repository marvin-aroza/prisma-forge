# Release Checklist

This checklist is for maintainers publishing PrismForge packages.

## Preconditions

- You are releasing from `main`.
- `.changeset/*` entries for all intended package changes are present.
- CI is green on the latest `main` commit.
- Repository secret `NPM_TOKEN` is configured with publish access for `@prismforge/*`.

## Dry run (required)

1. Open GitHub Actions.
2. Run workflow `.github/workflows/release.yml`.
3. Set:
   - `channel`: `stable|next|alpha|beta|rc|canary|custom`
   - `dist_tag`: required only when `channel=custom`
   - `dry_run`: `true`
4. Confirm the job passes:
   - release guard
   - release preflight (pending changesets present)
   - `pnpm validate`
   - `pnpm test`
   - `pnpm build`

## Exact sequence for v0.1.x (stable + prerelease)

Run these in order:

1. Merge pending release changes (including `.changeset/*.md`) to `main`.
2. Run `.github/workflows/release.yml` with:
   - `channel=stable`
   - `dry_run=true`
3. Run `.github/workflows/release.yml` with:
   - `channel=stable`
   - `dry_run=false`
4. Verify npm `latest` tags and install smoke tests.
5. Add a fresh changeset for post-stable work intended for prerelease.
6. Run `.github/workflows/release.yml` with:
   - `channel=next` (or `alpha|beta|rc|canary|custom`)
   - if `channel=custom`, set `dist_tag=<your-tag>`
   - `dry_run=true`
7. Run `.github/workflows/release.yml` with:
   - `channel=next` (or `alpha|beta|rc|canary|custom`)
   - if `channel=custom`, set `dist_tag=<your-tag>`
   - `dry_run=false`
8. Verify npm prerelease tags and install smoke tests.

Important:

- Do not run stable and prerelease publish back-to-back from the same pending changesets.
- After stable publish, create at least one new `.changeset/*.md` entry before prerelease publish.

## Publish run

1. Re-run `.github/workflows/release.yml`.
2. Set:
   - `channel`: desired channel
   - `dry_run`: `false`
3. Confirm publish step succeeds:
   - `stable` -> `changeset publish --tag latest`
   - `next` -> `changeset publish --tag next`
   - `alpha|beta|rc|canary` -> `changeset publish --tag <channel>`
   - `custom` -> `changeset publish --tag <dist_tag>`
4. Confirm release commit and tags are pushed to `main`.

## Post-release verification

1. Verify npm tags for affected packages:
   - `npm view @prismforge/tokens-css dist-tags`
   - `npm view @prismforge/tokens-js dist-tags`
   - `npm view @prismforge/tokens-android dist-tags`
   - `npm view @prismforge/tokens-ios dist-tags`
   - `npm view @prismforge/token-cli dist-tags`
2. Verify install smoke test in a clean sandbox:
   - `npm i @prismforge/tokens-css@latest` (stable)
   - `npm i @prismforge/tokens-css@next` (next)
   - `npm i @prismforge/tokens-css@alpha` (example alpha)
   - `npm i @prismforge/tokens-css@beta` (example beta)
3. Announce the release in project channels with changelog highlights.

## If publish fails

1. Do not rerun blindly.
2. Capture failing step logs and package name.
3. Check whether package was partially published on npm.
4. If partial publish occurred, prepare a follow-up changeset and rerun release.
5. Document incident and remediation in `docs/rfcs` if process changes are needed.
6. Open a release incident issue using `.github/ISSUE_TEMPLATE/release-incident.md`.
