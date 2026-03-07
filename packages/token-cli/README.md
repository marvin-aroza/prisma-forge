# PrismForge CLI

Commands:

- `prismforge init [--dir <path>] [--provider <github|gitlab|bitbucket|generic>] [--repository <id-or-url>] [--base-branch <name>] [--targets <css,js,android,ios|all>] [--studio <true|false>] [--package-manager <pnpm|npm>] [--prompt] [--yes] [--install]`
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

Then run:

```bash
cd prismforge-studio
corepack enable pnpm
pnpm install
# copy apps/token-studio/.env.example to apps/token-studio/.env.local
pnpm dev
```

## Tokens-only scaffold (no Studio UI)

```bash
npx @prismforge/token-cli init \
  --dir prismforge-tokens \
  --targets ios \
  --studio false
```


