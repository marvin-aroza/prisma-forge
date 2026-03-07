import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const cliPath = path.join(__dirname, "..", "src", "cli.js");
const repoRoot = path.join(__dirname, "..", "..", "..");

function runGit(args, cwd) {
  return spawnSync("git", args, {
    cwd,
    encoding: "utf8"
  });
}

test("prismforge without args prints help without module resolution failures", () => {
  const result = spawnSync(process.execPath, [cliPath], {
    cwd: repoRoot,
    encoding: "utf8"
  });

  assert.equal(result.status, 0);
  assert.match(result.stdout, /PrismForge CLI/u);
  assert.doesNotMatch(result.stderr, /ERR_MODULE_NOT_FOUND/u);
});

test("prismforge validate exits successfully", () => {
  const result = spawnSync(process.execPath, [cliPath, "validate"], {
    cwd: repoRoot,
    encoding: "utf8"
  });

  assert.equal(result.status, 0);
  assert.ok(result.stdout.includes("Validation passed."));
});

test("prismforge figma export writes file", () => {
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "prismforge-figma-"));
  const outFile = path.join(outDir, "figma.json");
  const result = spawnSync(
    process.execPath,
    [cliPath, "figma", "export", "--brand", "acme", "--mode", "light", "--out", outFile],
    {
      cwd: repoRoot,
      encoding: "utf8"
    }
  );

  assert.equal(result.status, 0);
  assert.ok(fs.existsSync(outFile));
});

test("prismforge release --channel stable writes stable release plan", () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "prismforge-release-stable-"));
  const result = spawnSync(process.execPath, [cliPath, "release", "--channel", "stable"], {
    cwd,
    encoding: "utf8"
  });

  assert.equal(result.status, 0);
  const outFile = path.join(cwd, "artifacts", "release", "release-stable.json");
  assert.ok(fs.existsSync(outFile));
  const plan = JSON.parse(fs.readFileSync(outFile, "utf8"));
  assert.equal(plan.channel, "stable");
  assert.equal(plan.publishTag, "latest");
  assert.ok(Array.isArray(plan.steps));
  assert.ok(plan.steps.includes("pnpm changeset publish --tag latest"));
});

test("prismforge release --channel next writes next release plan", () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "prismforge-release-next-"));
  const result = spawnSync(process.execPath, [cliPath, "release", "--channel", "next"], {
    cwd,
    encoding: "utf8"
  });

  assert.equal(result.status, 0);
  const outFile = path.join(cwd, "artifacts", "release", "release-next.json");
  assert.ok(fs.existsSync(outFile));
  const plan = JSON.parse(fs.readFileSync(outFile, "utf8"));
  assert.equal(plan.channel, "next");
  assert.equal(plan.publishTag, "next");
  assert.ok(Array.isArray(plan.steps));
  assert.ok(plan.steps.includes("pnpm changeset pre enter next"));
  assert.ok(plan.steps.includes("pnpm changeset publish --tag next"));
});

test("prismforge release --channel alpha writes alpha release plan", () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "prismforge-release-alpha-"));
  const result = spawnSync(process.execPath, [cliPath, "release", "--channel", "alpha"], {
    cwd,
    encoding: "utf8"
  });

  assert.equal(result.status, 0);
  const outFile = path.join(cwd, "artifacts", "release", "release-alpha.json");
  assert.ok(fs.existsSync(outFile));
  const plan = JSON.parse(fs.readFileSync(outFile, "utf8"));
  assert.equal(plan.channel, "alpha");
  assert.equal(plan.publishTag, "alpha");
  assert.equal(plan.preMode, "alpha");
  assert.ok(Array.isArray(plan.steps));
  assert.ok(plan.steps.includes("pnpm changeset pre enter alpha"));
  assert.ok(plan.steps.includes("pnpm changeset publish --tag alpha"));
});

