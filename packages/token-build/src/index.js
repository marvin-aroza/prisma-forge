import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { formatAndroid } from "./formatters/android.js";
import { formatCss } from "./formatters/css.js";
import { formatIos } from "./formatters/ios.js";
import { formatJs } from "./formatters/js.js";
import { validateMappings, loadMappings } from "../../token-mappings/src/index.js";
import { validateTokens, resolveAliases } from "../../token-schema/src/index.js";
import { loadTokenSource } from "../../token-source/src/index.js";

const TARGETS = ["css", "js", "android", "ios"];

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeFile(filePath, content) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content, "utf8");
}

function buildTargetContent(target, tokens, context) {
  switch (target) {
    case "css":
      return formatCss(tokens, context);
    case "js":
      return formatJs(tokens, context);
    case "android":
      return formatAndroid(tokens, context);
    case "ios":
      return formatIos(tokens, context);
    default:
      throw new Error(`Unsupported target "${target}".`);
  }
}

function targetToFilename(target) {
  switch (target) {
    case "css":
      return "tokens.css";
    case "js":
      return "tokens.js";
    case "android":
      return "tokens.xml";
    case "ios":
      return "Tokens.swift";
    default:
      throw new Error(`Unsupported target "${target}".`);
  }
}

function normalizeBuildInput(sourceOrOptions = {}, maybeOptions = {}) {
  const asSourceObject =
    Array.isArray(sourceOrOptions) || Array.isArray(sourceOrOptions?.tokens)
      ? sourceOrOptions
      : null;

  if (asSourceObject) {
    const source = Array.isArray(sourceOrOptions) ? { tokens: sourceOrOptions } : sourceOrOptions;
    return {
      source,
      options: maybeOptions ?? {}
    };
  }

  const options = sourceOrOptions ?? {};
  const brand = options.brand ?? "acme";
  const mode = options.mode ?? "light";
  const source = loadTokenSource({ brand, mode });
  return { source, options };
}

function computeDeterministicHash(builtFiles) {
  const hash = crypto.createHash("sha256");
  for (const file of [...builtFiles].sort((a, b) => a.target.localeCompare(b.target))) {
    hash.update(file.target);
    hash.update("\n");
    hash.update(file.content);
    hash.update("\n");
  }
  return hash.digest("hex");
}

export function buildArtifacts(sourceOrOptions = {}, maybeOptions = {}) {
  const { source, options } = normalizeBuildInput(sourceOrOptions, maybeOptions);
  const brand = options.brand ?? source.brand ?? "acme";
  const mode = options.mode ?? source.mode ?? "light";
  const target = options.target ?? "all";
  const outDir = options.outDir ?? path.join(process.cwd(), "artifacts", brand, mode);

  const validation = validateTokens(source);
  if (!validation.valid) {
    throw new Error(`Token validation failed: ${JSON.stringify(validation.errors, null, 2)}`);
  }

  const aliasResolution = resolveAliases(source);
  if (aliasResolution.errors.length > 0) {
    throw new Error(`Alias resolution failed: ${JSON.stringify(aliasResolution.errors, null, 2)}`);
  }

  const mappings = loadMappings();
  const mappingValidation = validateMappings(mappings, aliasResolution.resolved);
  if (!mappingValidation.valid) {
    throw new Error(`Mapping validation failed: ${JSON.stringify(mappingValidation.errors, null, 2)}`);
  }

  const resolvedTokens = aliasResolution.resolved;
  const selectedTargets = target === "all" ? TARGETS : [target];
  const builtFiles = [];

  for (const currentTarget of selectedTargets) {
    if (!TARGETS.includes(currentTarget)) {
      throw new Error(`Unknown build target "${currentTarget}".`);
    }
    const content = buildTargetContent(currentTarget, resolvedTokens, { brand, mode });
    const outputPath = path.join(outDir, currentTarget, targetToFilename(currentTarget));
    writeFile(outputPath, content);
    builtFiles.push({
      target: currentTarget,
      outputPath,
      content
    });
  }

  return {
    brand,
    mode,
    tokenCount: resolvedTokens.length,
    targets: selectedTargets,
    files: builtFiles.map((file) => ({ target: file.target, outputPath: file.outputPath })),
    hash: computeDeterministicHash(builtFiles)
  };
}

export { validateTokens, resolveAliases };

