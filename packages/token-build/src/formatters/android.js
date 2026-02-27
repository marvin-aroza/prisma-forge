import { idToSnakeName, sortTokens, tokenValueToString } from "./shared.js";

function toAndroidDimension(value) {
  if (typeof value !== "string") {
    return value;
  }
  if (value.endsWith("px")) {
    return value.replace(/px$/u, "dp");
  }
  return value;
}

function xmlEscape(input) {
  return String(input)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export function formatAndroid(tokens) {
  const lines = [];
  lines.push('<?xml version="1.0" encoding="utf-8"?>');
  lines.push("<resources>");

  for (const token of sortTokens(tokens)) {
    const name = idToSnakeName(token.id);
    if (token.$type === "color") {
      lines.push(`  <color name="${name}">${xmlEscape(tokenValueToString(token))}</color>`);
      continue;
    }
    if (token.$type === "dimension") {
      lines.push(`  <dimen name="${name}">${xmlEscape(toAndroidDimension(tokenValueToString(token)))}</dimen>`);
      continue;
    }
    if (token.$type === "number") {
      lines.push(`  <item type="integer" name="${name}">${xmlEscape(tokenValueToString(token))}</item>`);
      continue;
    }
    lines.push(`  <item name="${name}">${xmlEscape(tokenValueToString(token))}</item>`);
  }

  lines.push("</resources>");
  return lines.join("\n");
}

