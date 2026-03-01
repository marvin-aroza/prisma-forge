import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const files = [
  "examples/react/src/App.jsx",
  "examples/vue/src/App.vue",
  "examples/angular/src/app.component.ts",
  "examples/angular/src/styles.css"
];

const missing = files.filter((file) => !fs.existsSync(path.join(root, file)));
if (missing.length > 0) {
  console.error("Missing example files:");
  for (const file of missing) {
    console.error(`- ${file}`);
  }
  process.exit(1);
}

const importCheck = [
  "examples/react/src/main.jsx",
  "examples/vue/src/main.js",
  "examples/angular/src/styles.css"
].map((file) => {
  const content = fs.readFileSync(path.join(root, file), "utf8");
  return {
    file,
    hasTokenImport: content.includes("@prismforge/tokens-css")
  };
});

const invalid = importCheck.filter((entry) => !entry.hasTokenImport);
if (invalid.length > 0) {
  console.error("Example integration checks failed:");
  for (const entry of invalid) {
    console.error(`- ${entry.file} does not import @prismforge/tokens-css`);
  }
  process.exit(1);
}

const buildTargets = [
  "@prismforge/example-react",
  "@prismforge/example-vue",
  "@prismforge/example-angular"
];

for (const target of buildTargets) {
  const result = spawnSync(`pnpm --filter ${target} build`, {
    cwd: root,
    encoding: "utf8",
    shell: true
  });

  if (result.status !== 0) {
    console.error(`Example build failed for ${target}.`);
    if (result.stdout) {
      console.error(result.stdout);
    }
    if (result.stderr) {
      console.error(result.stderr);
    }
    process.exit(result.status ?? 1);
  }
}

console.log("Example integration checks and builds passed.");

