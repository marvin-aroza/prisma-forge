#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import readline from "node:readline/promises";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SUPPORTED_RELEASE_CHANNELS = ["stable", "next", "alpha", "beta", "rc", "canary", "custom"];
const SUPPORTED_GIT_PROVIDERS = ["github", "gitlab", "bitbucket", "generic"];
const SUPPORTED_TOKEN_TARGETS = ["css", "js", "android", "ios"];
const SUPPORTED_PACKAGE_MANAGERS = ["pnpm", "npm"];
const SUPPORTED_INIT_MODES = ["standalone", "embedded"];
const SUPPORTED_INIT_LAYOUTS = ["workspace", "app-first"];
const SEMVER_LIKE_PATTERN = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/u;
const DEFAULT_INIT_REPO_URLS = [
  process.env.PRISMFORGE_TEMPLATE_REPO_URL?.trim(),
  "https://github.com/marvin-aroza/prisma-forge.git",
  "https://github.com/prismforge/prismforge.git"
].filter(Boolean);
const TARGET_PACKAGE_MAP = {
  css: "@prismforge/tokens-css",
  js: "@prismforge/tokens-js",
  android: "@prismforge/tokens-android",
  ios: "@prismforge/tokens-ios"
};

function parseFlags(args) {
  const flags = {};
  for (let i = 0; i < args.length; i += 1) {
    const current = args[i];
    if (!current.startsWith("--")) {
      continue;
    }
    const key = current.slice(2);
    const next = args[i + 1];
    if (!next || next.startsWith("--")) {
      flags[key] = true;
    } else {
      flags[key] = next;
      i += 1;
    }
  }
  return flags;
}

function printHelp() {
  console.log(`
PrismForge CLI

Commands:
  prismforge validate
  prismforge build --brand <id> --mode <id> --target <css|js|android|ios|all> [--out <dir>]
  prismforge diff --from <version-or-file> --to <version-or-file>
  prismforge init [--mode <standalone|embedded>] [--layout <workspace|app-first>] [--embedded-path <path>] [--dir <path>] [--provider <github|gitlab|bitbucket|generic>] [--repository <id-or-url>] [--base-branch <name>] [--targets <css,js,android,ios|all>] [--studio <true|false>] [--package-manager <pnpm|npm>] [--prompt] [--yes] [--install] [--force]
  prismforge release --channel <stable|next|alpha|beta|rc|canary|custom> [--dist-tag <tag>]
  prismforge figma export --brand <id> --mode <id> [--out <file>]
`);
}

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exitCode = 1;
}

function parseBooleanFlag(value, flagName) {
  if (value === undefined) {
    return null;
  }
  if (typeof value === "boolean") {
    return value;
  }

  const normalized = String(value).trim().toLowerCase();
  if (["true", "1", "yes", "y", "on"].includes(normalized)) {
    return true;
  }
  if (["false", "0", "no", "n", "off"].includes(normalized)) {
    return false;
  }

  throw new Error(`Flag --${flagName} expects a boolean value (true|false).`);
}

function parseTokenTargets(input) {
  const normalized = String(input ?? "css,js").trim().toLowerCase();
  if (!normalized) {
    return ["css", "js"];
  }
  if (normalized === "all") {
    return [...SUPPORTED_TOKEN_TARGETS];
  }

  const requested = [...new Set(normalized.split(",").map((entry) => entry.trim()).filter(Boolean))];
  if (requested.length === 0) {
    return ["css", "js"];
  }

  const invalid = requested.filter((entry) => !SUPPORTED_TOKEN_TARGETS.includes(entry));
  if (invalid.length > 0) {
    throw new Error(
      `Unknown token target(s): ${invalid.join(", ")}. Expected one or more of ${SUPPORTED_TOKEN_TARGETS.join(", ")} or "all".`
    );
  }

  return requested;
}

function formatTargetPackageList(targets) {
  return targets
    .map((target) => TARGET_PACKAGE_MAP[target])
    .filter(Boolean)
    .join(", ");
}

function parsePackageManager(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized) {
    return "";
  }
  if (!SUPPORTED_PACKAGE_MANAGERS.includes(normalized)) {
    throw new Error(
      `Unsupported package manager "${normalized}". Expected one of ${SUPPORTED_PACKAGE_MANAGERS.join(", ")}.`
    );
  }
  return normalized;
}

function parseInitMode(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized) {
    return "";
  }
  if (!SUPPORTED_INIT_MODES.includes(normalized)) {
    throw new Error(
      `Unsupported init mode "${normalized}". Expected one of ${SUPPORTED_INIT_MODES.join(", ")}.`
    );
  }
  return normalized;
}

function parseInitLayout(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized) {
    return "";
  }
  if (!SUPPORTED_INIT_LAYOUTS.includes(normalized)) {
    throw new Error(
      `Unsupported init layout "${normalized}". Expected one of ${SUPPORTED_INIT_LAYOUTS.join(", ")}.`
    );
  }
  return normalized;
}

function detectPackageManager(flags) {
  const explicit = parsePackageManager(flags["package-manager"] ?? flags.pm ?? "");
  if (explicit) {
    return explicit;
  }

  const userAgent = String(process.env.npm_config_user_agent ?? "").trim();
  if (userAgent.startsWith("npm/")) {
    return "npm";
  }
  if (userAgent.startsWith("pnpm/")) {
    return "pnpm";
  }

  if (fs.existsSync(path.join(process.cwd(), "package-lock.json"))) {
    return "npm";
  }
  if (fs.existsSync(path.join(process.cwd(), "pnpm-lock.yaml"))) {
    return "pnpm";
  }

  return "pnpm";
}

