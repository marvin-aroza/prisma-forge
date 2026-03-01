import test from "node:test";
import assert from "node:assert/strict";
import {
  collectTokenIds,
  findRemovedTokenIds,
  hasMajorChangesetInContents
} from "../token-breaking-guard.mjs";

test("collectTokenIds extracts ids from nested token trees and arrays", () => {
  const fixture = {
    dk: {
      color: {
        accent: {
          primary: {
            base: {
              id: "dk.color.accent.primary.base",
              $type: "color",
              $value: "#1473E6"
            }
          }
        }
      },
      generated: {
        "dk.component.button-bg.primary.default": {
          id: "dk.component.button-bg.primary.default",
          $type: "color",
          $value: "{dk.color.accent.primary.base}"
        }
      }
    },
    extras: [
      {
        id: "dk.spacing.control-x.default.base",
        $type: "dimension",
        $value: "12px"
      }
    ]
  };

  const ids = [...collectTokenIds(fixture)].sort((a, b) => a.localeCompare(b));
  assert.deepEqual(ids, [
    "dk.color.accent.primary.base",
    "dk.component.button-bg.primary.default",
    "dk.spacing.control-x.default.base"
  ]);
});

test("findRemovedTokenIds reports ids present in base snapshot but missing in head snapshot", () => {
  const base = {
    "packages/token-source/src/tokens/semantic/acme/light.json": {
      dk: {
        semantic: {
          color: {
            primary: {
              base: {
                id: "dk.color.accent.primary.base",
                $type: "color",
                $value: "#1473E6"
              }
            },
            secondary: {
              base: {
                id: "dk.color.accent.secondary.base",
                $type: "color",
                $value: "#5C5CE0"
              }
            }
          }
        }
      }
    },
    "packages/token-source/src/tokens/component/acme/light.json": {
      dk: {
        component: {
          button: {
            primary: {
              default: {
                id: "dk.component.button-bg.primary.default",
                $type: "color",
                $value: "{dk.color.accent.primary.base}"
              }
            }
          }
        }
      }
    }
  };

  const head = {
    "packages/token-source/src/tokens/semantic/acme/light.json": {
      dk: {
        semantic: {
          color: {
            primary: {
              base: {
                id: "dk.color.accent.primary.base",
                $type: "color",
                $value: "#0D66D0"
              }
            }
          }
        }
      }
    },
    "packages/token-source/src/tokens/component/acme/light.json": {
      dk: {
        component: {
          button: {
            primary: {
              default: {
                id: "dk.component.button-bg.primary.default",
                $type: "color",
                $value: "{dk.color.accent.primary.base}"
              }
            }
          }
        }
      }
    }
  };

  const removed = findRemovedTokenIds(base, head);
  assert.deepEqual(removed, ["dk.color.accent.secondary.base"]);
});

test("hasMajorChangesetInContents detects major bump in changeset frontmatter", () => {
  const withMajor = [
    `---
"@prismforge/token-cli": patch
"@prismforge/tokens-css": major
---

Breaking token ID removal.
`
  ];

  const withoutMajor = [
    `---
"@prismforge/token-cli": patch
"@prismforge/tokens-css": minor
---

Non-breaking update.
`,
    `---
"@prismforge/token-mappings": patch
---

Mapping updates.
`
  ];

  assert.equal(hasMajorChangesetInContents(withMajor), true);
  assert.equal(hasMajorChangesetInContents(withoutMajor), false);
});
