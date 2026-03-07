import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const releaseGuardScript = path.resolve(__dirname, "..", "release-guard.mjs");

function runReleaseGuard(cwd, args) {
  return spawnSync(process.execPath, [releaseGuardScript, ...args], {
    cwd,
    encoding: "utf8"
  });
}

function createTempRepoConfig(access = "public") {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "prismforge-release-guard-"));
  const changesetDir = path.join(cwd, ".changeset");
  fs.mkdirSync(changesetDir, { recursive: true });
  fs.writeFileSync(
    path.join(changesetDir, "config.json"),
    `${JSON.stringify({ access }, null, 2)}\n`,
    "utf8"
  );
  return cwd;
}

test("release guard passes for stable with public access config", () => {
  const cwd = createTempRepoConfig("public");
  const result = runReleaseGuard(cwd, ["--channel", "stable"]);

  assert.equal(result.status, 0);
  assert.match(result.stdout, /channel=stable/u);
  assert.match(result.stdout, /dist-tag=latest/u);
});

test("release guard passes for next with public access config", () => {
  const cwd = createTempRepoConfig("public");
  const result = runReleaseGuard(cwd, ["--channel", "next"]);

  assert.equal(result.status, 0);
  assert.match(result.stdout, /channel=next/u);
  assert.match(result.stdout, /dist-tag=next/u);
});

test("release guard passes for alpha with public access config", () => {
  const cwd = createTempRepoConfig("public");
  const result = runReleaseGuard(cwd, ["--channel", "alpha"]);

  assert.equal(result.status, 0);
  assert.match(result.stdout, /channel=alpha/u);
  assert.match(result.stdout, /dist-tag=alpha/u);
});

test("release guard passes for custom channel with explicit dist-tag", () => {
  const cwd = createTempRepoConfig("public");
  const result = runReleaseGuard(cwd, ["--channel", "custom", "--dist-tag", "preview-build"]);

  assert.equal(result.status, 0);
  assert.match(result.stdout, /channel=custom/u);
  assert.match(result.stdout, /dist-tag=preview-build/u);
});

test("release guard fails when .changeset/config.json is missing", () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "prismforge-release-guard-missing-"));
  const result = runReleaseGuard(cwd, ["--channel", "stable"]);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /Missing \.changeset\/config\.json/u);
});

test("release guard fails when access is not public", () => {
  const cwd = createTempRepoConfig("restricted");
  const result = runReleaseGuard(cwd, ["--channel", "stable"]);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /must use public access/u);
});

test("release guard fails for invalid channel", () => {
  const cwd = createTempRepoConfig("public");
  const result = runReleaseGuard(cwd, ["--channel", "ga"]);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /Invalid --channel/u);
});

test("release guard fails when custom channel is missing dist-tag", () => {
  const cwd = createTempRepoConfig("public");
  const result = runReleaseGuard(cwd, ["--channel", "custom"]);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /requires a valid --dist-tag/u);
});

test("release guard fails when custom dist-tag is semver-like", () => {
  const cwd = createTempRepoConfig("public");
  const result = runReleaseGuard(cwd, ["--channel", "custom", "--dist-tag", "1.2.3"]);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /requires a valid --dist-tag/u);
});