function getInstallCommandForPackageManager(packageManager) {
  if (packageManager === "npm") {
    return { command: "npm", args: ["install"] };
  }
  return { command: "pnpm", args: ["install"] };
}

function getWorkspaceCommandsForPackageManager(packageManager, workspaceRelativePath) {
  const normalizedPath = workspaceRelativePath.replace(/\\/gu, "/");
  if (packageManager === "npm") {
    return {
      install: `npm --prefix ${normalizedPath} install`,
      dev: `npm --prefix ${normalizedPath} run dev`,
      build: `npm --prefix ${normalizedPath} run build`,
      test: `npm --prefix ${normalizedPath} run test`
    };
  }
  return {
    install: `pnpm --dir ${normalizedPath} install`,
    dev: `pnpm --dir ${normalizedPath} dev`,
    build: `pnpm --dir ${normalizedPath} build`,
    test: `pnpm --dir ${normalizedPath} test`
  };
}

function asFileModuleSpecifier(absolutePath) {
  return pathToFileURL(absolutePath).href;
}

function getWorkspaceModuleCandidate(relativePathFromCwd) {
  const absolutePath = path.resolve(process.cwd(), relativePathFromCwd);
  if (!fs.existsSync(absolutePath)) {
    return null;
  }
  return asFileModuleSpecifier(absolutePath);
}

function getCliRelativeModuleCandidate(relativePathFromCliDir) {
  const absolutePath = path.resolve(__dirname, relativePathFromCliDir);
  if (!fs.existsSync(absolutePath)) {
    return null;
  }
  return asFileModuleSpecifier(absolutePath);
}

async function importFromCandidates(purposeLabel, candidates) {
  const attempts = [];

  for (const candidate of candidates.filter(Boolean)) {
    try {
      return await import(candidate);
    } catch (error) {
      const reason =
        error instanceof Error
          ? `${error.name}: ${error.message}`
          : "Unknown import error";
      attempts.push(`${candidate} (${reason})`);
    }
  }

  const details = attempts.length > 0 ? ` Attempts: ${attempts.join(" | ")}` : "";
  throw new Error(
    `Unable to load ${purposeLabel}. Run this command from a PrismForge workspace or install required runtime packages.${details}`
  );
}

async function loadTokenSchemaModule() {
  return importFromCandidates("token schema module", [
    getWorkspaceModuleCandidate("packages/token-schema/src/index.js"),
    getCliRelativeModuleCandidate("../../token-schema/src/index.js"),
    "@prismforge/token-schema"
  ]);
}

async function loadTokenMappingsModule() {
  return importFromCandidates("token mappings module", [
    getWorkspaceModuleCandidate("packages/token-mappings/src/index.js"),
    getCliRelativeModuleCandidate("../../token-mappings/src/index.js"),
    "@prismforge/token-mappings"
  ]);
}

async function loadTokenSourceModule() {
  return importFromCandidates("token source module", [
    getWorkspaceModuleCandidate("packages/token-source/src/index.js"),
    getCliRelativeModuleCandidate("../../token-source/src/index.js"),
    "@prismforge/token-source"
  ]);
}

async function loadTokenBuildModule() {
  return importFromCandidates("token build module", [
    getWorkspaceModuleCandidate("packages/token-build/src/index.js"),
    getCliRelativeModuleCandidate("../../token-build/src/index.js"),
    "@prismforge/token-build"
  ]);
}

function hasDirectoryEntries(directoryPath) {
  if (!fs.existsSync(directoryPath)) {
    return false;
  }
  return fs.readdirSync(directoryPath).length > 0;
}

function sanitizeName(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/gu, "-")
    .replace(/-{2,}/gu, "-")
    .replace(/^-+|-+$/gu, "");
}

function copyDirectory(source, destination) {
  fs.cpSync(source, destination, {
    recursive: true,
    filter(entry) {
      const normalized = entry.replace(/\\/gu, "/");
      if (
        normalized.includes("/node_modules/") ||
        normalized.includes("/.next/") ||
        normalized.includes("/.turbo/") ||
        normalized.includes("/test-results/") ||
        normalized.includes("/playwright-report/")
      ) {
        return false;
      }
      return true;
    }
  });
}

