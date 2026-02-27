import { sortTokens } from "./shared.js";

export function formatJs(tokens, { brand, mode }) {
  const sorted = sortTokens(tokens);
  const tokenObject = Object.fromEntries(sorted.map((token) => [token.id, token.$value]));
  const metadata = {
    brand,
    mode,
    generatedAt: new Date(0).toISOString()
  };

  return [
    `export const metadata = ${JSON.stringify(metadata, null, 2)};`,
    `export const tokens = ${JSON.stringify(tokenObject, null, 2)};`,
    "",
    "export default tokens;"
  ].join("\n");
}

