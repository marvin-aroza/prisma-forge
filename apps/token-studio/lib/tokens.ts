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

