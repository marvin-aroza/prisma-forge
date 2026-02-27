import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { loadTokenSource } from "../../token-source/src/index.js";
import { buildArtifacts } from "../src/index.js";

test("buildArtifacts produces deterministic hash across runs", () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "prismforge-build-"));
  const source = loadTokenSource({ brand: "acme", mode: "light" });

  const first = buildArtifacts(source, {
    brand: "acme",
    mode: "light",
    target: "all",
    outDir: path.join(tmpRoot, "run-1")
  });

  const second = buildArtifacts(source, {
    brand: "acme",
    mode: "light",
    target: "all",
    outDir: path.join(tmpRoot, "run-2")
  });

  assert.equal(first.hash, second.hash);
  assert.equal(first.targets.length, 4);
});