test("prismforge release --channel custom writes custom release plan", () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "prismforge-release-custom-"));
  const result = spawnSync(
    process.execPath,
    [cliPath, "release", "--channel", "custom", "--dist-tag", "experimental-ui"],
    {
      cwd,
      encoding: "utf8"
    }
  );

  assert.equal(result.status, 0);
  const outFile = path.join(cwd, "artifacts", "release", "release-custom-experimental-ui.json");
  assert.ok(fs.existsSync(outFile));
  const plan = JSON.parse(fs.readFileSync(outFile, "utf8"));
  assert.equal(plan.channel, "custom");
  assert.equal(plan.publishTag, "experimental-ui");
  assert.equal(plan.preMode, "experimental-ui");
  assert.ok(Array.isArray(plan.steps));
  assert.ok(plan.steps.includes("pnpm changeset pre enter experimental-ui"));
  assert.ok(plan.steps.includes("pnpm changeset publish --tag experimental-ui"));
});

test("prismforge release --channel beta writes beta release plan", () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "prismforge-release-beta-"));
  const result = spawnSync(process.execPath, [cliPath, "release", "--channel", "beta"], {
    cwd,
    encoding: "utf8"
  });

  assert.equal(result.status, 0);
  const outFile = path.join(cwd, "artifacts", "release", "release-beta.json");
  assert.ok(fs.existsSync(outFile));
  const plan = JSON.parse(fs.readFileSync(outFile, "utf8"));
  assert.equal(plan.channel, "beta");
  assert.equal(plan.publishTag, "beta");
  assert.equal(plan.preMode, "beta");
  assert.ok(plan.steps.includes("pnpm changeset pre enter beta"));
  assert.ok(plan.steps.includes("pnpm changeset publish --tag beta"));
});

test("prismforge release rejects custom channel without dist-tag", () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "prismforge-release-custom-missing-"));
  const result = spawnSync(process.execPath, [cliPath, "release", "--channel", "custom"], {
    cwd,
    encoding: "utf8"
  });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /requires --dist-tag/u);
});

test("prismforge release rejects invalid channel value", () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "prismforge-release-channel-invalid-"));
  const result = spawnSync(process.execPath, [cliPath, "release", "--channel", "ga"], {
    cwd,
    encoding: "utf8"
  });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /requires --channel <stable\|next\|alpha\|beta\|rc\|canary\|custom>/u);
});

test("prismforge release rejects semver-like custom dist-tag", () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "prismforge-release-custom-semver-"));
  const result = spawnSync(
    process.execPath,
    [cliPath, "release", "--channel", "custom", "--dist-tag", "1.2.3"],
    {
      cwd,
      encoding: "utf8"
    }
  );

  assert.equal(result.status, 1);
  assert.match(result.stderr, /valid npm dist-tag/u);
});

test("prismforge init scaffolds a self-hosted studio workspace", () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "prismforge-init-workspace-"));
  const targetDir = path.join(cwd, "studio");
  const result = spawnSync(
    process.execPath,
    [
      cliPath,
      "init",
      "--dir",
      targetDir,
      "--provider",
      "gitlab",
      "--repository",
      "acme/platform-tokens",
      "--base-branch",
      "develop",
      "--template-root",
      repoRoot
    ],
    {
      cwd,
      encoding: "utf8"
    }
  );

  assert.equal(result.status, 0);
  assert.ok(fs.existsSync(path.join(targetDir, "apps", "token-studio", "package.json")));
  assert.ok(fs.existsSync(path.join(targetDir, "packages", "token-source", "src", "tokens")));
  assert.ok(fs.existsSync(path.join(targetDir, "packages", "token-schema", "src", "index.js")));
  assert.ok(fs.existsSync(path.join(targetDir, "packages", "token-mappings", "src", "index.js")));

  const envExample = fs.readFileSync(path.join(targetDir, "apps", "token-studio", ".env.example"), "utf8");
  assert.match(envExample, /GIT_PROVIDER=gitlab/u);
  assert.match(envExample, /GIT_REPOSITORY=acme\/platform-tokens/u);
  assert.match(envExample, /GIT_BASE_BRANCH=develop/u);
});

test("prismforge init rejects non-empty target directories unless --force is used", () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "prismforge-init-non-empty-"));
  const targetDir = path.join(cwd, "studio");
  fs.mkdirSync(targetDir, { recursive: true });
  fs.writeFileSync(path.join(targetDir, "placeholder.txt"), "seed", "utf8");

  const result = spawnSync(
    process.execPath,
    [cliPath, "init", "--dir", targetDir, "--template-root", repoRoot],
    {
      cwd,
      encoding: "utf8"
    }
  );

  assert.equal(result.status, 1);
  assert.match(result.stderr, /already exists and is not empty/u);
});

