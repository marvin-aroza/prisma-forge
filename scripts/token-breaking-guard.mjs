import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const TOKENS_DIR = "packages/token-source/src/tokens";

function parseFlags(args) {
  const flags = {};
  for (let index = 0; index < args.length; index += 1) {
    const current = args[index];
    if (!current.startsWith("--")) {
      continue;
    }
    const key = current.slice(2);
    const next = args[index + 1];
    if (!next || next.startsWith("--")) {
      flags[key] = true;
    } else {
      flags[key] = next;
      index += 1;
    }
  }
  return flags;
}

function runGit(args, { allowFailure = false } = {}) {
  try {
    return execFileSync("git", args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    }).trim();
  } catch (error) {
    if (allowFailure) {
      return null;
    }
    throw error;
  }
}

function canResolveRef(ref) {
  return Boolean(runGit(["rev-parse", "--verify", `${ref}^{commit}`], { allowFailure: true }));
}

function listBaseTokenFiles(baseRef) {
  const output = runGit(["ls-tree", "-r", "--name-only", baseRef, TOKENS_DIR], {
    allowFailure: true
  });
  if (!output) {
    return [];
  }
  return output
    .split("\n")
    .map((entry) => entry.trim())
    .filter((entry) => entry.endsWith(".json"));
}

function listCurrentTokenFiles() {
  const root = path.resolve(process.cwd(), TOKENS_DIR);
  if (!fs.existsSync(root)) {
    return [];
  }

  const stack = [root];
  const files = [];
  while (stack.length > 0) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(absolute);
      } else if (entry.isFile() && entry.name.endsWith(".json")) {
        const relative = path.relative(process.cwd(), absolute).replace(/\\/gu, "/");
        files.push(relative);
      }
    }
  }

  return files;
}

function readJsonFromRef(baseRef, repoPath) {
  const text = runGit(["show", `${baseRef}:${repoPath}`], { allowFailure: true });
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function readJsonFromDisk(repoPath) {
  const absolute = path.resolve(process.cwd(), repoPath);
  if (!fs.existsSync(absolute)) {
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(absolute, "utf8"));
  } catch {
    return null;
  }
}

export function collectTokenIds(node, ids = new Set()) {
  if (!node || typeof node !== "object") {
    return ids;
  }

  if (Array.isArray(node)) {
    for (const entry of node) {
      collectTokenIds(entry, ids);
    }
    return ids;
  }

  if (
    Object.prototype.hasOwnProperty.call(node, "id") &&
    Object.prototype.hasOwnProperty.call(node, "$value") &&
    typeof node.id === "string"
  ) {
    ids.add(node.id);
  }

  for (const value of Object.values(node)) {
    collectTokenIds(value, ids);
  }

  return ids;
}

export function findRemovedTokenIds(baseJsonByFile, headJsonByFile) {
  const files = new Set([...Object.keys(baseJsonByFile), ...Object.keys(headJsonByFile)]);
  const removed = new Set();

  for (const file of files) {
    const baseIds = collectTokenIds(baseJsonByFile[file]);
    const headIds = collectTokenIds(headJsonByFile[file]);
    for (const id of baseIds) {
      if (!headIds.has(id)) {
        removed.add(id);
      }
    }
  }

  return [...removed].sort((a, b) => a.localeCompare(b));
}

function getChangesetFiles() {
  const changesetDir = path.resolve(process.cwd(), ".changeset");
  if (!fs.existsSync(changesetDir)) {
    return [];
  }

  return fs
    .readdirSync(changesetDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md") && entry.name !== "README.md")
    .map((entry) => path.join(changesetDir, entry.name));
}

export function hasMajorChangesetInContents(changesetContents) {
  for (const text of changesetContents) {
    const frontmatter = text.match(/^---\r?\n([\s\S]*?)\r?\n---/u);
    if (!frontmatter) {
      continue;
    }
    if (/:\s*major\b/u.test(frontmatter[1])) {
      return true;
    }
  }
  return false;
}

function hasMajorChangeset() {
  const contents = getChangesetFiles().map((file) => fs.readFileSync(file, "utf8"));
  return hasMajorChangesetInContents(contents);
}

function printRemovedIds(removedIds) {
  const limit = 50;
  const shown = removedIds.slice(0, limit);
  console.error("Detected removed token IDs:");
  for (const id of shown) {
    console.error(`- ${id}`);
  }
  if (removedIds.length > limit) {
    console.error(`...and ${removedIds.length - limit} more.`);
  }
}

function main() {
  const flags = parseFlags(process.argv.slice(2));
  const requestedBaseRef = flags["base-ref"];
  const inferredBaseRef = process.env.GITHUB_BASE_REF
    ? `origin/${process.env.GITHUB_BASE_REF}`
    : "origin/main";
  const baseRef = requestedBaseRef || inferredBaseRef;

  if (!canResolveRef(baseRef)) {
    const inCi = process.env.CI === "true";
    const message = `Unable to resolve base ref "${baseRef}".`;
    if (inCi) {
      console.error(`ERROR: ${message}`);
      process.exit(1);
    }
    console.log(`Skipping breaking-token guard: ${message}`);
    return;
  }

  const allFiles = new Set([...listBaseTokenFiles(baseRef), ...listCurrentTokenFiles()]);
  const baseJsonByFile = {};
  const headJsonByFile = {};
  for (const file of allFiles) {
    baseJsonByFile[file] = readJsonFromRef(baseRef, file);
    headJsonByFile[file] = readJsonFromDisk(file);
  }
  const removedIds = findRemovedTokenIds(baseJsonByFile, headJsonByFile);

  if (removedIds.length === 0) {
    console.log("Breaking-token guard passed: no removed token IDs detected.");
    return;
  }

  if (!hasMajorChangeset()) {
    printRemovedIds(removedIds);
    console.error(
      "ERROR: Breaking token changes detected. Add a major changeset before merging this PR."
    );
    process.exit(1);
  }

  console.log(
    `Breaking-token guard passed: ${removedIds.length} removed token IDs detected and major changeset present.`
  );
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : null;
const isDirectRun = invokedPath && pathToFileURL(invokedPath).href === import.meta.url;
if (isDirectRun) {
  main();
}