function runCommand(command, commandArgs, options = {}) {
  const spawnOptions = {
    stdio: "pipe",
    encoding: "utf8",
    ...options
  };

  const hasPathSeparator = String(command).includes("/") || String(command).includes("\\");
  const hasExtension = path.extname(String(command)).length > 0;
  const result = spawnSync(command, commandArgs, spawnOptions);
  const normalized = {
    status: result.status ?? (result.error ? 1 : 0),
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    error: result.error ?? null
  };

  const isWindowsBareCommand = process.platform === "win32" && !hasPathSeparator && !hasExtension;
  const shouldTryShellFallback =
    isWindowsBareCommand &&
    normalized.error &&
    (normalized.error.code === "ENOENT" || normalized.error.code === "EINVAL");
  if (!shouldTryShellFallback) {
    return normalized;
  }

  const shellCommand = [command, ...commandArgs.map((arg) => {
    const text = String(arg);
    if (!/[ \t"^&|<>()]/u.test(text)) {
      return text;
    }
    return `"${text.replace(/"/gu, '\\"')}"`;
  })].join(" ");
  const shellResult = spawnSync(shellCommand, {
    ...spawnOptions,
    shell: true
  });

  return {
    status: shellResult.status ?? (shellResult.error ? 1 : 0),
    stdout: shellResult.stdout ?? "",
    stderr: shellResult.stderr ?? "",
    error: shellResult.error ?? null
  };
}

function normalizeGitHostProvider(hostname) {
  const host = String(hostname ?? "").toLowerCase();
  if (host === "github.com" || host.endsWith(".github.com")) {
    return "github";
  }
  if (host === "gitlab.com" || host.endsWith(".gitlab.com")) {
    return "gitlab";
  }
  if (host === "bitbucket.org" || host.endsWith(".bitbucket.org")) {
    return "bitbucket";
  }
  return "generic";
}

function parseRemoteRepository(remoteUrl) {
  const raw = String(remoteUrl ?? "").trim();
  if (!raw) {
    return null;
  }

  // SCP-like SSH URL: git@host:owner/repo.git
  const scpMatch = raw.match(/^[^@]+@([^:]+):(.+)$/u);
  if (scpMatch) {
    const host = scpMatch[1].trim().toLowerCase();
    const repoPath = scpMatch[2].replace(/\.git$/u, "").replace(/^\/+/u, "").trim();
    if (!repoPath) {
      return null;
    }
    const provider = normalizeGitHostProvider(host);
    return {
      provider,
      repository: provider === "generic" ? `${host}/${repoPath}` : repoPath
    };
  }

  try {
    const parsed = new URL(raw);
    const host = parsed.hostname.toLowerCase();
    const repoPath = parsed.pathname.replace(/\.git$/u, "").replace(/^\/+/u, "").trim();
    if (!repoPath) {
      return null;
    }
    const provider = normalizeGitHostProvider(host);
    return {
      provider,
      repository: provider === "generic" ? `${host}/${repoPath}` : repoPath
    };
  } catch {
    return null;
  }
}

function detectGitInitDefaults() {
  const insideRepo = runCommand("git", ["rev-parse", "--is-inside-work-tree"]);
  if (insideRepo.status !== 0 || insideRepo.stdout.trim() !== "true") {
    return null;
  }

  const defaults = {
    provider: "github",
    repository: "",
    baseBranch: "main",
    source: "git"
  };

  const originUrl = runCommand("git", ["remote", "get-url", "origin"]);
  if (originUrl.status === 0) {
    const parsed = parseRemoteRepository(originUrl.stdout);
    if (parsed) {
      defaults.provider = parsed.provider;
      defaults.repository = parsed.repository;
    }
  }

  const originHead = runCommand("git", ["symbolic-ref", "--quiet", "--short", "refs/remotes/origin/HEAD"]);
  if (originHead.status === 0) {
    const head = originHead.stdout.trim();
    if (head.includes("/")) {
      defaults.baseBranch = head.split("/").slice(1).join("/");
    } else if (head) {
      defaults.baseBranch = head;
    }
  } else {
    const currentBranch = runCommand("git", ["branch", "--show-current"]);
    if (currentBranch.status === 0 && currentBranch.stdout.trim()) {
      defaults.baseBranch = currentBranch.stdout.trim();
    }
  }

  return defaults;
}

function resolveTemplateRoot(customRoot) {
  if (customRoot) {
    const resolved = path.resolve(String(customRoot));
    return resolved;
  }

  const localRoot = path.resolve(__dirname, "..", "..", "..");
  if (
    fs.existsSync(path.join(localRoot, "apps", "token-studio")) &&
    fs.existsSync(path.join(localRoot, "packages", "token-source")) &&
    fs.existsSync(path.join(localRoot, "packages", "token-schema")) &&
    fs.existsSync(path.join(localRoot, "packages", "token-mappings"))
  ) {
    return localRoot;
  }

  const failures = [];
  for (const repositoryUrl of DEFAULT_INIT_REPO_URLS) {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "prismforge-init-"));
    const cloneTarget = path.join(tempRoot, "template");
    const cloneResult = runCommand("git", ["clone", "--depth", "1", repositoryUrl, cloneTarget]);
    if (cloneResult.status === 0) {
      return cloneTarget;
    }
    failures.push(`${repositoryUrl}: ${cloneResult.stderr || cloneResult.stdout}`);
  }

  throw new Error(
    `Unable to fetch PrismForge template via git clone.\n${failures.join("\n")}`
  );
}

function shouldPromptForInit(flags) {
  const interactive = Boolean(process.stdin.isTTY && process.stdout.isTTY);
  if (!interactive || flags.yes) {
    return false;
  }
  if (flags.prompt) {
    return true;
  }

  const hasConfigFlags = [
    "mode",
    "layout",
    "embedded-path",
    "embeddedPath",
    "dir",
    "provider",
    "repository",
    "base-branch",
    "baseBranch",
    "targets",
    "studio",
    "package-manager",
    "pm",
    "install"
  ].some((key) => flags[key] !== undefined);

  return !hasConfigFlags;
}

async function promptInput(rl, label, defaultValue) {
  const suffix = defaultValue ? ` [${defaultValue}]` : "";
  const answer = await rl.question(`${label}${suffix}: `);
  const trimmed = answer.trim();
  return trimmed || defaultValue;
}

async function promptBoolean(rl, label, defaultValue) {
  const suffix = defaultValue ? "Y/n" : "y/N";
  const answer = (await rl.question(`${label} (${suffix}): `)).trim().toLowerCase();
  if (!answer) {
    return defaultValue;
  }
  if (["y", "yes", "true", "1", "on"].includes(answer)) {
    return true;
  }
  if (["n", "no", "false", "0", "off"].includes(answer)) {
    return false;
  }
  return defaultValue;
}

