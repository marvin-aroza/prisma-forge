import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  findTokenFilePath,
  loadMappingsFromFile,
  parseMappingsJsonText,
  resolveMappingFilePath,
  resolveCreateTargetFilePath,
  toRepoRelativePath,
  upsertMappingsJsonText,
  upsertManyTokensJsonText,
  upsertTokenJsonText,
  updateTokenJsonText
} from "../app/api/pr/helpers.mjs";

test("updateTokenJsonText updates an existing token node", () => {
  const fileText = JSON.stringify(
    {
      dk: {
        semantic: {
          accent: {
            primary: {
              base: {
                id: "dk.color.accent.primary.base",
                $type: "color",
                $value: "#2563EB",
                description: "Old value",
                brand: "acme",
                mode: "light",
                state: "base",
                category: "color",
                deprecated: false,
                since: "0.1.0",
                tags: ["semantic", "accent"]
              }
            }
          }
        }
      }
    },
    null,
    2
  );

  const updatedToken = {
    id: "dk.color.accent.primary.base",
    $type: "color",
    $value: "#1D4ED8",
    description: "Updated value",
    brand: "acme",
    mode: "light",
    state: "base",
    category: "color",
    deprecated: false,
    since: "0.1.0",
    tags: ["semantic", "accent", "updated"]
  };

  const result = updateTokenJsonText(fileText, updatedToken);
  const parsed = JSON.parse(result.nextText);
  const nextToken = parsed.dk.semantic.accent.primary.base;

  assert.equal(result.updated, true);
  assert.equal(nextToken.$value, "#1D4ED8");
  assert.equal(nextToken.description, "Updated value");
  assert.deepEqual(nextToken.tags, ["semantic", "accent", "updated"]);
});

test("updateTokenJsonText reports false when token id is missing", () => {
  const fileText = JSON.stringify(
    {
      dk: {
        semantic: {
          accent: {
            primary: {
              base: {
                id: "dk.color.accent.primary.base",
                $type: "color",
                $value: "#2563EB"
              }
            }
          }
        }
      }
    },
    null,
    2
  );

  const updatedToken = {
    id: "dk.color.accent.primary.hover",
    $type: "color",
    $value: "#1D4ED8",
    description: "Updated value",
    brand: "acme",
    mode: "light",
    state: "hover",
    category: "color",
    deprecated: false,
    since: "0.1.0",
    tags: ["semantic", "accent", "updated"]
  };

  const result = updateTokenJsonText(fileText, updatedToken);
  assert.equal(result.updated, false);
});

test("findTokenFilePath resolves component, semantic, and reference token files", () => {
  const componentPath = findTokenFilePath({
    tokenId: "dk.component.button-bg.primary.default",
    brand: "acme",
    mode: "light"
  });
  const semanticPath = findTokenFilePath({
    tokenId: "dk.color.accent.primary.base",
    brand: "acme",
    mode: "light"
  });
  const referencePath = findTokenFilePath({
    tokenId: "dk.color.gray.0.base",
    brand: "acme",
    mode: "light"
  });

  assert.ok(componentPath?.endsWith(path.join("component", "acme", "light.json")));
  assert.ok(semanticPath?.endsWith(path.join("semantic", "acme", "light.json")));
  assert.ok(referencePath?.endsWith(path.join("reference", "global.json")));

  if (!semanticPath) {
    assert.fail("Semantic token path should resolve.");
  }
  assert.equal(
    toRepoRelativePath(semanticPath),
    "packages/token-source/src/tokens/semantic/acme/light.json"
  );
});

test("upsertTokenJsonText creates token in generated bucket when missing", () => {
  const fileText = JSON.stringify(
    {
      dk: {
        semantic: {}
      }
    },
    null,
    2
  );

  const createdToken = {
    id: "dk.color.surface.panel.base",
    $type: "color",
    $value: "#E2E8F0",
    description: "Panel token",
    brand: "acme",
    mode: "light",
    state: "base",
    category: "color",
    deprecated: false,
    since: "0.1.0",
    tags: ["semantic", "surface"]
  };

  const result = upsertTokenJsonText(fileText, createdToken, { createIfMissing: true });
  const parsed = JSON.parse(result.nextText);

  assert.equal(result.updated, false);
  assert.equal(result.created, true);
  assert.deepEqual(parsed.dk.generated[createdToken.id], createdToken);
});

test("resolveCreateTargetFilePath maps layer to expected source file", () => {
  const semanticPath = resolveCreateTargetFilePath({ layer: "semantic", brand: "acme", mode: "light" });
  const componentPath = resolveCreateTargetFilePath({ layer: "component", brand: "acme", mode: "light" });
  const referencePath = resolveCreateTargetFilePath({ layer: "reference", brand: "acme", mode: "light" });

  assert.ok(semanticPath?.endsWith(path.join("semantic", "acme", "light.json")));
  assert.ok(componentPath?.endsWith(path.join("component", "acme", "light.json")));
  assert.ok(referencePath?.endsWith(path.join("reference", "global.json")));
});

