#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { buildArtifacts } from "../../token-build/src/index.js";
import { loadMappings, validateMappings } from "../../token-mappings/src/index.js";
import { resolveAliases, validateTokens } from "../../token-schema/src/index.js";
import { loadAllTokenSources, loadTokenSource } from "../../token-source/src/index.js";

function parseFlags(args) {
  const flags = {};
  for (let i = 0; i < args.length; i += 1) {
    const current = args[i];
    if (!current.startsWith("--")) {
      continue;
    }
    const key = current.slice(2);
    const next = args[i + 1];
    if (!next || next.startsWith("--")) {
      flags[key] = true;
    } else {
      flags[key] = next;
      i += 1;
    }
  }
  return flags;
}

function printHelp() {
  console.log(`
PrismForge CLI

Commands:
  prismforge validate
  prismforge build --brand <id> --mode <id> --target <css|js|android|ios|all> [--out <dir>]
  prismforge diff --from <version-or-file> --to <version-or-file>
  prismforge release --channel <stable|next>
  prismforge figma export --brand <id> --mode <id> [--out <file>]
`);
}

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exitCode = 1;
}

function commandValidate() {
  const sets = loadAllTokenSources();
  const mappings = loadMappings();
  const report = [];
  let hasError = false;

  for (const set of sets) {
    const validation = validateTokens(set);
    const aliasResolution = resolveAliases(set);
    const mappingValidation = validateMappings(mappings, aliasResolution.resolved);

    if (!validation.valid || aliasResolution.errors.length > 0 || !mappingValidation.valid) {
      hasError = true;
    }

    report.push({
      brand: set.brand,
      mode: set.mode,
      tokenCount: set.tokens.length,
      tokenErrors: validation.errors.length,
      aliasErrors: aliasResolution.errors.length,
      mappingErrors: mappingValidation.errors.length
    });
  }

  console.table(report);
  if (hasError) {
    fail("Validation failed.");
    return;
  }
  console.log("Validation passed.");
}

function commandBuild(flags) {
  const brand = flags.brand ?? "acme";
  const mode = flags.mode ?? "light";
  const target = flags.target ?? "all";
  const outDir = flags.out ? path.resolve(flags.out) : undefined;
  const result = buildArtifacts({ brand, mode, target, outDir });
  console.log(JSON.stringify(result, null, 2));
}

function loadSnapshotInput(input) {
  if (!input) {
    return null;
  }

  const asPath = path.resolve(input);
  if (fs.existsSync(asPath)) {
    return JSON.parse(fs.readFileSync(asPath, "utf8"));
  }

  const releasesPath = path.resolve(
    process.cwd(),
    "packages",
    "token-source",
    "releases",
    `${input}.json`
  );
  if (fs.existsSync(releasesPath)) {
    return JSON.parse(fs.readFileSync(releasesPath, "utf8"));
  }

  return null;
}

function normalizeSnapshot(snapshot) {
  if (Array.isArray(snapshot)) {
    return snapshot;
  }
  if (Array.isArray(snapshot?.tokens)) {
    return snapshot.tokens;
  }
  throw new Error("Snapshot file must be an array of tokens or an object with `tokens`.");
}

function commandDiff(flags) {
  const fromSnapshot = loadSnapshotInput(flags.from);
  const toSnapshot = loadSnapshotInput(flags.to);

  if (!fromSnapshot || !toSnapshot) {
    fail("Diff requires both --from and --to snapshots or release files.");
    return;
  }

  const fromTokens = normalizeSnapshot(fromSnapshot);
  const toTokens = normalizeSnapshot(toSnapshot);

  const fromMap = new Map(fromTokens.map((token) => [token.id, JSON.stringify(token.$value)]));
  const toMap = new Map(toTokens.map((token) => [token.id, JSON.stringify(token.$value)]));

  const added = [];
  const removed = [];
  const changed = [];

  for (const [id, value] of toMap.entries()) {
    if (!fromMap.has(id)) {
      added.push(id);
      continue;
    }
    if (fromMap.get(id) !== value) {
      changed.push(id);
    }
  }

  for (const id of fromMap.keys()) {
    if (!toMap.has(id)) {
      removed.push(id);
    }
  }

  console.log(JSON.stringify({ added, removed, changed }, null, 2));
}

function commandRelease(flags) {
  const channel = flags.channel;
  if (!channel || !["stable", "next"].includes(channel)) {
    fail("Release command requires --channel <stable|next>.");
    return;
  }

  const plan = {
    channel,
    publishTag: channel === "stable" ? "latest" : "next",
    steps:
      channel === "stable"
        ? ["pnpm changeset version", "pnpm changeset publish --tag latest"]
        : [
            "pnpm changeset pre enter next",
            "pnpm changeset version",
            "pnpm changeset publish --tag next",
            "pnpm changeset pre exit"
          ]
  };

  const outDir = path.resolve(process.cwd(), "artifacts", "release");
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `release-${channel}.json`);
  fs.writeFileSync(outFile, `${JSON.stringify(plan, null, 2)}\n`, "utf8");
  console.log(`Release plan written to ${outFile}`);
  console.log(JSON.stringify(plan, null, 2));
}

function commandFigmaExport(flags) {
  const brand = flags.brand ?? "acme";
  const mode = flags.mode ?? "light";
  const set = loadTokenSource({ brand, mode });
  const resolved = resolveAliases(set);

  if (resolved.errors.length > 0) {
    fail(`Cannot export to Figma: ${JSON.stringify(resolved.errors, null, 2)}`);
    return;
  }

  const payload = {
    meta: {
      source: "prismforge",
      exportType: "figma-variables",
      brand,
      mode
    },
    variables: resolved.resolved.map((token) => ({
      name: token.id,
      type: token.$type,
      value: token.$value,
      description: token.description
    }))
  };

  const outFile = flags.out
    ? path.resolve(flags.out)
    : path.resolve(process.cwd(), "artifacts", "figma", `${brand}-${mode}.json`);
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log(`Figma export written to ${outFile}`);
}

function main() {
  const [, , command, maybeSubcommand, ...rest] = process.argv;
  if (!command || command === "--help" || command === "-h") {
    printHelp();
    return;
  }

  if (command === "figma") {
    const flags = parseFlags(rest);
    if (maybeSubcommand !== "export") {
      fail('Only "prismforge figma export" is supported in v1.');
      return;
    }
    commandFigmaExport(flags);
    return;
  }

  const flags = parseFlags([maybeSubcommand, ...rest].filter(Boolean));
  switch (command) {
    case "validate":
      commandValidate();
      break;
    case "build":
      commandBuild(flags);
      break;
    case "diff":
      commandDiff(flags);
      break;
    case "release":
      commandRelease(flags);
      break;
    default:
      fail(`Unknown command "${command}".`);
      printHelp();
  }
}

main();