async function promptForTokenTargets(rl, defaultValue) {
  while (true) {
    const answer = await promptInput(
      rl,
      "Token targets (css,js,android,ios or all)",
      defaultValue
    );
    try {
      const parsed = parseTokenTargets(answer);
      return {
        raw: answer,
        parsed
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid token targets.";
      console.log(message);
    }
  }
}

function writeScaffoldRootPackageJson(targetDir, workspaceName, options) {
  const tokenSourceEntryPoint =
    options.tokenSourcePath === "design-tokens"
      ? "node ./design-tokens/src/index.js --list"
      : "node ./packages/token-source/src/index.js --list";
  const scripts = {
    validate: `${tokenSourceEntryPoint} && node ./packages/token-schema/src/index.js --self-check`
  };

  if (options.includeStudio) {
    if (options.packageManager === "npm") {
      scripts.dev = "npm run dev --workspace @prismforge/token-studio";
      scripts.build = "npm run build --workspace @prismforge/token-studio";
      scripts.test = "npm run test --workspace @prismforge/token-studio";
      scripts["test:e2e"] = "npm run test:e2e --workspace @prismforge/token-studio";
    } else {
      scripts.dev = "pnpm --filter @prismforge/token-studio dev";
      scripts.build = "pnpm --filter @prismforge/token-studio build";
      scripts.test = "pnpm --filter @prismforge/token-studio test";
      scripts["test:e2e"] = "pnpm --filter @prismforge/token-studio test:e2e";
    }
  }

  const dependencies = {};
  for (const target of options.targets) {
    const packageName = TARGET_PACKAGE_MAP[target];
    if (packageName) {
      dependencies[packageName] = "latest";
    }
  }

  const packageJson = {
    name: workspaceName,
    private: true,
    version: "0.1.0",
    license: "Apache-2.0",
    type: "module",
    workspaces: ["apps/*", "packages/*"],
    scripts
  };

  if (options.packageManager === "pnpm") {
    packageJson.packageManager = "pnpm@10.17.0";
  }

  if (Object.keys(dependencies).length > 0) {
    packageJson.dependencies = dependencies;
  }

  fs.writeFileSync(path.join(targetDir, "package.json"), `${JSON.stringify(packageJson, null, 2)}\n`, "utf8");
}

function writeScaffoldWorkspaceFile(targetDir) {
  const content = `packages:
  - "apps/*"
  - "packages/*"
`;
  fs.writeFileSync(path.join(targetDir, "pnpm-workspace.yaml"), content, "utf8");
}

function writeScaffoldGitignore(targetDir) {
  const content = `node_modules/
.next/
.turbo/
dist/
coverage/
playwright-report/
test-results/
*.log
*.tmp
`;
  fs.writeFileSync(path.join(targetDir, ".gitignore"), content, "utf8");
}

function writeScaffoldReadme(targetDir, options) {
  const studioSection = options.includeStudio
    ? `## Run Token Studio

\`\`\`bash
${options.packageManager} run dev
\`\`\`

Open \`http://localhost:3000\`.
`
    : `## Token Studio

Token Studio was skipped for this workspace. Re-run init with \`--studio true\` if you want the UI.
`;

  const repositorySection = options.includeStudio
    ? `## Repository integration

Edit \`apps/token-studio/.env.local\` from \`apps/token-studio/.env.example\`.

- \`GIT_PROVIDER=${options.provider}\`
- \`GIT_REPOSITORY=${options.repository}\`
- \`GIT_BASE_BRANCH=${options.baseBranch}\`

GitHub autopilot PR creation requires:

- \`GITHUB_TOKEN\`
- \`GITHUB_REPOSITORY\`
- \`GITHUB_BASE_BRANCH\`
`
    : "";

  const content = `# ${options.workspaceTitle}

Self-hosted PrismForge workspace.
Init mode: ${options.initMode}
Layout: ${options.layout}
Selected token targets: ${options.targets.join(", ")}
Token packages: ${formatTargetPackageList(options.targets)}
Package manager: ${options.packageManager}

## Quick start

\`\`\`bash
${options.packageManager === "pnpm" ? "corepack enable pnpm" : "npm --version"}
${options.packageManager} install
\`\`\`

${studioSection}

${repositorySection}`;

  fs.writeFileSync(path.join(targetDir, "README.md"), content, "utf8");
}

function writeStudioEnvExample(targetDir, options) {
  const envExample = `# Generic git integration (compare URL mode)
GIT_PROVIDER=${options.provider}
GIT_REPOSITORY=${options.repository}
GIT_BASE_BRANCH=${options.baseBranch}

# Optional: override compare URL format for non-standard git hosts.
# Placeholders: {repository} {baseBranch} {branch} {title} {body}
# GIT_COMPARE_URL_TEMPLATE=https://git.example.com/{repository}/compare/{baseBranch}...{branch}?title={title}&body={body}

# Optional: GitHub autopilot mode (branch + commit + draft PR).
# Only used when GIT_PROVIDER=github.
# GITHUB_TOKEN=ghp_xxxxx
GITHUB_REPOSITORY=${options.repository}
GITHUB_BASE_BRANCH=${options.baseBranch}
`;

  const studioDir = path.join(targetDir, "apps", "token-studio");
  fs.writeFileSync(path.join(studioDir, ".env.example"), envExample, "utf8");
}

function applyAppFirstLayoutPatches(targetDir) {
  const replacements = [
    {
      file: path.join(targetDir, "apps", "token-studio", "lib", "tokens.ts"),
      from: "../../../packages/token-source/src/index.js",
      to: "../../../design-tokens/src/index.js"
    },
    {
      file: path.join(targetDir, "apps", "token-studio", "app", "api", "pr", "route.ts"),
      from: "../../../../../packages/token-source/src/index.js",
      to: "../../../../../design-tokens/src/index.js"
    },
    {
      file: path.join(targetDir, "apps", "token-studio", "app", "api", "pr", "helpers.mjs"),
      from: 'path.join(\n  REPO_ROOT,\n  "packages",\n  "token-source",\n  "src",\n  "tokens"\n);',
      to: 'path.join(REPO_ROOT, "design-tokens", "src", "tokens");'
    }
  ];

  for (const replacement of replacements) {
    if (!fs.existsSync(replacement.file)) {
      continue;
    }
    const current = fs.readFileSync(replacement.file, "utf8");
    if (!current.includes(replacement.from)) {
      continue;
    }
    const next = current.replace(replacement.from, replacement.to);
    fs.writeFileSync(replacement.file, next, "utf8");
  }
}

function attachEmbeddedScriptsToHostProject(projectRoot, embeddedWorkspaceDir, packageManager) {
  const hostPackagePath = path.join(projectRoot, "package.json");
  if (!fs.existsSync(hostPackagePath)) {
    return {
      updated: false,
      reason: "Host project package.json not found; skipping root script integration."
    };
  }

  const raw = fs.readFileSync(hostPackagePath, "utf8");
  let hostPackageJson = {};
  try {
    hostPackageJson = JSON.parse(raw);
  } catch {
    return {
      updated: false,
      reason: "Host package.json is invalid JSON; skipping root script integration."
    };
  }

  const workspaceRelative = path.relative(projectRoot, embeddedWorkspaceDir) || ".";
  const commands = getWorkspaceCommandsForPackageManager(packageManager, workspaceRelative);

  if (!hostPackageJson.scripts || typeof hostPackageJson.scripts !== "object") {
    hostPackageJson.scripts = {};
  }

  const nextScripts = {
    ...hostPackageJson.scripts
  };
  const proposed = {
    "prismforge:install": commands.install,
    "prismforge:dev": commands.dev,
    "prismforge:build": commands.build,
    "prismforge:test": commands.test
  };

  let changes = 0;
  for (const [scriptName, scriptValue] of Object.entries(proposed)) {
    if (!nextScripts[scriptName]) {
      nextScripts[scriptName] = scriptValue;
      changes += 1;
    }
  }

  if (changes === 0) {
    return {
      updated: false,
      reason: "Host scripts already include PrismForge commands."
    };
  }

  hostPackageJson.scripts = nextScripts;
  fs.writeFileSync(hostPackagePath, `${JSON.stringify(hostPackageJson, null, 2)}\n`, "utf8");
  return {
    updated: true,
    reason: `Added ${changes} prismforge script(s) to host package.json.`
  };
}

async function commandInit(flags) {
  const detectedGitDefaults = detectGitInitDefaults();
  const defaultProvider = String(flags.provider ?? detectedGitDefaults?.provider ?? "github").trim().toLowerCase();
  const defaultRepository = String(flags.repository ?? detectedGitDefaults?.repository ?? "").trim();
  const defaultBaseBranch = String(flags["base-branch"] ?? flags.baseBranch ?? detectedGitDefaults?.baseBranch ?? "main").trim();
  const defaultStandaloneDir = String(flags.dir ?? "prismforge-studio").trim() || "prismforge-studio";
  const defaultEmbeddedPath = String(flags["embedded-path"] ?? flags.embeddedPath ?? "tools/prismforge").trim() || "tools/prismforge";
  let packageManager = "pnpm";
  let initMode = "standalone";
  let initLayout = "";

  let includeStudio = true;
  let installDeps = Boolean(flags.install);
  let targets = ["css", "js"];

  try {
    const studioFlag = parseBooleanFlag(flags.studio, "studio");
    const installFlag = parseBooleanFlag(flags.install, "install");
    const modeFlag = parseInitMode(flags.mode ?? "");
    const layoutFlag = parseInitLayout(flags.layout ?? "");
    packageManager = detectPackageManager(flags);
    initMode = modeFlag || "standalone";
    initLayout = layoutFlag || (initMode === "embedded" ? "app-first" : "workspace");
    includeStudio = studioFlag ?? true;
    installDeps = installFlag ?? false;
    targets = parseTokenTargets(flags.targets ?? "css,js");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid init options.";
    fail(message);
    return;
  }

  let provider = defaultProvider;
  let repository = defaultRepository;
  let baseBranch = defaultBaseBranch;
  let embeddedPath = defaultEmbeddedPath;
  let targetDir =
    initMode === "embedded"
      ? flags.dir
        ? path.resolve(String(flags.dir))
        : path.resolve(process.cwd(), embeddedPath)
      : path.resolve(defaultStandaloneDir);

  if (shouldPromptForInit(flags)) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    try {
      const suggestedMode =
        parseInitMode(flags.mode ?? "") ||
        (fs.existsSync(path.join(process.cwd(), "package.json")) ? "embedded" : "standalone");
      const promptedModeRaw = await promptInput(
        rl,
        "Init mode (standalone|embedded)",
        suggestedMode
      );
      initMode = parseInitMode(promptedModeRaw) || "standalone";
      const defaultLayoutForMode = initMode === "embedded" ? "app-first" : "workspace";
      const promptedLayoutRaw = await promptInput(
        rl,
        "Layout (workspace|app-first)",
        initLayout || defaultLayoutForMode
      );
      initLayout = parseInitLayout(promptedLayoutRaw) || defaultLayoutForMode;

      if (initMode === "embedded") {
        const promptedEmbeddedPath = await promptInput(
          rl,
          "Embedded workspace path (relative to current project)",
          embeddedPath
        );
        embeddedPath = String(promptedEmbeddedPath ?? embeddedPath).trim() || embeddedPath;
        targetDir = path.resolve(process.cwd(), embeddedPath);
      } else {
        const promptedDir = await promptInput(rl, "Workspace directory", defaultStandaloneDir);
        targetDir = path.resolve(String(promptedDir ?? defaultStandaloneDir).trim() || defaultStandaloneDir);
      }

      const promptedProvider = await promptInput(
        rl,
        "Git provider (github|gitlab|bitbucket|generic)",
        provider
      );
      const promptedRepository = await promptInput(
        rl,
        "Repository (owner/repo or host/path, optional)",
        repository
      );
      const promptedBaseBranch = await promptInput(rl, "Base branch", baseBranch);
      const promptedTargets = await promptForTokenTargets(rl, targets.join(","));
      const promptedStudio = await promptBoolean(rl, "Include Token Studio UI", includeStudio);
      const promptedPackageManager = await promptInput(
        rl,
        "Package manager (pnpm|npm)",
        packageManager
      );
      const promptedInstall = await promptBoolean(rl, "Install dependencies now", installDeps);

      provider = String(promptedProvider ?? provider).trim().toLowerCase();
      repository = String(promptedRepository ?? repository).trim();
      baseBranch = String(promptedBaseBranch ?? baseBranch).trim();
      targets = promptedTargets.parsed;
      includeStudio = promptedStudio;
      packageManager = parsePackageManager(promptedPackageManager) || "pnpm";
      installDeps = promptedInstall;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid init options.";
      fail(message);
      return;
    } finally {
      rl.close();
    }
  }

  if (!SUPPORTED_GIT_PROVIDERS.includes(provider)) {
    fail("Init requires --provider <github|gitlab|bitbucket|generic>.");
    return;
  }

  if (!baseBranch) {
      fail("Init requires a non-empty --base-branch value.");
      return;
  }
  if (!initLayout) {
    initLayout = initMode === "embedded" ? "app-first" : "workspace";
  }

  const hostProjectRoot = process.cwd();
  if (hasDirectoryEntries(targetDir) && !flags.force) {
    fail(`Target directory "${targetDir}" already exists and is not empty. Use --force to continue.`);
    return;
  }

  const templateRootFlag = flags["template-root"] ? String(flags["template-root"]) : "";

  let templateRoot = "";
  try {
    templateRoot = resolveTemplateRoot(templateRootFlag);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to resolve template source.";
    fail(message);
    return;
  }

  fs.mkdirSync(targetDir, { recursive: true });

  const copyTargets = [
    ...(initLayout === "app-first"
      ? [["packages", "token-source", "src"], ["packages", "token-source", "package.json"]]
      : [["packages", "token-source"]]),
    ["packages", "token-schema"],
    ["packages", "token-mappings"]
  ];
  if (includeStudio) {
    copyTargets.unshift(["apps", "token-studio"]);
  }

  for (const segments of copyTargets) {
    const relativePath = path.join(...segments);
    const sourcePath = path.join(templateRoot, relativePath);
    if (!fs.existsSync(sourcePath)) {
      fail(`Template path is missing required content: ${relativePath}`);
      return;
    }

    const destinationPath =
      initLayout === "app-first" && relativePath === path.join("packages", "token-source", "src")
        ? path.join(targetDir, "design-tokens", "src")
        : initLayout === "app-first" && relativePath === path.join("packages", "token-source", "package.json")
          ? path.join(targetDir, "design-tokens", "package.json")
          : path.join(targetDir, relativePath);
    copyDirectory(sourcePath, destinationPath);
  }

  if (initLayout === "app-first") {
    applyAppFirstLayoutPatches(targetDir);
  }

  const tsconfigBaseSource = path.join(templateRoot, "tsconfig.base.json");
  if (fs.existsSync(tsconfigBaseSource)) {
    fs.copyFileSync(tsconfigBaseSource, path.join(targetDir, "tsconfig.base.json"));
  } else {
    const fallbackTsconfig = {
      compilerOptions: {
        target: "ES2022",
        module: "ESNext",
        moduleResolution: "Bundler",
        strict: true,
        baseUrl: ".",
        paths: {},
        skipLibCheck: true
      }
    };
    fs.writeFileSync(
      path.join(targetDir, "tsconfig.base.json"),
      `${JSON.stringify(fallbackTsconfig, null, 2)}\n`,
      "utf8"
    );
  }

  const licenseSource = path.join(templateRoot, "LICENSE");
  if (fs.existsSync(licenseSource)) {
    fs.copyFileSync(licenseSource, path.join(targetDir, "LICENSE"));
  }

  const workspaceName = sanitizeName(path.basename(targetDir) || "prismforge-studio") || "prismforge-studio";
  writeScaffoldRootPackageJson(targetDir, workspaceName, {
    includeStudio,
    targets,
    packageManager,
    tokenSourcePath: initLayout === "app-first" ? "design-tokens" : "packages/token-source"
  });
  writeScaffoldWorkspaceFile(targetDir);
  writeScaffoldGitignore(targetDir);
  writeScaffoldReadme(targetDir, {
    workspaceTitle: workspaceName,
    initMode,
    layout: initLayout,
    provider,
    repository,
    baseBranch,
    includeStudio,
    targets,
    packageManager
  });
  if (includeStudio) {
    writeStudioEnvExample(targetDir, { provider, repository, baseBranch });
  }

  let embeddedScriptIntegration = null;
  if (initMode === "embedded") {
    embeddedScriptIntegration = attachEmbeddedScriptsToHostProject(
      hostProjectRoot,
      targetDir,
      packageManager
    );
  }

  if (installDeps) {
    const installCommand = getInstallCommandForPackageManager(packageManager);
    const installResult = runCommand(installCommand.command, installCommand.args, {
      cwd: targetDir,
      stdio: "inherit"
    });
    if (installResult.status !== 0) {
      const installDetails = installResult.error?.message
        ? `\nInstall error: ${installResult.error.message}`
        : "";
      fail(
        `Scaffold completed, but dependency installation failed. Run \`${packageManager} install\` manually.${installDetails}`
      );
      return;
    }
  }

  console.log(`PrismForge workspace created at: ${targetDir}`);
  console.log("");
  console.log("Configuration:");
  console.log(`  Init mode: ${initMode}`);
  console.log(`  Layout: ${initLayout}`);
  console.log(`  Provider: ${provider}`);
  console.log(`  Repository: ${repository || "(not set)"}`);
  console.log(`  Base branch: ${baseBranch}`);
  console.log(`  Token targets: ${targets.join(", ")}`);
  console.log(`  Token packages: ${formatTargetPackageList(targets)}`);
  console.log(`  Package manager: ${packageManager}`);
  console.log(`  Token Studio: ${includeStudio ? "enabled" : "disabled"}`);
  if (embeddedScriptIntegration) {
    console.log(`  Host scripts: ${embeddedScriptIntegration.reason}`);
  }
  console.log("");
  console.log("Next steps:");
  if (initMode === "embedded") {
    const workspaceRelative = path.relative(hostProjectRoot, targetDir) || ".";
    const hostCommands = getWorkspaceCommandsForPackageManager(packageManager, workspaceRelative);
    console.log("  1) Stay in your existing project root:");
    console.log(`     ${hostProjectRoot}`);
    if (!installDeps) {
      console.log(`  2) Install embedded workspace dependencies: ${hostCommands.install}`);
    }
    if (includeStudio) {
      const step = installDeps ? 2 : 3;
      console.log(`  ${step}) copy ${workspaceRelative.replace(/\\/gu, "/")}/apps/token-studio/.env.example to .env.local and adjust values`);
      if (embeddedScriptIntegration?.updated) {
        console.log(`  ${step + 1}) ${packageManager} run prismforge:dev`);
      } else {
        console.log(`  ${step + 1}) ${hostCommands.dev}`);
      }
    }
  } else {
    console.log("  1) cd " + targetDir);
    if (packageManager === "pnpm") {
      console.log("  2) corepack enable pnpm");
    } else {
      console.log("  2) npm --version");
    }
    if (!installDeps) {
      console.log(`  3) ${packageManager} install`);
    }
    if (includeStudio) {
      const stepOffset = installDeps ? 3 : 4;
      console.log(`  ${stepOffset}) copy apps/token-studio/.env.example to apps/token-studio/.env.local and adjust values`);
      console.log(`  ${stepOffset + 1}) ${packageManager} run dev`);
    }
  }
  if (includeStudio && !repository) {
    console.log("");
    console.log("Note: repository is empty. Set GIT_REPOSITORY in apps/token-studio/.env.local before using PR flows.");
  }
}

