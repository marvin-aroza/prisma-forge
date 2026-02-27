export function sortTokens(tokens) {
  return [...tokens].sort((a, b) => a.id.localeCompare(b.id));
}

export function idToVarName(id) {
  return id.replace(/[.]/gu, "-").replace(/[^a-z0-9-]/gu, "-");
}

export function idToSnakeName(id) {
  return id.replace(/[.\-]/gu, "_").replace(/[^a-zA-Z0-9_]/gu, "_");
}

function stringifyTypography(value) {
  return `${value.fontWeight} ${value.fontSize}/${value.lineHeight} ${value.fontFamily}`;
}

function stringifyShadow(value) {
  return `${value.x} ${value.y} ${value.blur} ${value.spread} ${value.color}`;
}

export function tokenValueToString(token) {
  const value = token.$value;
  if (token.$type === "typography" && value && typeof value === "object") {
    return stringifyTypography(value);
  }
  if (token.$type === "shadow" && value && typeof value === "object") {
    return stringifyShadow(value);
  }
  if (Array.isArray(value)) {
    return value.join(", ");
  }
  if (value && typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
}

