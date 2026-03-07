import fs from "node:fs";
import path from "node:path";

const CHANGESET_DIR = path.join(process.cwd(), ".changeset");

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

function getChangesetMarkdownFiles() {
  if (!fs.existsSync(CHANGESET_DIR)) {
    return [];
  }

  return fs
    .readdirSync(CHANGESET_DIR, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md") && entry.name !== "README.md")
    .map((entry) => path.join(CHANGESET_DIR, entry.name));
}

function parseFrontmatter(content) {
  if (!content.startsWith("---")) {
    return null;
  }

  const lines = content.split(/\r?\n/u);
  if (lines.length < 2 || lines[0] !== "---") {
    return null;
  }

  const closingIndex = lines.slice(1).findIndex((line) => line === "---");
  if (closingIndex < 0) {
    return null;
  }

  return lines.slice(1, closingIndex + 1).join("\n");
}

function hasPackageEntries(frontmatterText) {
  return /"[^"]+"\s*:\s*(major|minor|patch)\b/u.test(frontmatterText);
}

function main() {
  const files = getChangesetMarkdownFiles();
  if (files.length === 0) {
    fail("No pending changesets found. Add a changeset before running release.");
  }

  let validCount = 0;
  for (const file of files) {
    const content = fs.readFileSync(file, "utf8");
    const frontmatter = parseFrontmatter(content);
    if (frontmatter === null) {
      fail(`Invalid changeset format (missing frontmatter): ${path.basename(file)}`);
    }
    if (!hasPackageEntries(frontmatter)) {
      fail(`Changeset has no package release entries: ${path.basename(file)}`);
    }
    validCount += 1;
  }

  console.log(`Release preflight passed: ${validCount} pending changeset(s) detected.`);
}

main();
