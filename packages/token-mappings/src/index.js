import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REQUIRED_FIELDS = [
  "component",
  "variant",
  "slot",
  "state",
  "platformProperty",
  "tokenRef",
  "fallbackRef"
];

const REQUIRED_STATES = ["default", "hover", "active", "disabled", "focus"];

export function loadMappings() {
  const raw = fs.readFileSync(path.join(__dirname, "button-primary.mappings.json"), "utf8");
  return JSON.parse(raw);
}

function createError(code, message, mapping = null) {
  return { code, message, mapping };
}

export function validateMappings(mappings, tokens) {
  const errors = [];
  const warnings = [];
  const tokenIds = new Set((tokens ?? []).map((token) => token.id));

  for (const mapping of mappings) {
    for (const field of REQUIRED_FIELDS) {
      if (!Object.prototype.hasOwnProperty.call(mapping, field)) {
        errors.push(createError("missing_field", `Mapping is missing "${field}".`, mapping));
      }
    }

    if (mapping?.tokenRef && !tokenIds.has(mapping.tokenRef)) {
      errors.push(
        createError("missing_token_ref", `Mapping tokenRef "${mapping.tokenRef}" does not exist.`, mapping)
      );
    }

    if (mapping?.fallbackRef && !tokenIds.has(mapping.fallbackRef)) {
      warnings.push(
        createError(
          "missing_fallback_ref",
          `Mapping fallbackRef "${mapping.fallbackRef}" does not exist in token set.`,
          mapping
        )
      );
    }
  }

  const byComponentVariant = new Map();
  for (const mapping of mappings) {
    const key = `${mapping.component}::${mapping.variant}`;
    if (!byComponentVariant.has(key)) {
      byComponentVariant.set(key, new Set());
    }
    byComponentVariant.get(key).add(mapping.state);
  }

  for (const [key, states] of byComponentVariant.entries()) {
    for (const requiredState of REQUIRED_STATES) {
      if (!states.has(requiredState)) {
        errors.push(
          createError(
            "missing_required_state",
            `Mapping group "${key}" is missing required state "${requiredState}".`
          )
        );
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

export { REQUIRED_STATES };

