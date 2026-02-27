import test from "node:test";
import assert from "node:assert/strict";
import { resolveAliases, validateTokens } from "../src/index.js";

test("validateTokens rejects missing required metadata", () => {
  const result = validateTokens([
    {
      id: "dk.color.surface.default.base",
      $type: "color",
      $value: "#ffffff"
    }
  ]);

  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.code === "missing_field"));
});

test("validateTokens rejects invalid type/value combination", () => {
  const result = validateTokens([
    {
      id: "dk.motion.duration.fast.base",
      $type: "duration",
      $value: "fast",
      description: "Invalid duration token for test.",
      brand: "acme",
      mode: "light",
      state: "base",
      category: "motion-duration",
      deprecated: false,
      since: "0.1.0",
      tags: ["test"]
    }
  ]);

  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.code === "invalid_value"));
});

test("resolveAliases reports unresolved aliases", () => {
  const resolution = resolveAliases([
    {
      id: "dk.color.text.default.base",
      $type: "color",
      $value: "{dk.color.reference.missing.base}",
      description: "Text default aliasing to missing token.",
      brand: "acme",
      mode: "light",
      state: "base",
      category: "color",
      deprecated: false,
      since: "0.1.0",
      tags: ["test"]
    }
  ]);

  assert.ok(resolution.errors.some((error) => error.code === "unresolved_alias"));
});

test("resolveAliases reports cyclic aliases", () => {
  const resolution = resolveAliases([
    {
      id: "dk.color.a.default.base",
      $type: "color",
      $value: "{dk.color.b.default.base}",
      description: "Cycle A.",
      brand: "acme",
      mode: "light",
      state: "base",
      category: "color",
      deprecated: false,
      since: "0.1.0",
      tags: ["test"]
    },
    {
      id: "dk.color.b.default.base",
      $type: "color",
      $value: "{dk.color.a.default.base}",
      description: "Cycle B.",
      brand: "acme",
      mode: "light",
      state: "base",
      category: "color",
      deprecated: false,
      since: "0.1.0",
      tags: ["test"]
    }
  ]);

  assert.ok(resolution.errors.some((error) => error.code === "cyclic_alias"));
});

test("resolveAliases returns raw resolved value for alias token", () => {
  const resolution = resolveAliases([
    {
      id: "dk.color.ref.default.base",
      $type: "color",
      $value: "#112233",
      description: "Reference value.",
      brand: "acme",
      mode: "light",
      state: "base",
      category: "color",
      deprecated: false,
      since: "0.1.0",
      tags: ["test"]
    },
    {
      id: "dk.color.alias.default.base",
      $type: "color",
      $value: "{dk.color.ref.default.base}",
      description: "Alias value.",
      brand: "acme",
      mode: "light",
      state: "base",
      category: "color",
      deprecated: false,
      since: "0.1.0",
      tags: ["test"]
    }
  ]);

  const alias = resolution.resolved.find((token) => token.id === "dk.color.alias.default.base");
  assert.equal(alias?.$value, "#112233");
});
