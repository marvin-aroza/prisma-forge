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

test("prismforge init supports custom studio name", () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "prismforge-init-studio-name-"));
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
      "--studio-name",
      "Acme Token Studio"
    ],
    {
      cwd,
      encoding: "utf8"
    }
  );

  assert.equal(result.status, 0);
  const envExample = fs.readFileSync(path.join(targetDir, "apps", "token-studio", ".env.example"), "utf8");
  assert.match(envExample, /NEXT_PUBLIC_STUDIO_NAME=Acme Token Studio/u);
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

test("prismforge init supports embedded mode in existing projects", () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "prismforge-init-embedded-"));
  fs.writeFileSync(
    path.join(cwd, "package.json"),
    `${JSON.stringify({ name: "host-project", private: true, scripts: { test: "echo test" } }, null, 2)}\n`,
    "utf8"
  );

  const result = spawnSync(
    process.execPath,
    [
      cliPath,
      "init",
      "--mode",
      "embedded",
      "--embedded-path",
      "tools/prismforge",
      "--template-root",
      repoRoot,
      "--package-manager",
      "npm",
      "--studio",
      "true"
    ],
    {
      cwd,
      encoding: "utf8"
    }
  );

  assert.equal(result.status, 0);
  assert.ok(fs.existsSync(path.join(cwd, "tools", "prismforge", "apps", "token-studio", "package.json")));
  assert.ok(fs.existsSync(path.join(cwd, "design-tokens", "src", "tokens")));
  assert.equal(
    fs.existsSync(path.join(cwd, "tools", "prismforge", "packages", "token-source")),
    false
  );

  const hostPackage = JSON.parse(fs.readFileSync(path.join(cwd, "package.json"), "utf8"));
  assert.equal(hostPackage.scripts.test, "echo test");
  assert.equal(hostPackage.scripts["prismforge:dev"], "npm --prefix tools/prismforge run dev");
  assert.equal(hostPackage.scripts["prismforge:install"], "npm --prefix tools/prismforge install");
});

test("prismforge init embedded app-first supports custom --tokens-path", () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "prismforge-init-embedded-custom-tokens-path-"));
  fs.writeFileSync(path.join(cwd, "package.json"), `${JSON.stringify({ name: "host", private: true }, null, 2)}\n`, "utf8");

  const result = spawnSync(
    process.execPath,
    [
      cliPath,
      "init",
      "--mode",
      "embedded",
      "--layout",
      "app-first",
      "--embedded-path",
      "tools/prismforge",
      "--tokens-path",
      "tokens/design",
      "--template-root",
      repoRoot,
      "--package-manager",
      "npm",
      "--studio",
      "true"
    ],
    {
      cwd,
      encoding: "utf8"
    }
  );

  assert.equal(result.status, 0);
  assert.ok(fs.existsSync(path.join(cwd, "tokens", "design", "src", "tokens")));
  assert.equal(fs.existsSync(path.join(cwd, "tools", "prismforge", "design-tokens")), false);
});

test("prismforge init embedded mode supports workspace layout", () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "prismforge-init-embedded-workspace-layout-"));
  fs.writeFileSync(path.join(cwd, "package.json"), `${JSON.stringify({ name: "host", private: true }, null, 2)}\n`, "utf8");

  const result = spawnSync(
    process.execPath,
    [
      cliPath,
      "init",
      "--mode",
      "embedded",
      "--layout",
      "workspace",
      "--embedded-path",
      "tools/prismforge",
      "--template-root",
      repoRoot,
      "--package-manager",
      "npm",
      "--studio",
      "true"
    ],
    {
      cwd,
      encoding: "utf8"
    }
  );

  assert.equal(result.status, 0);
  assert.ok(fs.existsSync(path.join(cwd, "tools", "prismforge", "packages", "token-source", "src", "tokens")));
});

test("prismforge init rejects invalid mode values", () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "prismforge-init-mode-invalid-"));
  const targetDir = path.join(cwd, "studio");
  const result = spawnSync(
    process.execPath,
    [cliPath, "init", "--mode", "inplace", "--dir", targetDir, "--template-root", repoRoot],
    {
      cwd,
      encoding: "utf8"
    }
  );

  assert.equal(result.status, 1);
  assert.match(result.stderr, /Unsupported init mode/u);
});

test("prismforge init rejects invalid layout values", () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "prismforge-init-layout-invalid-"));
  const targetDir = path.join(cwd, "studio");
  const result = spawnSync(
    process.execPath,
    [cliPath, "init", "--layout", "monolith", "--dir", targetDir, "--template-root", repoRoot],
    {
      cwd,
      encoding: "utf8"
    }
  );

  assert.equal(result.status, 1);
  assert.match(result.stderr, /Unsupported init layout/u);
});

test("prismforge brand add creates semantic and component files in token-source workspace", () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "prismforge-brand-add-workspace-"));
  const targetDir = path.join(cwd, "studio");
  const initResult = spawnSync(
    process.execPath,
    [cliPath, "init", "--dir", targetDir, "--studio", "false", "--template-root", repoRoot],
    {
      cwd,
      encoding: "utf8"
    }
  );
  assert.equal(initResult.status, 0);

  const addResult = spawnSync(
    process.execPath,
    [cliPath, "brand", "add", "--brand", "zen", "--modes", "light,dark", "--from", "acme"],
    {
      cwd: targetDir,
      encoding: "utf8"
    }
  );
  assert.equal(addResult.status, 0);

  const semanticFile = path.join(targetDir, "packages", "token-source", "src", "tokens", "semantic", "zen", "light.json");
  const componentFile = path.join(targetDir, "packages", "token-source", "src", "tokens", "component", "zen", "dark.json");
  assert.ok(fs.existsSync(semanticFile));
  assert.ok(fs.existsSync(componentFile));

  const semanticContent = fs.readFileSync(semanticFile, "utf8");
  assert.match(semanticContent, /"brand": "zen"/u);
});


