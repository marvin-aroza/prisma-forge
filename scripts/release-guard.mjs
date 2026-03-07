import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const channelArgIndex = args.indexOf("--channel");
const channel = channelArgIndex >= 0 ? args[channelArgIndex + 1] : "stable";
const distTagArgIndex = args.indexOf("--dist-tag");
const distTagInput = distTagArgIndex >= 0 ? args[distTagArgIndex + 1] : "";

const SUPPORTED_CHANNELS = ["stable", "next", "alpha", "beta", "rc", "canary", "custom"];
const SEMVER_LIKE_PATTERN = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/u;

function fail(message) {
  console.error(message);
  process.exit(1);
}

function isValidDistTag(tag) {
  if (!tag || typeof tag !== "string") {
    return false;
  }

  const trimmed = tag.trim();
  if (!trimmed) {
    return false;
  }

  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/u.test(trimmed)) {
    return false;
  }

  if (SEMVER_LIKE_PATTERN.test(trimmed)) {
    return false;
  }

  return true;
}

function resolveReleaseTarget(inputChannel, inputDistTag) {
  if (!SUPPORTED_CHANNELS.includes(inputChannel)) {
    fail(
      'Invalid --channel. Expected one of "stable|next|alpha|beta|rc|canary|custom".'
    );
  }

  if (inputChannel === "stable") {
    if (inputDistTag && inputDistTag.trim() && inputDistTag.trim() !== "latest") {
      fail('Stable releases use dist-tag "latest". Remove --dist-tag or set it to "latest".');
    }

    return {
      channel: inputChannel,
      distTag: "latest",
      prerelease: false,
      preMode: null
    };
  }

  if (inputChannel === "custom") {
    const tag = inputDistTag.trim();
    if (!isValidDistTag(tag)) {
      fail(
        'Custom channel requires a valid --dist-tag (letters/numbers/._- and not semver-like).'
      );
    }
    if (tag === "latest") {
      fail('Use channel "stable" for dist-tag "latest".');
    }

    return {
      channel: inputChannel,
      distTag: tag,
      prerelease: true,
      preMode: tag
    };
  }

  return {
    channel: inputChannel,
    distTag: inputChannel,
    prerelease: true,
    preMode: inputChannel
  };
}

const configPath = path.join(process.cwd(), ".changeset", "config.json");
if (!fs.existsSync(configPath)) {
  fail("Missing .changeset/config.json");
}

const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
if (config.access !== "public") {
  fail("Changeset config must use public access.");
}

const target = resolveReleaseTarget(channel, distTagInput);
console.log(
  `Release guard passed. channel=${target.channel} dist-tag=${target.distTag} prerelease=${target.prerelease}`
);
