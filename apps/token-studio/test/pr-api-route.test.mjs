import test from "node:test";
import assert from "node:assert/strict";
import { POST } from "../app/api/pr/route.ts";

delete process.env.GITHUB_TOKEN;

function withEnv(overrides, fn) {
  const original = {};
  for (const [key, value] of Object.entries(overrides)) {
    original[key] = process.env[key];
    if (value === null) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  return Promise.resolve()
    .then(fn)
    .finally(() => {
      for (const [key, value] of Object.entries(original)) {
        if (value === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = value;
        }
      }
    });
}

function createToken(overrides = {}) {
  return {
    id: "dk.color.accent.primary.base",
    $type: "color",
    $value: "#1473E6",
    description: "Updated accent color from integration test.",
    state: "base",
    category: "color",
    tags: ["semantic", "accent", "test"],
    ...overrides
  };
}

async function postDraft(payload) {
  const request = new Request("http://localhost/api/pr", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  return POST(request);
}

test("POST /api/pr returns compare-url mode for valid update without GitHub token", async () => {
  const response = await postDraft({
    tokens: [createToken()],
    brand: "acme",
    mode: "light",
    deprecated: false,
    since: "0.1.0",
    operation: "update",
    layer: "semantic",
    includeMappings: false
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.mode, "compare-url");
  assert.equal(body.tokenCount, 1);
  assert.equal(body.mappingCount, 0);
});

test("POST /api/pr builds gitlab compare-url when git provider is gitlab", async () => {
  await withEnv(
    {
      GIT_PROVIDER: "gitlab",
      GIT_REPOSITORY: "acme/platform-tokens",
      GIT_BASE_BRANCH: "develop",
      GITHUB_TOKEN: null
    },
    async () => {
      const response = await postDraft({
        tokens: [createToken()],
        brand: "acme",
        mode: "light",
        deprecated: false,
        since: "0.1.0",
        operation: "update",
        layer: "semantic",
        includeMappings: false
      });
      const body = await response.json();

      assert.equal(response.status, 200);
      assert.equal(body.ok, true);
      assert.equal(body.mode, "compare-url");
      assert.match(body.prUrl, /^https:\/\/gitlab\.com\/acme\/platform-tokens\/-\/merge_requests\/new/u);
      assert.match(body.message, /compare-url mode/u);
    }
  );
});

test("POST /api/pr forces compare-url when GitHub autopilot flag is disabled", async () => {
  await withEnv(
    {
      GIT_PROVIDER: "github",
      GIT_REPOSITORY: "acme/platform-tokens",
      GIT_BASE_BRANCH: "main",
      GITHUB_TOKEN: "ghp_test_token",
      STUDIO_FLAG_GITHUB_AUTOPILOT: "false"
    },
    async () => {
      const response = await postDraft({
        tokens: [createToken()],
        brand: "acme",
        mode: "light",
        deprecated: false,
        since: "0.1.0",
        operation: "update",
        layer: "semantic",
        includeMappings: false
      });
      const body = await response.json();

      assert.equal(response.status, 200);
      assert.equal(body.ok, true);
      assert.equal(body.mode, "compare-url");
      assert.match(body.message, /disabled by feature flag/u);
    }
  );
});

test("POST /api/pr rejects includeMappings with empty mapping list", async () => {
  const response = await postDraft({
    tokens: [createToken()],
    brand: "acme",
    mode: "light",
    deprecated: false,
    since: "0.1.0",
    operation: "update",
    layer: "semantic",
    includeMappings: true,
    mappings: []
  });
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.ok, false);
  assert.equal(body.errors[0].code, "mapping_payload_empty");
});

test("POST /api/pr rejects duplicate token ids in payload", async () => {
  const response = await postDraft({
    tokens: [createToken(), createToken()],
    brand: "acme",
    mode: "light",
    deprecated: false,
    since: "0.1.0",
    operation: "update",
    layer: "semantic",
    includeMappings: false
  });
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.ok, false);
  assert.equal(body.errors[0].code, "duplicate_payload_id");
});

test("POST /api/pr rejects mapping batches targeting multiple component groups", async () => {
  const response = await postDraft({
    tokens: [createToken()],
    brand: "acme",
    mode: "light",
    deprecated: false,
    since: "0.1.0",
    operation: "update",
    layer: "semantic",
    includeMappings: true,
    mappings: [
      {
        component: "button",
        variant: "primary",
        slot: "root",
        state: "default",
        platformProperty: "background-color",
        tokenRef: "dk.color.accent.primary.base",
        fallbackRef: "dk.color.accent.primary.base"
      },
      {
        component: "input",
        variant: "default",
        slot: "root",
        state: "default",
        platformProperty: "border-color",
        tokenRef: "dk.color.accent.primary.base",
        fallbackRef: "dk.color.border.subtle.base"
      }
    ]
  });
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.ok, false);
  assert.equal(body.errors[0].code, "mapping_multiple_groups");
});

test("POST /api/pr rejects update mode when token id does not exist", async () => {
  const response = await postDraft({
    tokens: [
      createToken({
        id: "dk.color.integration.route-test.base",
        description: "Route test token that should not exist in source."
      })
    ],
    brand: "acme",
    mode: "light",
    deprecated: false,
    since: "0.1.0",
    operation: "update",
    layer: "semantic",
    includeMappings: false
  });
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.ok, false);
  assert.equal(body.errors[0].code, "token_not_found");
});

test("POST /api/pr rejects create mode when token id already exists", async () => {
  const response = await postDraft({
    tokens: [createToken()],
    brand: "acme",
    mode: "light",
    deprecated: false,
    since: "0.1.0",
    operation: "create",
    layer: "semantic",
    includeMappings: false
  });
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.ok, false);
  assert.equal(body.errors[0].code, "token_exists");
});

test("POST /api/pr rejects mappings that reference missing token ids", async () => {
  const response = await postDraft({
    tokens: [createToken()],
    brand: "acme",
    mode: "light",
    deprecated: false,
    since: "0.1.0",
    operation: "update",
    layer: "semantic",
    includeMappings: true,
    mappings: ["default", "hover", "active", "disabled", "focus"].map((state) => ({
      component: "integration-panel",
      variant: "default",
      slot: "root",
      state,
      platformProperty: "background-color",
      tokenRef: "dk.color.integration.missing.base",
      fallbackRef: "dk.color.accent.primary.base"
    }))
  });
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.ok, false);
  assert.equal(body.errors[0].code, "mapping_token_ref_missing");
});

test("POST /api/pr accepts create + mapping batch when states are complete", async () => {
  const createdId = `dk.component.integration-route.bg.${Date.now()}`;
  const response = await postDraft({
    tokens: [
      createToken({
        id: createdId,
        $value: "#1D4ED8",
        description: "Route integration create token for mapping contract tests.",
        state: "default",
        category: "component"
      })
    ],
    brand: "acme",
    mode: "light",
    deprecated: false,
    since: "0.1.0",
    operation: "create",
    layer: "component",
    includeMappings: true,
    mappings: ["default", "hover", "active", "disabled", "focus"].map((state) => ({
      component: "integration-route",
      variant: "default",
      slot: "root",
      state,
      platformProperty: "background-color",
      tokenRef: createdId,
      fallbackRef: "dk.color.accent.primary.base"
    }))
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.mode, "compare-url");
  assert.equal(body.operation, "create");
  assert.equal(body.tokenCount, 1);
  assert.equal(body.mappingCount, 5);
});
