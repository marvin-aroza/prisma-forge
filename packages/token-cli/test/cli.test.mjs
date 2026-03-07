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

test("prismforge validate exits successfully", () => {
  const result = spawnSync(process.execPath, [cliPath, "validate"], {
    cwd: path.join(__dirname, "..", "..", ".."),
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
      cwd: path.join(__dirname, "..", "..", ".."),
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

test("prismforge release rejects invalid channel", () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "prismforge-release-invalid-"));
  const result = spawnSync(process.execPath, [cliPath, "release", "--channel", "beta"], {
    cwd,
    encoding: "utf8"
  });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /requires --channel <stable\|next>/u);
});


