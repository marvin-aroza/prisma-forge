import test from "node:test";
import assert from "node:assert/strict";
import { loadTokenSource } from "../../token-source/src/index.js";
import { loadMappings, validateMappings } from "../src/index.js";

test("default mappings resolve against token refs", () => {
  const source = loadTokenSource({ brand: "acme", mode: "light" });
  const mappings = loadMappings();
  const validation = validateMappings(mappings, source.tokens);
  assert.equal(validation.valid, true);
});

test("missing required states are rejected", () => {
  const source = loadTokenSource({ brand: "acme", mode: "light" });
  const mappings = loadMappings().filter((mapping) => mapping.state !== "focus");
  const validation = validateMappings(mappings, source.tokens);
  assert.equal(validation.valid, false);
  assert.ok(validation.errors.some((error) => error.code === "missing_required_state"));
});