async function commandValidate() {
  const [{ validateTokens, resolveAliases }, { loadMappings, validateMappings }, { loadAllTokenSources }] =
    await Promise.all([
      loadTokenSchemaModule(),
      loadTokenMappingsModule(),
      loadTokenSourceModule()
    ]);

  const sets = loadAllTokenSources();
  const mappings = loadMappings();
  const report = [];
  let hasError = false;

  for (const set of sets) {
    const validation = validateTokens(set);
    const aliasResolution = resolveAliases(set);
    const mappingValidation = validateMappings(mappings, aliasResolution.resolved);

    if (!validation.valid || aliasResolution.errors.length > 0 || !mappingValidation.valid) {
      hasError = true;
    }

    report.push({
      brand: set.brand,
      mode: set.mode,
      tokenCount: set.tokens.length,
      tokenErrors: validation.errors.length,
      aliasErrors: aliasResolution.errors.length,
      mappingErrors: mappingValidation.errors.length
    });
  }

  console.table(report);
  if (hasError) {
    fail("Validation failed.");
    return;
  }
  console.log("Validation passed.");
}

async function commandBuild(flags) {
  const { buildArtifacts } = await loadTokenBuildModule();
  const brand = flags.brand ?? "acme";
  const mode = flags.mode ?? "light";
  const target = flags.target ?? "all";
  const outDir = flags.out ? path.resolve(flags.out) : undefined;
  const result = buildArtifacts({ brand, mode, target, outDir });
  console.log(JSON.stringify(result, null, 2));
}

