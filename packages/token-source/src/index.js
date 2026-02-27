import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TOKENS_ROOT = path.join(__dirname, "tokens");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function collectTokenObjects(node, collected = []) {
  if (!node || typeof node !== "object") {
    return collected;
  }

  if (Object.prototype.hasOwnProperty.call(node, "$value")) {
    collected.push(node);
    return collected;
  }

  for (const value of Object.values(node)) {
    collectTokenObjects(value, collected);
  }

  return collected;
}

function loadLayerFile(layerPath) {
  const file = path.join(TOKENS_ROOT, layerPath);
  const data = readJson(file);
  return collectTokenObjects(data);
}

export function getAvailableBrandsAndModes() {
  const semanticDir = path.join(TOKENS_ROOT, "semantic");
  const brands = fs
    .readdirSync(semanticDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  const brandModes = {};
  for (const brand of brands) {
    const modeFiles = fs
      .readdirSync(path.join(semanticDir, brand), { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
      .map((entry) => entry.name.replace(/\.json$/u, ""))
      .sort();
    brandModes[brand] = modeFiles;
  }

  return brandModes;
}

export function loadTokenSource({ brand, mode }) {
  if (!brand || !mode) {
    throw new Error("Both brand and mode are required.");
  }

  const brandModes = getAvailableBrandsAndModes();
  if (!brandModes[brand]) {
    throw new Error(`Unknown brand "${brand}".`);
  }
  if (!brandModes[brand].includes(mode)) {
    throw new Error(`Unknown mode "${mode}" for brand "${brand}".`);
  }

  const reference = loadLayerFile("reference/global.json");
  const semantic = loadLayerFile(path.join("semantic", brand, `${mode}.json`));
  const component = loadLayerFile(path.join("component", brand, `${mode}.json`));

  return {
    brand,
    mode,
    tokens: [...reference, ...semantic, ...component]
  };
}

export function loadAllTokenSources() {
  const brandModes = getAvailableBrandsAndModes();
  const sets = [];
  for (const [brand, modes] of Object.entries(brandModes)) {
    for (const mode of modes) {
      sets.push(loadTokenSource({ brand, mode }));
    }
  }
  return sets;
}

if (process.argv.includes("--list")) {
  const available = getAvailableBrandsAndModes();
  console.log(JSON.stringify(available, null, 2));
}

