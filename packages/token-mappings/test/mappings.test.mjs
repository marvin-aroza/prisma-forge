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

test("default mapping set includes button, input, card, select, textarea, checkbox, radio, switch, modal, tabs, tooltip, dropdown, menu, badge, alert, toast, avatar, pagination, and breadcrumb component variants", () => {
  const mappings = loadMappings();
  const groups = new Set(mappings.map((mapping) => `${mapping.component}:${mapping.variant}`));
  assert.ok(groups.has("button:primary"));
  assert.ok(groups.has("input:default"));
  assert.ok(groups.has("card:default"));
  assert.ok(groups.has("select:default"));
  assert.ok(groups.has("textarea:default"));
  assert.ok(groups.has("checkbox:default"));
  assert.ok(groups.has("radio:default"));
  assert.ok(groups.has("switch:default"));
  assert.ok(groups.has("modal:default"));
  assert.ok(groups.has("tabs:default"));
  assert.ok(groups.has("tooltip:default"));
  assert.ok(groups.has("dropdown:default"));
  assert.ok(groups.has("menu:default"));
  assert.ok(groups.has("badge:default"));
  assert.ok(groups.has("alert:default"));
  assert.ok(groups.has("toast:default"));
  assert.ok(groups.has("avatar:default"));
  assert.ok(groups.has("pagination:default"));
  assert.ok(groups.has("breadcrumb:default"));
});

test("missing required states are rejected", () => {
  const source = loadTokenSource({ brand: "acme", mode: "light" });
  const mappings = loadMappings().filter((mapping) => mapping.state !== "focus");
  const validation = validateMappings(mappings, source.tokens);
  assert.equal(validation.valid, false);
  assert.ok(validation.errors.some((error) => error.code === "missing_required_state"));
});
