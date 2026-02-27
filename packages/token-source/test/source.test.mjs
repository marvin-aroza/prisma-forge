import test from "node:test";
import assert from "node:assert/strict";
import { getAvailableBrandsAndModes, loadTokenSource } from "../src/index.js";

test("token source exposes multiple brands and modes", () => {
  const entries = getAvailableBrandsAndModes();
  assert.ok(entries.acme.includes("light"));
  assert.ok(entries.acme.includes("dark"));
  assert.ok(entries.nova.includes("light"));
  assert.ok(entries.nova.includes("dark"));
});

test("loading a brand/mode token source returns tokens", () => {
  const set = loadTokenSource({ brand: "acme", mode: "light" });
  assert.equal(set.brand, "acme");
  assert.equal(set.mode, "light");
  assert.ok(set.tokens.length > 0);
});

