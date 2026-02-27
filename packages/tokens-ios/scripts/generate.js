import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildArtifacts } from "../../token-build/src/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageRoot = path.join(__dirname, "..");

const brand = process.env.PRISMFORGE_BRAND ?? "acme";
const mode = process.env.PRISMFORGE_MODE ?? "light";

const result = buildArtifacts({
  brand,
  mode,
  target: "ios",
  outDir: path.join(packageRoot, "artifacts")
});

console.log(`Generated iOS tokens for ${brand}/${mode}.`);
console.log(JSON.stringify(result, null, 2));


