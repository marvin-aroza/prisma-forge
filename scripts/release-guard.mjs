import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const channelArgIndex = args.indexOf("--channel");
const channel = channelArgIndex >= 0 ? args[channelArgIndex + 1] : "stable";

if (!["stable", "next"].includes(channel)) {
  console.error('Invalid --channel. Expected "stable" or "next".');
  process.exit(1);
}

const configPath = path.join(process.cwd(), ".changeset", "config.json");
if (!fs.existsSync(configPath)) {
  console.error("Missing .changeset/config.json");
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
if (config.access !== "public") {
  console.error("Changeset config must use public access.");
  process.exit(1);
}

if (channel === "next") {
  console.log("Next channel guard passed.");
} else {
  console.log("Stable channel guard passed.");
}