function loadSnapshotInput(input) {
  if (!input) {
    return null;
  }

  const asPath = path.resolve(input);
  if (fs.existsSync(asPath)) {
    return JSON.parse(fs.readFileSync(asPath, "utf8"));
  }

  const releasesPath = path.resolve(
    process.cwd(),
    "packages",
    "token-source",
    "releases",
    `${input}.json`
  );
  if (fs.existsSync(releasesPath)) {
    return JSON.parse(fs.readFileSync(releasesPath, "utf8"));
  }

  return null;
}

function normalizeSnapshot(snapshot) {
  if (Array.isArray(snapshot)) {
    return snapshot;
  }
  if (Array.isArray(snapshot?.tokens)) {
    return snapshot.tokens;
  }
  throw new Error("Snapshot file must be an array of tokens or an object with `tokens`.");
}

function commandDiff(flags) {
  const fromSnapshot = loadSnapshotInput(flags.from);
  const toSnapshot = loadSnapshotInput(flags.to);

  if (!fromSnapshot || !toSnapshot) {
    fail("Diff requires both --from and --to snapshots or release files.");
    return;
  }

  const fromTokens = normalizeSnapshot(fromSnapshot);
  const toTokens = normalizeSnapshot(toSnapshot);

  const fromMap = new Map(fromTokens.map((token) => [token.id, JSON.stringify(token.$value)]));
  const toMap = new Map(toTokens.map((token) => [token.id, JSON.stringify(token.$value)]));

  const added = [];
  const removed = [];
  const changed = [];

  for (const [id, value] of toMap.entries()) {
    if (!fromMap.has(id)) {
      added.push(id);
      continue;
    }
    if (fromMap.get(id) !== value) {
      changed.push(id);
    }
  }

  for (const id of fromMap.keys()) {
    if (!toMap.has(id)) {
      removed.push(id);
    }
  }

  console.log(JSON.stringify({ added, removed, changed }, null, 2));
}

