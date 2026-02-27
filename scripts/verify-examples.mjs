import fs from "node:fs";
import path from "node:path";

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

console.log("Example integration checks passed.");

