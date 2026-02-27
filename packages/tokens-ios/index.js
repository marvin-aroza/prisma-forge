import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function getIosTokenPath() {
  return path.join(__dirname, "artifacts", "ios", "Tokens.swift");
}

export function readIosTokens() {
  const filePath = getIosTokenPath();
  if (!fs.existsSync(filePath)) {
    return "";
  }
  return fs.readFileSync(filePath, "utf8");
}

export default readIosTokens;