test("prismforge init supports tokens-only scaffolds without Token Studio", () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "prismforge-init-tokens-only-"));
  const targetDir = path.join(cwd, "tokens-only");
  const result = spawnSync(
    process.execPath,
    [
      cliPath,
      "init",
      "--dir",
      targetDir,
      "--studio",
      "false",
      "--targets",
      "ios",
      "--template-root",
      repoRoot
    ],
    {
      cwd,
      encoding: "utf8"
    }
  );

  assert.equal(result.status, 0);
  assert.equal(fs.existsSync(path.join(targetDir, "apps", "token-studio")), false);
  assert.ok(fs.existsSync(path.join(targetDir, "packages", "token-source", "src", "tokens")));

  const packageJson = JSON.parse(fs.readFileSync(path.join(targetDir, "package.json"), "utf8"));
  assert.equal(packageJson.scripts.dev, undefined);
  assert.equal(packageJson.dependencies["@prismforge/tokens-ios"], "latest");
  assert.equal(packageJson.dependencies["@prismforge/tokens-css"], undefined);
});

test("prismforge init rejects unknown token targets", () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "prismforge-init-target-invalid-"));
  const targetDir = path.join(cwd, "invalid-target");
  const result = spawnSync(
    process.execPath,
    [cliPath, "init", "--dir", targetDir, "--targets", "flutter", "--template-root", repoRoot],
    {
      cwd,
      encoding: "utf8"
    }
  );

  assert.equal(result.status, 1);
  assert.match(result.stderr, /Unknown token target/u);
});

test("prismforge init detects provider and repository from origin remote", () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "prismforge-init-detect-git-"));
  assert.equal(runGit(["init"], cwd).status, 0);
  assert.equal(runGit(["remote", "add", "origin", "https://github.com/acme/platform-tokens.git"], cwd).status, 0);

  const targetDir = path.join(cwd, "studio");
  const result = spawnSync(
    process.execPath,
    [cliPath, "init", "--dir", targetDir, "--template-root", repoRoot, "--studio", "true"],
    {
      cwd,
      encoding: "utf8"
    }
  );

  assert.equal(result.status, 0);
  const envExample = fs.readFileSync(path.join(targetDir, "apps", "token-studio", ".env.example"), "utf8");
  assert.match(envExample, /GIT_PROVIDER=github/u);
  assert.match(envExample, /GIT_REPOSITORY=acme\/platform-tokens/u);
});

test("prismforge init allows empty repository for new workspaces", () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "prismforge-init-empty-repo-"));
  const targetDir = path.join(cwd, "studio");
  const result = spawnSync(
    process.execPath,
    [cliPath, "init", "--dir", targetDir, "--template-root", repoRoot, "--studio", "true"],
    {
      cwd,
      encoding: "utf8"
    }
  );

  assert.equal(result.status, 0);
  const envExample = fs.readFileSync(path.join(targetDir, "apps", "token-studio", ".env.example"), "utf8");
  assert.match(envExample, /^GIT_REPOSITORY=$/mu);
});

test("prismforge init uses npm install flow when package manager is npm", () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "prismforge-init-npm-pm-"));
  const targetDir = path.join(cwd, "studio");
  const result = spawnSync(
    process.execPath,
    [
      cliPath,
      "init",
      "--dir",
      targetDir,
      "--template-root",
      repoRoot,
      "--studio",
      "true",
      "--package-manager",
      "npm"
    ],
    {
      cwd,
      encoding: "utf8"
    }
  );

  assert.equal(result.status, 0);
  const packageJson = JSON.parse(fs.readFileSync(path.join(targetDir, "package.json"), "utf8"));
  assert.equal(packageJson.packageManager, undefined);
  assert.equal(packageJson.scripts.dev, "npm run dev --workspace @prismforge/token-studio");
  assert.ok(Array.isArray(packageJson.workspaces));
});