function commandRelease(flags) {
  const channel = flags.channel;
  const distTagInput = flags["dist-tag"] ?? flags.tag ?? "";
  if (!channel || !SUPPORTED_RELEASE_CHANNELS.includes(channel)) {
    fail("Release command requires --channel <stable|next|alpha|beta|rc|canary|custom>.");
    return;
  }

  let publishTag = "";
  let preMode = null;

  if (channel === "stable") {
    publishTag = "latest";
    if (distTagInput && String(distTagInput).trim() && String(distTagInput).trim() !== "latest") {
      fail('Stable channel always publishes to "latest".');
      return;
    }
  } else if (channel === "custom") {
    const trimmed = String(distTagInput).trim();
    const isValidFormat = /^[A-Za-z0-9][A-Za-z0-9._-]*$/u.test(trimmed);
    if (!trimmed || !isValidFormat || SEMVER_LIKE_PATTERN.test(trimmed) || trimmed === "latest") {
      fail(
        "Custom channel requires --dist-tag with a valid npm dist-tag (letters/numbers/._-, non-semver, not latest)."
      );
      return;
    }
    publishTag = trimmed;
    preMode = trimmed;
  } else {
    publishTag = channel;
    preMode = channel;
  }

  const plan = {
    channel,
    publishTag,
    preMode,
    steps:
      preMode === null
        ? ["pnpm changeset version", `pnpm changeset publish --tag ${publishTag}`]
        : [
            `pnpm changeset pre enter ${preMode}`,
            "pnpm changeset version",
            `pnpm changeset publish --tag ${publishTag}`,
            "pnpm changeset pre exit"
          ]
  };

  const outDir = path.resolve(process.cwd(), "artifacts", "release");
  fs.mkdirSync(outDir, { recursive: true });
  const fileSuffix =
    channel === "custom"
      ? `custom-${publishTag.replace(/[^A-Za-z0-9._-]/gu, "-")}`
      : channel;
  const outFile = path.join(outDir, `release-${fileSuffix}.json`);
  fs.writeFileSync(outFile, `${JSON.stringify(plan, null, 2)}\n`, "utf8");
  console.log(`Release plan written to ${outFile}`);
  console.log(JSON.stringify(plan, null, 2));
}

