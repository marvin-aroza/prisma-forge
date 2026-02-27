import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pageFile = path.join(__dirname, "..", "app", "page.tsx");
const formFile = path.join(__dirname, "..", "app", "components", "token-change-form.tsx");
const apiFile = path.join(__dirname, "..", "app", "api", "pr", "route.ts");

test("Token Studio page contains required viewer capabilities", () => {
  const content = fs.readFileSync(pageFile, "utf8");
  assert.ok(content.includes("Theme and Filter Controls"));
  assert.ok(content.includes("Visual Preview Board"));
  assert.ok(content.includes("Diff Analysis"));
  assert.ok(content.includes("Token Catalog"));
});

test("Guided editor and PR workflow files exist", () => {
  assert.ok(fs.existsSync(formFile));
  assert.ok(fs.existsSync(apiFile));
});
