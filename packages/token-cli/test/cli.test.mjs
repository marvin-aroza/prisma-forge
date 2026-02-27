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


