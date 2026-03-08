import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const preflightScript = path.resolve(__dirname, "..", "release-preflight.mjs");

function runPreflight(cwd, args = []) {
  return spawnSync(process.execPath, [preflightScript, ...args], {
    cwd,
    encoding: "utf8"
  });
}

function makeRepoRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "prismforge-release-preflight-"));
}

function write(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf8");
}

test("release preflight passes when valid pending changeset exists", () => {
  const cwd = makeRepoRoot();
  write(
    path.join(cwd, ".changeset", "valid.md"),
    `---
"@prismforge/tokens-css": patch
---

Token update.
`
  );

  const result = runPreflight(cwd);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /Release preflight passed/u);
});

test("release preflight fails when there are no pending changesets", () => {
  const cwd = makeRepoRoot();
  write(path.join(cwd, ".changeset", "README.md"), "# changesets");

  const result = runPreflight(cwd);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /No pending changesets found/u);
});

test("release preflight allows empty changesets when --allow-empty is passed", () => {
  const cwd = makeRepoRoot();
  write(path.join(cwd, ".changeset", "README.md"), "# changesets");

  const result = runPreflight(cwd, ["--allow-empty"]);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /allowed for dry run/u);
});

test("release preflight fails when changeset is missing frontmatter", () => {
  const cwd = makeRepoRoot();
  write(path.join(cwd, ".changeset", "broken.md"), "No frontmatter");

  const result = runPreflight(cwd);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /missing frontmatter/u);
});

test("release preflight fails when changeset has no package entries", () => {
  const cwd = makeRepoRoot();
  write(
    path.join(cwd, ".changeset", "empty.md"),
    `---
---

Body but no package entries.
`
  );

  const result = runPreflight(cwd);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /no package release entries/u);
});
