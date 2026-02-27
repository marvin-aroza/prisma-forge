const REQUIRED_FIELDS = [
  "id",
  "$type",
  "$value",
  "description",
  "brand",
  "mode",
  "state",
  "category",
  "deprecated",
  "since",
  "tags"
];

const TOKEN_ID_PATTERN = /^[a-z0-9]+(?:\.[a-z0-9-]+){4,}$/u;
const VERSION_PATTERN = /^\d+\.\d+\.\d+$/u;
const ALIAS_PATTERN = /^\{([a-z0-9.-]+)\}$/u;

const ALLOWED_TYPES = new Set([
  "color",
  "dimension",
  "typography",
  "shadow",
  "number",
  "duration",
  "cubicBezier",
  "strokeStyle"
]);

function normalizeTokens(source) {
  if (Array.isArray(source)) {
    return source;
  }
  if (source && Array.isArray(source.tokens)) {
    return source.tokens;
  }
  throw new Error("Token source must be an array or an object with a tokens array.");
}

function addError(errors, tokenId, code, message) {
  errors.push({ tokenId, code, message });
}

function isAlias(value) {
  return typeof value === "string" && ALIAS_PATTERN.test(value);
}

function parseAlias(value) {
  const match = value.match(ALIAS_PATTERN);
  return match ? match[1] : null;
}

function isColor(value) {
  if (typeof value !== "string") {
    return false;
  }
  if (isAlias(value)) {
    return true;
  }
  return /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/iu.test(value) || /^rgba?\(/iu.test(value);
}

function isDimension(value) {
  if (isAlias(value)) {
    return true;
  }
  return typeof value === "string" && /^-?\d+(\.\d+)?(px|rem|em|%)$/u.test(value);
}

function isDuration(value) {
  if (isAlias(value)) {
    return true;
  }
  return typeof value === "string" && /^\d+(\.\d+)?(ms|s)$/u.test(value);
}

function isNumberValue(value) {
  if (isAlias(value)) {
    return true;
  }
  return typeof value === "number" && Number.isFinite(value);
}

function isCubicBezier(value) {
  if (isAlias(value)) {
    return true;
  }
  return (
    Array.isArray(value) &&
    value.length === 4 &&
    value.every((entry) => typeof entry === "number" && Number.isFinite(entry))
  );
}

function isStrokeStyle(value) {
  if (isAlias(value)) {
    return true;
  }
  return typeof value === "string" && ["solid", "dashed", "dotted", "none"].includes(value);
}

function isTypography(value) {
  if (isAlias(value)) {
    return true;
  }
  if (!value || typeof value !== "object") {
    return false;
  }
  const required = ["fontFamily", "fontWeight", "fontSize", "lineHeight", "letterSpacing"];
  return required.every((key) => Object.prototype.hasOwnProperty.call(value, key));
}

function isShadow(value) {
  if (isAlias(value)) {
    return true;
  }
  if (!value || typeof value !== "object") {
    return false;
  }
  const required = ["color", "x", "y", "blur", "spread"];
  return required.every((key) => Object.prototype.hasOwnProperty.call(value, key));
}

function valueMatchesType(type, value) {
  switch (type) {
    case "color":
      return isColor(value);
    case "dimension":
      return isDimension(value);
    case "duration":
      return isDuration(value);
    case "number":
      return isNumberValue(value);
    case "cubicBezier":
      return isCubicBezier(value);
    case "strokeStyle":
      return isStrokeStyle(value);
    case "typography":
      return isTypography(value);
    case "shadow":
      return isShadow(value);
    default:
      return false;
  }
}

function deepResolveValue(value, resolveId, stack) {
  if (isAlias(value)) {
    const target = parseAlias(value);
    const resolvedToken = resolveId(target, stack);
    return resolvedToken ? resolvedToken.$value : undefined;
  }
  if (Array.isArray(value)) {
    return value.map((entry) => deepResolveValue(entry, resolveId, stack));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, deepResolveValue(entry, resolveId, stack)])
    );
  }
  return value;
}

export function validateTokens(source) {
  const tokens = normalizeTokens(source);
  const errors = [];
  const warnings = [];
  const seenIds = new Set();

  for (const token of tokens) {
    const tokenId = typeof token?.id === "string" ? token.id : "(missing-id)";

    for (const field of REQUIRED_FIELDS) {
      if (!Object.prototype.hasOwnProperty.call(token ?? {}, field)) {
        addError(errors, tokenId, "missing_field", `Missing required field "${field}".`);
      }
    }

    if (typeof token?.id !== "string" || !TOKEN_ID_PATTERN.test(token.id)) {
      addError(
        errors,
        tokenId,
        "invalid_id",
        "Token id must follow naming convention namespace.category.intent.variant.state."
      );
    }

    if (seenIds.has(token?.id)) {
      addError(errors, tokenId, "duplicate_id", `Duplicate token id "${token.id}".`);
    }
    seenIds.add(token?.id);

    if (!ALLOWED_TYPES.has(token?.$type)) {
      addError(errors, tokenId, "invalid_type", `Unsupported token type "${token?.$type}".`);
    } else if (!valueMatchesType(token.$type, token.$value)) {
      addError(
        errors,
        tokenId,
        "invalid_value",
        `Token value does not match declared type "${token.$type}".`
      );
    }

    if (!VERSION_PATTERN.test(String(token?.since ?? ""))) {
      addError(errors, tokenId, "invalid_since", "Token since must be semver, e.g. 1.2.3.");
    }

    if (typeof token?.deprecated !== "boolean") {
      addError(errors, tokenId, "invalid_deprecated", "Token deprecated must be boolean.");
    }

    if (!Array.isArray(token?.tags) || token.tags.length === 0) {
      addError(errors, tokenId, "invalid_tags", "Token tags must be a non-empty string array.");
    }

    if (typeof token?.description === "string" && token.description.length < 8) {
      warnings.push({
        tokenId,
        code: "short_description",
        message: "Description is very short; consider clarifying intent."
      });
    }
  }

  return {
    valid: errors.length === 0,
    tokenCount: tokens.length,
    errors,
    warnings
  };
}

export function resolveAliases(source) {
  const tokens = normalizeTokens(source);
  const errors = [];
  const byId = new Map(tokens.map((token) => [token.id, token]));
  const resolvedCache = new Map();

  function resolveById(id, stack = []) {
    if (resolvedCache.has(id)) {
      return resolvedCache.get(id);
    }
    if (stack.includes(id)) {
      addError(errors, id, "cyclic_alias", `Cyclic alias detected: ${[...stack, id].join(" -> ")}`);
      return undefined;
    }

    const token = byId.get(id);
    if (!token) {
      addError(errors, id, "unresolved_alias", `Alias target "${id}" does not exist.`);
      return undefined;
    }

    const nextStack = [...stack, id];
    const value = deepResolveValue(token.$value, resolveById, nextStack);
    const resolved = { ...token, $value: value };
    resolvedCache.set(id, resolved);
    return resolved;
  }

  const resolved = tokens
    .map((token) => resolveById(token.id, []))
    .filter((token) => token !== undefined)
    .sort((a, b) => a.id.localeCompare(b.id));

  return { resolved, errors };
}

if (process.argv.includes("--self-check")) {
  const sample = [
    {
      id: "dk.color.surface.default.base",
      $type: "color",
      $value: "#fff",
      description: "Sample token for schema self check.",
      brand: "demo",
      mode: "light",
      state: "base",
      category: "color",
      deprecated: false,
      since: "0.1.0",
      tags: ["demo"]
    }
  ];
  console.log(JSON.stringify(validateTokens(sample), null, 2));
}
