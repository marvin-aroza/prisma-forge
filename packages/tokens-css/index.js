import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function getCssTokenPath(brand = "acme", mode = "light") {
  return path.join(__dirname, "artifacts", "css", "tokens.css");
}

export function readCssTokens(brand = "acme", mode = "light") {
  const filePath = getCssTokenPath(brand, mode);
  if (!fs.existsSync(filePath)) {
    return "";
  }
  return fs.readFileSync(filePath, "utf8");
}

export default readCssTokens;