async function commandFigmaExport(flags) {
  const [{ loadTokenSource }, { resolveAliases }] = await Promise.all([
    loadTokenSourceModule(),
    loadTokenSchemaModule()
  ]);

  const brand = flags.brand ?? "acme";
  const mode = flags.mode ?? "light";
  const set = loadTokenSource({ brand, mode });
  const resolved = resolveAliases(set);

  if (resolved.errors.length > 0) {
    fail(`Cannot export to Figma: ${JSON.stringify(resolved.errors, null, 2)}`);
    return;
  }

  const payload = {
    meta: {
      source: "prismforge",
      exportType: "figma-variables",
      brand,
      mode
    },
    variables: resolved.resolved.map((token) => ({
      name: token.id,
      type: token.$type,
      value: token.$value,
      description: token.description
    }))
  };

  const outFile = flags.out
    ? path.resolve(flags.out)
    : path.resolve(process.cwd(), "artifacts", "figma", `${brand}-${mode}.json`);
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log(`Figma export written to ${outFile}`);
}

async function main() {
  const [, , command, maybeSubcommand, ...rest] = process.argv;
  if (!command || command === "--help" || command === "-h") {
    printHelp();
    return;
  }

  if (command === "figma") {
    const flags = parseFlags(rest);
    if (maybeSubcommand !== "export") {
      fail('Only "prismforge figma export" is supported in v1.');
      return;
    }
    await commandFigmaExport(flags);
    return;
  }

  const flags = parseFlags([maybeSubcommand, ...rest].filter(Boolean));
  switch (command) {
    case "init":
      await commandInit(flags);
      break;
    case "validate":
      await commandValidate();
      break;
    case "build":
      await commandBuild(flags);
      break;
    case "diff":
      commandDiff(flags);
      break;
    case "release":
      commandRelease(flags);
      break;
    default:
      fail(`Unknown command "${command}".`);
      printHelp();
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : "Unexpected CLI error.";
  fail(message);
});