test("upsertManyTokensJsonText updates multiple tokens in one pass", () => {
  const fileText = JSON.stringify(
    {
      dk: {
        component: {
          button: {
            primary: {
              default: {
                id: "dk.component.button-bg.primary.default",
                $type: "color",
                $value: "#2563EB"
              },
              hover: {
                id: "dk.component.button-bg.primary.hover",
                $type: "color",
                $value: "#1D4ED8"
              }
            }
          }
        }
      }
    },
    null,
    2
  );

  const result = upsertManyTokensJsonText(fileText, [
    {
      id: "dk.component.button-bg.primary.default",
      $type: "color",
      $value: "#1473E6"
    },
    {
      id: "dk.component.button-bg.primary.hover",
      $type: "color",
      $value: "#0D66D0"
    }
  ]);

  assert.deepEqual(result.updatedIds.sort(), [
    "dk.component.button-bg.primary.default",
    "dk.component.button-bg.primary.hover"
  ]);
  assert.equal(result.createdIds.length, 0);
  assert.equal(result.missingIds.length, 0);
});

test("upsertManyTokensJsonText creates missing tokens in generated bucket", () => {
  const fileText = JSON.stringify(
    {
      dk: {
        component: {}
      }
    },
    null,
    2
  );

  const result = upsertManyTokensJsonText(
    fileText,
    [
      {
        id: "dk.component.badge-bg.default.default",
        $type: "color",
        $value: "{dk.color.surface.default.base}"
      },
      {
        id: "dk.component.badge-border.default.default",
        $type: "color",
        $value: "{dk.color.border.subtle.base}"
      }
    ],
    { createIfMissing: true }
  );

  const parsed = JSON.parse(result.nextText);
  assert.deepEqual(result.createdIds.sort(), [
    "dk.component.badge-bg.default.default",
    "dk.component.badge-border.default.default"
  ]);
  assert.equal(result.updatedIds.length, 0);
  assert.equal(result.missingIds.length, 0);
  assert.ok(parsed.dk.generated["dk.component.badge-bg.default.default"]);
  assert.ok(parsed.dk.generated["dk.component.badge-border.default.default"]);
});

test("resolveMappingFilePath normalizes component and variant segments", () => {
  const mappingPath = resolveMappingFilePath({
    component: "Input Field",
    variant: "Primary_Default"
  });

  assert.ok(mappingPath?.endsWith(path.join("packages", "token-mappings", "src", "input-field-primary-default.mappings.json")));
});

test("upsertMappingsJsonText inserts and updates mappings by identity", () => {
  const fileText = JSON.stringify(
    [
      {
        component: "button",
        variant: "primary",
        slot: "root",
        state: "default",
        platformProperty: "background-color",
        tokenRef: "dk.component.button-bg.primary.default",
        fallbackRef: "dk.color.accent.primary.base"
      }
    ],
    null,
    2
  );

  const result = upsertMappingsJsonText(fileText, [
    {
      component: "button",
      variant: "primary",
      slot: "root",
      state: "default",
      platformProperty: "background-color",
      tokenRef: "dk.component.button-bg.primary.default",
      fallbackRef: "dk.color.accent.primary.hover"
    },
    {
      component: "button",
      variant: "primary",
      slot: "label",
      state: "default",
      platformProperty: "color",
      tokenRef: "dk.component.button-label.primary.default",
      fallbackRef: "dk.color.text.default.base"
    }
  ]);

  const parsed = JSON.parse(result.nextText);
  assert.equal(result.updated, 1);
  assert.equal(result.added, 1);
  assert.equal(parsed.length, 2);
  assert.equal(parsed[0].slot, "label");
  assert.equal(parsed[1].fallbackRef, "dk.color.accent.primary.hover");
});

test("parseMappingsJsonText returns empty list for empty/object payloads", () => {
  assert.deepEqual(parseMappingsJsonText(""), []);
  assert.deepEqual(parseMappingsJsonText("   "), []);
  assert.deepEqual(parseMappingsJsonText("{}"), []);
});

test("loadMappingsFromFile reads array payload and handles missing path", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "prismforge-mapping-"));
  const filePath = path.join(tempDir, "temp.mappings.json");

  fs.writeFileSync(
    filePath,
    JSON.stringify(
      [
        {
          component: "button",
          variant: "primary",
          slot: "root",
          state: "default",
          platformProperty: "background-color",
          tokenRef: "dk.component.button-bg.primary.default",
          fallbackRef: "dk.color.accent.primary.base"
        }
      ],
      null,
      2
    ),
    "utf8"
  );

  const loaded = loadMappingsFromFile(filePath);
  assert.equal(loaded.length, 1);
  assert.equal(loaded[0].tokenRef, "dk.component.button-bg.primary.default");
  assert.deepEqual(loadMappingsFromFile(path.join(tempDir, "missing.mappings.json")), []);

  fs.rmSync(tempDir, { recursive: true, force: true });
});
