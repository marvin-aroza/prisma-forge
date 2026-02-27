import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function getJsTokenPath() {
  return path.join(__dirname, "artifacts", "js", "tokens.js");
}

export function readJsTokenModule() {
  const filePath = getJsTokenPath();
  if (!fs.existsSync(filePath)) {
    return "export const tokens = {};\nexport default tokens;\n";
  }
  return fs.readFileSync(filePath, "utf8");
}

export default readJsTokenModule;

