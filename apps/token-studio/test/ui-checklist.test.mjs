import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootPageFile = path.join(__dirname, "..", "app", "page.tsx");
const workspaceFile = path.join(__dirname, "..", "app", "components", "studio-workspace.tsx");
const studioPageFile = path.join(__dirname, "..", "app", "studio", "page.tsx");
const previewPageFile = path.join(__dirname, "..", "app", "studio", "preview", "page.tsx");
const diffPageFile = path.join(__dirname, "..", "app", "studio", "diff", "page.tsx");
const catalogPageFile = path.join(__dirname, "..", "app", "studio", "catalog", "page.tsx");
const componentsPageFile = path.join(__dirname, "..", "app", "studio", "components", "page.tsx");
const editPageFile = path.join(__dirname, "..", "app", "studio", "edit", "page.tsx");
const docsComponentsFile = path.join(__dirname, "..", "app", "docs", "components", "page.tsx");
const formFile = path.join(__dirname, "..", "app", "components", "token-change-form.tsx");
const apiFile = path.join(__dirname, "..", "app", "api", "pr", "route.ts");

test("Token Studio page contains required viewer capabilities", () => {
  const content = fs.readFileSync(workspaceFile, "utf8");
  assert.ok(content.includes("Theme and Filter Controls"));
  assert.ok(content.includes("Visual Preview Board"));
  assert.ok(content.includes("Diff Analysis"));
  assert.ok(content.includes("Token Catalog"));
  assert.ok(content.includes("Component Widgets"));
  assert.ok(content.includes("Date Picker"));
  assert.ok(content.includes("File Upload"));
  assert.ok(content.includes("Combobox"));
  assert.ok(content.includes("Segmented Control"));
  assert.ok(content.includes("Split Button"));
  assert.ok(content.includes("Toolbar"));
  assert.ok(content.includes("Side Nav"));
  assert.ok(content.includes("Toggle Group"));
  assert.ok(content.includes("Search"));
  assert.ok(content.includes("Command Bar"));
  assert.ok(content.includes("Action Group"));
  assert.ok(content.includes("Status Light"));
  assert.ok(content.includes("Tray"));
  assert.ok(content.includes("Well"));
});

test("Studio route split and PR workflow files exist", () => {
  const rootContent = fs.readFileSync(rootPageFile, "utf8");
  assert.ok(rootContent.includes("redirect(\"/studio\")"));
  assert.ok(fs.existsSync(studioPageFile));
  assert.ok(fs.existsSync(previewPageFile));
  assert.ok(fs.existsSync(diffPageFile));
  assert.ok(fs.existsSync(catalogPageFile));
  assert.ok(fs.existsSync(componentsPageFile));
  assert.ok(fs.existsSync(editPageFile));
  assert.ok(fs.existsSync(formFile));
  assert.ok(fs.existsSync(apiFile));
});

test("Component docs include featured examples for latest widget batch", () => {
  const content = fs.readFileSync(docsComponentsFile, "utf8");
  assert.ok(content.includes("Featured Component Examples"));
  assert.ok(content.includes("Action Group"));
  assert.ok(content.includes("Status Light"));
  assert.ok(content.includes("Tray"));
  assert.ok(content.includes("Well"));
});
