# PrismForge CLI

Commands:

- `prismforge init [--mode <standalone|embedded>] [--layout <workspace|app-first>] [--embedded-path <path>] [--tokens-path <path>] [--studio-name <name>] [--dir <path>] [--provider <github|gitlab|bitbucket|generic>] [--repository <id-or-url>] [--base-branch <name>] [--targets <css,js,android,ios|all>] [--studio <true|false>] [--package-manager <pnpm|npm>] [--prompt] [--yes] [--install]`
- `prismforge brand add --brand <id> [--modes <light,dark>] [--from <brand>] [--tokens-root <path>] [--force]`
- `prismforge validate`
- `prismforge build --brand <id> --mode <id> --target <css|js|android|ios|all>`
- `prismforge diff --from <snapshot> --to <snapshot>`
- `prismforge release --channel <stable|next|alpha|beta|rc|canary|custom> [--dist-tag <tag>]`
- `prismforge figma export --brand <id> --mode <id>`

## Scaffold a self-hosted Token Studio

Interactive wizard:

```bash
npx @prismforge/token-cli init
```

Non-interactive:

```bash
npx @prismforge/token-cli init \
  --dir prismforge-studio \
  --studio-name "Acme Token Studio" \
  --provider github \
  --repository your-org/your-token-repo \
  --base-branch main \
  --targets css,js,ios \
  --studio true
```

Notes:

- If run inside an existing git repo, `init` auto-detects provider/repository from `origin`.
- `--repository` is optional. Leave it empty for new workspaces and set it later in `.env.local`.
- Package manager is auto-detected (`npm` or `pnpm`) and can be forced with `--package-manager`.
- `--studio-name` customizes the Token Studio header/title (default: `PrismForge Token Studio`).

## Embedded mode (inside existing repo)

```bash
npx @prismforge/token-cli init \
  --mode embedded \
  --layout app-first \
  --embedded-path tools/prismforge \
  --tokens-path design-tokens \
  --package-manager npm
```

This keeps PrismForge inside your current project and adds helper scripts to your root `package.json`:

- `prismforge:install`
- `prismforge:dev`
- `prismforge:build`
- `prismforge:test`

Layout notes:

- `app-first` (default for embedded): token source lives at project root (`design-tokens/` by default).
- `--tokens-path` lets you move token source anywhere in your host repo (for example `tokens/design`).
- `workspace`: token source stays in `tools/prismforge/packages/token-source`.

Then run:

```bash
# from host project root
npm run prismforge:install
# copy tools/prismforge/apps/token-studio/.env.example to .env.local (inside tools/prismforge/apps/token-studio)
npm run prismforge:dev
```

## Tokens-only scaffold (no Studio UI)

```bash
npx @prismforge/token-cli init \
  --dir prismforge-tokens \
  --targets ios \
  --studio false
```

## Add your own brand

```bash
npx @prismforge/token-cli brand add \
  --brand acme-enterprise \
  --modes light,dark \
  --from acme
```

This creates semantic/component files for your brand in the detected token source root (`design-tokens/src/tokens` or `packages/token-source/src/tokens`).


