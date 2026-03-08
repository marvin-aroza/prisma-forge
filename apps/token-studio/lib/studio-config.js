const DEFAULT_STUDIO_NAME = "PrismForge Token Studio";
const DEFAULT_STUDIO_SUBTITLE = "Cross-platform token governance";
const DEFAULT_STUDIO_DESCRIPTION = "Browse, diff, and propose token changes across brands and modes.";

function readEnv(value, fallback) {
  const trimmed = String(value ?? "").trim();
  return trimmed || fallback;
}

function readFlag(value, fallback) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized) {
    return fallback;
  }
  if (["true", "1", "yes", "y", "on"].includes(normalized)) {
    return true;
  }
  if (["false", "0", "no", "n", "off"].includes(normalized)) {
    return false;
  }
  return fallback;
}

export function getStudioName() {
  return readEnv(process.env.NEXT_PUBLIC_STUDIO_NAME, DEFAULT_STUDIO_NAME);
}

export function getStudioSubtitle() {
  return readEnv(process.env.NEXT_PUBLIC_STUDIO_SUBTITLE, DEFAULT_STUDIO_SUBTITLE);
}

export function getStudioDescription() {
  return readEnv(process.env.NEXT_PUBLIC_STUDIO_DESCRIPTION, DEFAULT_STUDIO_DESCRIPTION);
}

export function getStudioInitials(name = getStudioName()) {
  const words = name
    .split(/\s+/u)
    .map((word) => word.trim())
    .filter(Boolean);
  if (words.length === 0) {
    return "PF";
  }
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }
  return `${words[0][0] ?? ""}${words[1][0] ?? ""}`.toUpperCase();
}

export function getStudioMetadata() {
  return {
    name: getStudioName(),
    subtitle: getStudioSubtitle(),
    description: getStudioDescription()
  };
}

export function getStudioFeatureFlags() {
  return {
    preview: readFlag(process.env.NEXT_PUBLIC_STUDIO_FLAG_PREVIEW, true),
    diff: readFlag(process.env.NEXT_PUBLIC_STUDIO_FLAG_DIFF, true),
    edit: readFlag(process.env.NEXT_PUBLIC_STUDIO_FLAG_EDIT, true),
    catalog: readFlag(process.env.NEXT_PUBLIC_STUDIO_FLAG_CATALOG, true),
    components: readFlag(process.env.NEXT_PUBLIC_STUDIO_FLAG_COMPONENTS, true),
    docs: readFlag(process.env.NEXT_PUBLIC_STUDIO_FLAG_DOCS, true),
    githubAutopilot: readFlag(process.env.STUDIO_FLAG_GITHUB_AUTOPILOT, true)
  };
}

