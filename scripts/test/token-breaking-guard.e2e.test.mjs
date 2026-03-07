import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const guardScript = path.resolve(__dirname, "..", "token-breaking-guard.mjs");

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8"
  });
  if (result.status !== 0) {
    const error = new Error(result.stderr || result.stdout || `Command failed: ${command} ${args.join(" ")}`);
    error.result = result;
    throw error;
  }
}

function writeJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function writeText(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf8");
}

function createTokenSnapshot(ids) {
  const tokens = {};
  for (const id of ids) {
    tokens[id] = {
      id,
      $type: "color",
      $value: "#1473E6"
    };
  }
  return { dk: { generated: tokens } };
}

function setupRepo() {
  const repoDir = fs.mkdtempSync(path.join(os.tmpdir(), "prismforge-guard-e2e-"));
  run("git", ["init"], repoDir);
  run("git", ["config", "user.name", "PrismForge Test"], repoDir);
  run("git", ["config", "user.email", "test@prismforge.dev"], repoDir);

  const tokenFile = path.join(
    repoDir,
    "packages",
    "token-source",
    "src",
    "tokens",
    "reference",
    "global.json"
  );
  writeJson(tokenFile, createTokenSnapshot(["dk.color.test.a.base", "dk.color.test.b.base"]));
  run("git", ["add", "."], repoDir);
  run("git", ["commit", "-m", "baseline tokens"], repoDir);

  return { repoDir, tokenFile };
}

function runGuard(repoDir) {
  return spawnSync(process.execPath, [guardScript, "--base-ref", "HEAD~1"], {
    cwd: repoDir,
    encoding: "utf8"
  });
}

test("breaking guard skips when base ref cannot be resolved outside CI", () => {
  const repoDir = fs.mkdtempSync(path.join(os.tmpdir(), "prismforge-guard-unresolved-local-"));
  const result = spawnSync(process.execPath, [guardScript, "--base-ref", "origin/does-not-exist"], {
    cwd: repoDir,
    encoding: "utf8",
    env: { ...process.env, CI: "false" }
  });

  assert.equal(result.status, 0);
  assert.match(result.stdout, /Skipping breaking-token guard/u);

  fs.rmSync(repoDir, { recursive: true, force: true });
});

test("breaking guard fails when base ref cannot be resolved in CI", () => {
  const repoDir = fs.mkdtempSync(path.join(os.tmpdir(), "prismforge-guard-unresolved-ci-"));
  const result = spawnSync(process.execPath, [guardScript, "--base-ref", "origin/does-not-exist"], {
    cwd: repoDir,
    encoding: "utf8",
    env: { ...process.env, CI: "true" }
  });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /Unable to resolve base ref/u);

  fs.rmSync(repoDir, { recursive: true, force: true });
});

test("breaking guard exits non-zero when token IDs are removed without major changeset", () => {
  const { repoDir, tokenFile } = setupRepo();

  writeJson(tokenFile, createTokenSnapshot(["dk.color.test.b.base"]));
  writeText(
    path.join(repoDir, ".changeset", "patch-only.md"),
    `---
"@prismforge/tokens-css": patch
---

Patch-level update only.
`
  );
  run("git", ["add", "."], repoDir);
  run("git", ["commit", "-m", "remove token without major changeset"], repoDir);

  const result = runGuard(repoDir);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Breaking token changes detected/u);
  assert.match(result.stderr, /dk\.color\.test\.a\.base/u);

  fs.rmSync(repoDir, { recursive: true, force: true });
});

test("breaking guard passes when token IDs are removed with a major changeset", () => {
  const { repoDir, tokenFile } = setupRepo();

  writeJson(tokenFile, createTokenSnapshot(["dk.color.test.b.base"]));
  writeText(
    path.join(repoDir, ".changeset", "major-change.md"),
    `---
"@prismforge/tokens-css": major
---

Remove deprecated token.
`
  );
  run("git", ["add", "."], repoDir);
  run("git", ["commit", "-m", "remove token with major changeset"], repoDir);

  const result = runGuard(repoDir);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /major changeset present/u);

  fs.rmSync(repoDir, { recursive: true, force: true });
});
