import { resolveAliases } from "../../../packages/token-schema/src/index.js";
import {
  getAvailableBrandsAndModes,
  loadTokenSource
} from "../../../packages/token-source/src/index.js";

export interface StudioToken {
  id: string;
  $type: string;
  $value: unknown;
  description: string;
  brand: string;
  mode: string;
  state: string;
  category: string;
  tags: string[];
}

export interface TokenFilters {
  q?: string;
  type?: string;
  state?: string;
  category?: string;
  component?: string;
}

export interface ComponentStatePreview {
  background?: string;
  border?: string;
  text?: string;
  accent?: string;
}

export interface ComponentCatalogEntry {
  key: string;
  component: string;
  variant: string;
  tokenCount: number;
  tokenIds: string[];
  cssVars: string[];
  states: Record<string, ComponentStatePreview>;
}

export function listBrandsAndModes() {
  return getAvailableBrandsAndModes();
}

export function loadResolvedTokens(brand: string, mode: string): StudioToken[] {
  const source = loadTokenSource({ brand, mode });
  const resolved = resolveAliases(source);
  if (resolved.errors.length > 0) {
    throw new Error(`Alias resolution failed: ${JSON.stringify(resolved.errors, null, 2)}`);
  }
  return resolved.resolved as StudioToken[];
}

export function filterTokens(tokens: StudioToken[], filters: TokenFilters) {
  const q = filters.q?.trim().toLowerCase() ?? "";
  return tokens.filter((token) => {
    if (filters.type && token.$type !== filters.type) {
      return false;
    }
    if (filters.state && token.state !== filters.state) {
      return false;
    }
    if (filters.category && token.category !== filters.category) {
      return false;
    }
    if (filters.component && !token.id.includes(filters.component)) {
      return false;
    }
    if (!q) {
      return true;
    }

    const asValue =
      typeof token.$value === "object" ? JSON.stringify(token.$value).toLowerCase() : String(token.$value).toLowerCase();

    return (
      token.id.toLowerCase().includes(q) ||
      token.description.toLowerCase().includes(q) ||
      token.category.toLowerCase().includes(q) ||
      asValue.includes(q)
    );
  });
}

export function getUniqueValues(tokens: StudioToken[], key: keyof StudioToken) {
  return [...new Set(tokens.map((token) => String(token[key])))]
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
}

export function diffTokens(
  currentTokens: StudioToken[],
  compareTokens: StudioToken[]
): {
  added: StudioToken[];
  removed: StudioToken[];
  changed: Array<{ current: StudioToken; compare: StudioToken }>;
} {
  const currentMap = new Map(currentTokens.map((token) => [token.id, token]));
  const compareMap = new Map(compareTokens.map((token) => [token.id, token]));

  const added: StudioToken[] = [];
  const removed: StudioToken[] = [];
  const changed: Array<{ current: StudioToken; compare: StudioToken }> = [];

  for (const [id, token] of currentMap.entries()) {
    const compareToken = compareMap.get(id);
    if (!compareToken) {
      added.push(token);
      continue;
    }
    if (JSON.stringify(token.$value) !== JSON.stringify(compareToken.$value)) {
      changed.push({ current: token, compare: compareToken });
    }
  }

  for (const [id, token] of compareMap.entries()) {
    if (!currentMap.has(id)) {
      removed.push(token);
    }
  }

  return { added, removed, changed };
}

const BACKGROUND_SLOT_KEYS = ["bg", "background", "panel", "container", "item", "tab", "track", "root"];
const BORDER_SLOT_KEYS = ["border"];
const TEXT_SLOT_KEYS = ["label", "title", "body", "link", "text"];
const ACCENT_SLOT_KEYS = ["icon", "indicator", "status", "dot", "mark", "thumb", "separator"];

function extractComponent(token: StudioToken) {
  if (Array.isArray(token.tags) && token.tags[0] === "component" && token.tags[1]) {
    return String(token.tags[1]);
  }
  const source = token.id.split(".")[2] ?? "";
  return source.split("-")[0] ?? "unknown";
}

function extractVariant(token: StudioToken) {
  if (Array.isArray(token.tags) && token.tags[0] === "component" && token.tags[2]) {
    return String(token.tags[2]);
  }
  return token.id.split(".")[3] ?? "default";
}

function extractSlot(token: StudioToken, component: string) {
  const source = token.id.split(".")[2] ?? "";
  const prefix = `${component}-`;
  if (source.startsWith(prefix)) {
    return source.slice(prefix.length);
  }
  return source;
}

function asCssVar(tokenId: string) {
  return `--${tokenId.replace(/\./g, "-")}`;
}

function slotMatches(slot: string, candidates: string[]) {
  return candidates.some((candidate) => slot === candidate || slot.startsWith(`${candidate}-`));
}

function setStatePreview(entry: ComponentCatalogEntry, state: string, slot: string, value: string) {
  const stateEntry = entry.states[state] ?? {};
  if (slotMatches(slot, BACKGROUND_SLOT_KEYS) && !stateEntry.background) {
    stateEntry.background = value;
  } else if (slotMatches(slot, BORDER_SLOT_KEYS) && !stateEntry.border) {
    stateEntry.border = value;
  } else if (slotMatches(slot, TEXT_SLOT_KEYS) && !stateEntry.text) {
    stateEntry.text = value;
  } else if (slotMatches(slot, ACCENT_SLOT_KEYS) && !stateEntry.accent) {
    stateEntry.accent = value;
  } else if (!stateEntry.accent) {
    stateEntry.accent = value;
  }
  entry.states[state] = stateEntry;
}

export function getComponentCatalog(tokens: StudioToken[]): ComponentCatalogEntry[] {
  const grouped = new Map<string, ComponentCatalogEntry>();

  for (const token of tokens) {
    if (!token.id.startsWith("dk.component.")) {
      continue;
    }

    const component = extractComponent(token);
    const variant = extractVariant(token);
    const key = `${component}:${variant}`;

    const entry =
      grouped.get(key) ??
      ({
        key,
        component,
        variant,
        tokenCount: 0,
        tokenIds: [],
        cssVars: [],
        states: {}
      } satisfies ComponentCatalogEntry);

    entry.tokenCount += 1;
    entry.tokenIds.push(token.id);
    entry.cssVars.push(asCssVar(token.id));

    if (token.$type === "color" && typeof token.$value === "string") {
      const slot = extractSlot(token, component);
      setStatePreview(entry, token.state, slot, token.$value);
    }

    grouped.set(key, entry);
  }

  return [...grouped.values()]
    .map((entry) => ({
      ...entry,
      tokenIds: [...new Set(entry.tokenIds)].sort((a, b) => a.localeCompare(b)),
      cssVars: [...new Set(entry.cssVars)].sort((a, b) => a.localeCompare(b))
    }))
    .sort((a, b) => a.key.localeCompare(b.key));
}
