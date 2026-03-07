import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const REPO_ROOT = path.resolve(__dirname, "../../../../..");

export const TOKEN_SOURCE_ROOT = path.join(
  REPO_ROOT,
  "packages",
  "token-source",
  "src",
  "tokens"
);

export const TOKEN_MAPPINGS_ROOT = path.join(REPO_ROOT, "packages", "token-mappings", "src");

const TARGET_FILES = [
  ({ brand, mode }) => path.join(TOKEN_SOURCE_ROOT, "component", brand, `${mode}.json`),
  ({ brand, mode }) => path.join(TOKEN_SOURCE_ROOT, "semantic", brand, `${mode}.json`),
  () => path.join(TOKEN_SOURCE_ROOT, "reference", "global.json")
];

function isRecord(value) {
  return Boolean(value) && typeof value === "object";
}

function isTokenNode(node) {
  return isRecord(node) && typeof node.id === "string" && Object.prototype.hasOwnProperty.call(node, "$value");
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function hasTokenId(node, tokenId) {
  if (!isRecord(node)) {
    return false;
  }

  if (isTokenNode(node) && node.id === tokenId) {
    return true;
  }

  for (const child of Object.values(node)) {
    if (hasTokenId(child, tokenId)) {
      return true;
    }
  }

  return false;
}

export function updateTokenInObject(node, token) {
  if (!isRecord(node)) {
    return false;
  }

  if (isTokenNode(node) && node.id === token.id) {
    for (const key of Object.keys(node)) {
      delete node[key];
    }
    Object.assign(node, deepClone(token));
    return true;
  }

  for (const child of Object.values(node)) {
    if (updateTokenInObject(child, token)) {
      return true;
    }
  }

  return false;
}

export function updateTokenJsonText(fileText, token) {
  const parsed = JSON.parse(fileText);
  const updated = updateTokenInObject(parsed, token);
  const nextText = `${JSON.stringify(parsed, null, 2)}\n`;
  return { updated, nextText };
}

function ensureGeneratedBucket(parsed) {
  if (!isRecord(parsed.dk)) {
    parsed.dk = {};
  }
  if (!isRecord(parsed.dk.generated)) {
    parsed.dk.generated = {};
  }
  return parsed.dk.generated;
}

export function upsertTokenJsonText(fileText, token, options = {}) {
  const parsed = JSON.parse(fileText);
  const updated = updateTokenInObject(parsed, token);
  let created = false;

  if (!updated && options.createIfMissing) {
    const bucket = ensureGeneratedBucket(parsed);
    bucket[token.id] = deepClone(token);
    created = true;
  }

  const nextText = `${JSON.stringify(parsed, null, 2)}\n`;
  return { updated, created, nextText };
}

export function upsertManyTokensJsonText(fileText, tokens, options = {}) {
  const parsed = JSON.parse(fileText);
  const updatedIds = [];
  const createdIds = [];
  const missingIds = [];
  const existingIds = [];

  for (const token of tokens) {
    const updated = updateTokenInObject(parsed, token);
    if (updated) {
      updatedIds.push(token.id);
      continue;
    }

    if (!options.createIfMissing) {
      missingIds.push(token.id);
      continue;
    }

    const bucket = ensureGeneratedBucket(parsed);
    if (Object.prototype.hasOwnProperty.call(bucket, token.id)) {
      existingIds.push(token.id);
      continue;
    }

    bucket[token.id] = deepClone(token);
    createdIds.push(token.id);
  }

  const nextText = `${JSON.stringify(parsed, null, 2)}\n`;
  return { updatedIds, createdIds, missingIds, existingIds, nextText };
}

export function findTokenFilePath({ tokenId, brand, mode }) {
  if (!tokenId || !brand || !mode) {
    return null;
  }

  for (const resolver of TARGET_FILES) {
    const filePath = resolver({ brand, mode });
    if (!fs.existsSync(filePath)) {
      continue;
    }

    const content = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(content);
    if (hasTokenId(parsed, tokenId)) {
      return filePath;
    }
  }

  return null;
}

export function resolveCreateTargetFilePath({ layer, brand, mode }) {
  if (!brand || !mode) {
    return null;
  }

  if (layer === "component") {
    const candidate = path.join(TOKEN_SOURCE_ROOT, "component", brand, `${mode}.json`);
    return fs.existsSync(candidate) ? candidate : null;
  }

  if (layer === "reference") {
    const candidate = path.join(TOKEN_SOURCE_ROOT, "reference", "global.json");
    return fs.existsSync(candidate) ? candidate : null;
  }

  const candidate = path.join(TOKEN_SOURCE_ROOT, "semantic", brand, `${mode}.json`);
  return fs.existsSync(candidate) ? candidate : null;
}

export function toRepoRelativePath(filePath) {
  return path.relative(REPO_ROOT, filePath).replace(/\\/gu, "/");
}

function mappingIdentity(mapping) {
  return [mapping.component, mapping.variant, mapping.slot, mapping.state, mapping.platformProperty].join("::");
}

export function upsertMappingsJsonText(fileText, mappings) {
  const existing = JSON.parse(fileText);
  const list = Array.isArray(existing) ? [...existing] : [];
  const byKey = new Map(list.map((entry) => [mappingIdentity(entry), entry]));
  let added = 0;
  let updated = 0;

  for (const mapping of mappings) {
    const key = mappingIdentity(mapping);
    if (byKey.has(key)) {
      byKey.set(key, deepClone(mapping));
      updated += 1;
      continue;
    }
    byKey.set(key, deepClone(mapping));
    added += 1;
  }

  const nextList = [...byKey.values()].sort((a, b) => {
    const left = mappingIdentity(a);
    const right = mappingIdentity(b);
    return left.localeCompare(right);
  });

  return {
    added,
    updated,
    nextText: `${JSON.stringify(nextList, null, 2)}\n`
  };
}

export function parseMappingsJsonText(fileText) {
  if (!fileText || !String(fileText).trim()) {
    return [];
  }

  const parsed = JSON.parse(fileText);
  return Array.isArray(parsed) ? parsed : [];
}

export function loadMappingsFromFile(filePath) {
  if (!filePath || !fs.existsSync(filePath)) {
    return [];
  }

  const text = fs.readFileSync(filePath, "utf8");
  return parseMappingsJsonText(text);
}

export function resolveMappingFilePath({ component, variant }) {
  if (!component || !variant) {
    return null;
  }

  const normalizedComponent = String(component)
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/gu, "-")
    .replace(/[^a-z0-9-]+/gu, "")
    .replace(/-{2,}/gu, "-")
    .replace(/(^-+)|(-+$)/gu, "");
  const normalizedVariant = String(variant)
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/gu, "-")
    .replace(/[^a-z0-9-]+/gu, "")
    .replace(/-{2,}/gu, "-")
    .replace(/(^-+)|(-+$)/gu, "");

  if (!normalizedComponent || !normalizedVariant) {
    return null;
  }

  return path.join(TOKEN_MAPPINGS_ROOT, `${normalizedComponent}-${normalizedVariant}.mappings.json`);
}
