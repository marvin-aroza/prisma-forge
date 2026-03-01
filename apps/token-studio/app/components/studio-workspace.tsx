import Link from "next/link";
import { TokenChangeForm } from "./token-change-form";
import { contrastRatio } from "../../lib/color";
import { loadMappings } from "../../../../packages/token-mappings/src/index.js";
import {
  diffTokens,
  filterTokens,
  getComponentCatalog,
  getUniqueValues,
  listBrandsAndModes,
  loadResolvedTokens
} from "../../lib/tokens";

function getParam(value: string | string[] | undefined, fallback = "") {
  if (Array.isArray(value)) {
    return value[0] ?? fallback;
  }
  return value ?? fallback;
}

function serializeValue(value: unknown) {
  if (value && typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
}

function isRenderableColor(value: unknown): value is string {
  if (typeof value !== "string") {
    return false;
  }

  const normalized = value.trim().toLowerCase();
  return (
    /^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(normalized) ||
    normalized.startsWith("rgb(") ||
    normalized.startsWith("rgba(") ||
    normalized.startsWith("hsl(") ||
    normalized.startsWith("hsla(") ||
    normalized.startsWith("oklch(") ||
    normalized.startsWith("oklab(")
  );
}

function getRenderableTokenColor(
  tokenMap: Map<string, { $value: unknown }>,
  tokenId: string,
  fallback: string
) {
  const value = tokenMap.get(tokenId)?.$value;
  return isRenderableColor(value) ? value : fallback;
}

function getTokenTextValue(tokenMap: Map<string, { $value: unknown }>, tokenId: string, fallback: string) {
  const value = tokenMap.get(tokenId)?.$value;
  if (value === null || value === undefined) {
    return fallback;
  }
  return String(value);
}

export type StudioView = "all" | "preview" | "diff" | "catalog" | "components" | "edit";

export async function StudioWorkspace({
  searchParams,
  view = "all"
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
  view?: StudioView;
}) {
  const resolvedSearchParams: Record<string, string | string[] | undefined> =
    ((searchParams ? await searchParams : {}) as Record<string, string | string[] | undefined>) ?? {};
  const brandModes = listBrandsAndModes() as Record<string, string[]>;
  const brands = Object.keys(brandModes);
  const selectedBrand = getParam(resolvedSearchParams.brand, brands[0] ?? "acme");
  const selectedMode = getParam(resolvedSearchParams.mode, brandModes[selectedBrand]?.[0] ?? "light");
  const compareBrand = getParam(resolvedSearchParams.compareBrand, selectedBrand);
  const compareMode = getParam(
    resolvedSearchParams.compareMode,
    brandModes[compareBrand]?.find((mode) => mode !== selectedMode) ?? selectedMode
  );
  const densityParam = getParam(resolvedSearchParams.density, "cozy");
  const density = ["comfortable", "cozy", "compact"].includes(densityParam) ? densityParam : "cozy";

  const tokens = loadResolvedTokens(selectedBrand, selectedMode);
  const allMappings = loadMappings() as Array<{
    component: string;
    variant: string;
    slot: string;
    state: string;
    platformProperty: string;
    tokenRef: string;
    fallbackRef: string;
  }>;
  const compareTokens = loadResolvedTokens(compareBrand, compareMode);
  const diff = diffTokens(tokens, compareTokens);

  const filters = {
    q: getParam(resolvedSearchParams.q),
    type: getParam(resolvedSearchParams.type),
    state: getParam(resolvedSearchParams.state),
    category: getParam(resolvedSearchParams.category),
    component: getParam(resolvedSearchParams.component)
  };

  const filteredTokens = filterTokens(tokens, filters);
  const allTypes = getUniqueValues(tokens, "$type").sort();
  const allStates = getUniqueValues(tokens, "state").sort();
  const allCategories = getUniqueValues(tokens, "category").sort();
  const colorTokens = filteredTokens.filter((token) => token.$type === "color").slice(0, 16);
  const typographyTokens = filteredTokens.filter((token) => token.$type === "typography").slice(0, 6);
  const spacingTokens = filteredTokens.filter((token) => token.category === "spacing").slice(0, 6);
  const shadowTokens = filteredTokens.filter((token) => token.$type === "shadow").slice(0, 4);
  const motionTokens = filteredTokens.filter((token) => token.category.startsWith("motion")).slice(0, 6);
  const componentQuery = (filters.component || "").trim().toLowerCase();
  const componentCatalog = getComponentCatalog(tokens).filter((entry) => {
    if (!componentQuery) {
      return true;
    }
    return (
      entry.component.toLowerCase().includes(componentQuery) ||
      entry.variant.toLowerCase().includes(componentQuery) ||
      entry.key.toLowerCase().includes(componentQuery)
    );
  });
  const componentStateOrder = ["default", "hover", "active", "disabled", "focus"];

  const textDefault = tokens.find((token) => token.id === "dk.color.text.default.base");
  const surfaceDefault = tokens.find((token) => token.id === "dk.color.surface.default.base");
  const contrastValue =
    textDefault && surfaceDefault
      ? contrastRatio(String(textDefault.$value), String(surfaceDefault.$value))
      : null;
  const contrastLabel = contrastValue ? `${contrastValue.toFixed(2)}:1` : "N/A";
  const contrastClass = !contrastValue ? "status-neutral" : contrastValue >= 4.5 ? "status-pass" : "status-warn";
  const requiredStates = ["base", "hover", "active", "disabled", "focus"];
  const tokenStates = new Set(tokens.map((token) => token.state));
  const coveredStates = requiredStates.filter((state) => tokenStates.has(state));
  const stateCoverage =
    coveredStates.length === requiredStates.length
      ? "status-pass"
      : coveredStates.length >= 3
        ? "status-warn"
        : "status-neutral";
  const diffCount = diff.added.length + diff.changed.length + diff.removed.length;
  const tokenMap = new Map(tokens.map((token) => [token.id, token]));

  const routeQuery = new URLSearchParams();
  const persistIfPresent = (key: string, value: string | undefined) => {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      routeQuery.set(key, String(value));
    }
  };

  persistIfPresent("brand", selectedBrand);
  persistIfPresent("mode", selectedMode);
  persistIfPresent("compareBrand", compareBrand);
  persistIfPresent("compareMode", compareMode);
  persistIfPresent("density", density);
  persistIfPresent("q", filters.q);
  persistIfPresent("type", filters.type);
  persistIfPresent("state", filters.state);
  persistIfPresent("category", filters.category);
  persistIfPresent("component", filters.component);

  const routeQueryString = routeQuery.toString();
  const toStudioRoute = (path: string) => (routeQueryString ? `${path}?${routeQueryString}` : path);

  const chipWidget = {
    defaultBg: getRenderableTokenColor(tokenMap, "dk.component.chip-bg.default.default", "#1473E6"),
    hoverBg: getRenderableTokenColor(tokenMap, "dk.component.chip-bg.default.hover", "#0D66D0"),
    activeBg: getRenderableTokenColor(tokenMap, "dk.component.chip-bg.default.active", "#0A5FC5"),
    disabledBg: getRenderableTokenColor(tokenMap, "dk.component.chip-bg.default.disabled", "#D5D8DD"),
    border: getRenderableTokenColor(tokenMap, "dk.component.chip-border.default.default", "#1473E6"),
    text: getRenderableTokenColor(tokenMap, "dk.component.chip-label.default.default", "#FFFFFF"),
    disabledText: getRenderableTokenColor(tokenMap, "dk.component.chip-label.default.disabled", "#5B616C")
  };

  const progressWidget = {
    track: getRenderableTokenColor(tokenMap, "dk.component.progress-track.default.default", "#F3F4F6"),
    fill: getRenderableTokenColor(tokenMap, "dk.component.progress-fill.default.default", "#1473E6"),
    border: getRenderableTokenColor(tokenMap, "dk.component.progress-border.default.default", "#D5D8DD"),
    label: getRenderableTokenColor(tokenMap, "dk.component.progress-label.default.default", "#2C2F36"),
    motion: getTokenTextValue(tokenMap, "dk.component.progress-motion.default.default", "180ms")
  };

  const skeletonWidget = {
    base: getRenderableTokenColor(tokenMap, "dk.component.skeleton-bg.default.default", "#E3E7EC"),
    shimmer: getRenderableTokenColor(tokenMap, "dk.component.skeleton-shimmer.default.default", "#F8F9FB"),
    border: getRenderableTokenColor(tokenMap, "dk.component.skeleton-border.default.default", "#D5D8DD"),
    motion: getTokenTextValue(tokenMap, "dk.component.skeleton-motion.default.default", "900ms")
  };

  const drawerWidget = {
    panel: getRenderableTokenColor(tokenMap, "dk.component.drawer-panel.default.default", "#FFFFFF"),
    border: getRenderableTokenColor(tokenMap, "dk.component.drawer-border.default.default", "#D5D8DD"),
    scrim: getRenderableTokenColor(tokenMap, "dk.component.drawer-scrim.default.default", "rgba(44, 47, 54, 0.42)"),
    title: getRenderableTokenColor(tokenMap, "dk.component.drawer-title.default.default", "#2C2F36"),
    body: getRenderableTokenColor(tokenMap, "dk.component.drawer-body.default.default", "#5B616C")
  };

  const datePickerWidget = {
    panel: getRenderableTokenColor(tokenMap, "dk.component.date-picker-panel.default.default", "#FFFFFF"),
    input: getRenderableTokenColor(tokenMap, "dk.component.date-picker-input.default.default", "#F8F9FB"),
    border: getRenderableTokenColor(tokenMap, "dk.component.date-picker-border.default.default", "#D5D8DD"),
    label: getRenderableTokenColor(tokenMap, "dk.component.date-picker-label.default.default", "#2C2F36"),
    icon: getRenderableTokenColor(tokenMap, "dk.component.date-picker-icon.default.default", "#2C2F36")
  };

  const sliderWidget = {
    track: getRenderableTokenColor(tokenMap, "dk.component.slider-track.default.default", "#E7EBF0"),
    fill: getRenderableTokenColor(tokenMap, "dk.component.slider-fill.default.default", "#1473E6"),
    thumb: getRenderableTokenColor(tokenMap, "dk.component.slider-thumb.default.default", "#FFFFFF"),
    border: getRenderableTokenColor(tokenMap, "dk.component.slider-border.default.default", "#D5D8DD"),
    label: getRenderableTokenColor(tokenMap, "dk.component.slider-label.default.default", "#2C2F36"),
    motion: getTokenTextValue(tokenMap, "dk.component.slider-motion.default.default", "160ms")
  };

  const stepperWidget = {
    container: getRenderableTokenColor(tokenMap, "dk.component.stepper-container.default.default", "#FFFFFF"),
    stepActive: getRenderableTokenColor(tokenMap, "dk.component.stepper-step.default.active", "#1473E6"),
    stepDefault: getRenderableTokenColor(tokenMap, "dk.component.stepper-step.default.default", "#F8F9FB"),
    indicatorActive: getRenderableTokenColor(tokenMap, "dk.component.stepper-indicator.default.active", "#1473E6"),
    indicatorDefault: getRenderableTokenColor(tokenMap, "dk.component.stepper-indicator.default.default", "#D5D8DD"),
    label: getRenderableTokenColor(tokenMap, "dk.component.stepper-label.default.default", "#2C2F36"),
    border: getRenderableTokenColor(tokenMap, "dk.component.stepper-border.default.default", "#D5D8DD")
  };

  const fileUploadWidget = {
    dropzone: getRenderableTokenColor(tokenMap, "dk.component.file-upload-dropzone.default.default", "#F8F9FB"),
    border: getRenderableTokenColor(tokenMap, "dk.component.file-upload-border.default.default", "#D5D8DD"),
    label: getRenderableTokenColor(tokenMap, "dk.component.file-upload-label.default.default", "#2C2F36"),
    helper: getRenderableTokenColor(tokenMap, "dk.component.file-upload-helper.default.default", "#5B616C"),
    icon: getRenderableTokenColor(tokenMap, "dk.component.file-upload-icon.default.default", "#1473E6")
  };

  const comboboxWidget = {
    input: getRenderableTokenColor(tokenMap, "dk.component.combobox-input.default.default", "#F8F9FB"),
    panel: getRenderableTokenColor(tokenMap, "dk.component.combobox-panel.default.default", "#FFFFFF"),
    optionActive: getRenderableTokenColor(tokenMap, "dk.component.combobox-option.default.active", "#1473E6"),
    border: getRenderableTokenColor(tokenMap, "dk.component.combobox-border.default.default", "#D5D8DD"),
    label: getRenderableTokenColor(tokenMap, "dk.component.combobox-label.default.default", "#2C2F36"),
    icon: getRenderableTokenColor(tokenMap, "dk.component.combobox-icon.default.default", "#2C2F36")
  };

  const segmentedControlWidget = {
    container: getRenderableTokenColor(
      tokenMap,
      "dk.component.segmented-control-container.default.default",
      "#FFFFFF"
    ),
    segmentDefault: getRenderableTokenColor(
      tokenMap,
      "dk.component.segmented-control-segment.default.default",
      "#F8F9FB"
    ),
    segmentActive: getRenderableTokenColor(
      tokenMap,
      "dk.component.segmented-control-segment.default.active",
      "#1473E6"
    ),
    indicatorActive: getRenderableTokenColor(
      tokenMap,
      "dk.component.segmented-control-indicator.default.active",
      "#1473E6"
    ),
    border: getRenderableTokenColor(tokenMap, "dk.component.segmented-control-border.default.default", "#D5D8DD"),
    label: getRenderableTokenColor(tokenMap, "dk.component.segmented-control-label.default.default", "#2C2F36")
  };

  const splitButtonWidget = {
    primary: getRenderableTokenColor(tokenMap, "dk.component.split-button-primary.default.default", "#1473E6"),
    secondary: getRenderableTokenColor(tokenMap, "dk.component.split-button-secondary.default.default", "#F8F9FB"),
    border: getRenderableTokenColor(tokenMap, "dk.component.split-button-border.default.default", "#D5D8DD"),
    label: getRenderableTokenColor(tokenMap, "dk.component.split-button-label.default.default", "#2C2F36"),
    icon: getRenderableTokenColor(tokenMap, "dk.component.split-button-icon.default.default", "#2C2F36")
  };

  const toolbarWidget = {
    container: getRenderableTokenColor(tokenMap, "dk.component.toolbar-container.default.default", "#FFFFFF"),
    itemDefault: getRenderableTokenColor(tokenMap, "dk.component.toolbar-item.default.default", "#F8F9FB"),
    itemActive: getRenderableTokenColor(tokenMap, "dk.component.toolbar-item.default.active", "#1473E6"),
    border: getRenderableTokenColor(tokenMap, "dk.component.toolbar-border.default.default", "#D5D8DD"),
    label: getRenderableTokenColor(tokenMap, "dk.component.toolbar-label.default.default", "#2C2F36"),
    icon: getRenderableTokenColor(tokenMap, "dk.component.toolbar-icon.default.default", "#2C2F36")
  };

  const sideNavWidget = {
    container: getRenderableTokenColor(tokenMap, "dk.component.side-nav-container.default.default", "#FFFFFF"),
    itemDefault: getRenderableTokenColor(tokenMap, "dk.component.side-nav-item.default.default", "#F8F9FB"),
    itemActive: getRenderableTokenColor(tokenMap, "dk.component.side-nav-item.default.active", "#1473E6"),
    border: getRenderableTokenColor(tokenMap, "dk.component.side-nav-border.default.default", "#D5D8DD"),
    label: getRenderableTokenColor(tokenMap, "dk.component.side-nav-label.default.default", "#2C2F36"),
    icon: getRenderableTokenColor(tokenMap, "dk.component.side-nav-icon.default.default", "#2C2F36")
  };

  const toggleGroupWidget = {
    container: getRenderableTokenColor(tokenMap, "dk.component.toggle-group-container.default.default", "#FFFFFF"),
    itemDefault: getRenderableTokenColor(tokenMap, "dk.component.toggle-group-item.default.default", "#F8F9FB"),
    itemActive: getRenderableTokenColor(tokenMap, "dk.component.toggle-group-item.default.active", "#1473E6"),
    indicatorActive: getRenderableTokenColor(tokenMap, "dk.component.toggle-group-indicator.default.active", "#1473E6"),
    border: getRenderableTokenColor(tokenMap, "dk.component.toggle-group-border.default.default", "#D5D8DD"),
    label: getRenderableTokenColor(tokenMap, "dk.component.toggle-group-label.default.default", "#2C2F36")
  };

  const searchWidget = {
    input: getRenderableTokenColor(tokenMap, "dk.component.search-input.default.default", "#F8F9FB"),
    panel: getRenderableTokenColor(tokenMap, "dk.component.search-panel.default.default", "#FFFFFF"),
    resultActive: getRenderableTokenColor(tokenMap, "dk.component.search-result.default.active", "#1473E6"),
    border: getRenderableTokenColor(tokenMap, "dk.component.search-border.default.default", "#D5D8DD"),
    label: getRenderableTokenColor(tokenMap, "dk.component.search-label.default.default", "#2C2F36"),
    icon: getRenderableTokenColor(tokenMap, "dk.component.search-icon.default.default", "#2C2F36")
  };

  const commandBarWidget = {
    container: getRenderableTokenColor(tokenMap, "dk.component.command-bar-container.default.default", "#FFFFFF"),
    itemDefault: getRenderableTokenColor(tokenMap, "dk.component.command-bar-item.default.default", "#F8F9FB"),
    actionActive: getRenderableTokenColor(tokenMap, "dk.component.command-bar-action.default.active", "#1473E6"),
    border: getRenderableTokenColor(tokenMap, "dk.component.command-bar-border.default.default", "#D5D8DD"),
    label: getRenderableTokenColor(tokenMap, "dk.component.command-bar-label.default.default", "#2C2F36"),
    icon: getRenderableTokenColor(tokenMap, "dk.component.command-bar-icon.default.default", "#2C2F36")
  };

  const actionGroupWidget = {
    container: getRenderableTokenColor(tokenMap, "dk.component.action-group-container.default.default", "#FFFFFF"),
    itemDefault: getRenderableTokenColor(tokenMap, "dk.component.action-group-item.default.default", "#F8F9FB"),
    itemActive: getRenderableTokenColor(tokenMap, "dk.component.action-group-item.default.active", "#1473E6"),
    border: getRenderableTokenColor(tokenMap, "dk.component.action-group-border.default.default", "#D5D8DD"),
    label: getRenderableTokenColor(tokenMap, "dk.component.action-group-label.default.default", "#2C2F36"),
    icon: getRenderableTokenColor(tokenMap, "dk.component.action-group-icon.default.default", "#2C2F36")
  };

  const statusLightWidget = {
    track: getRenderableTokenColor(tokenMap, "dk.component.status-light-track.default.default", "#FFFFFF"),
    indicatorDefault: getRenderableTokenColor(tokenMap, "dk.component.status-light-indicator.default.default", "#34A853"),
    indicatorHover: getRenderableTokenColor(tokenMap, "dk.component.status-light-indicator.default.hover", "#2E9C4D"),
    indicatorDisabled: getRenderableTokenColor(tokenMap, "dk.component.status-light-indicator.default.disabled", "#D5D8DD"),
    border: getRenderableTokenColor(tokenMap, "dk.component.status-light-border.default.default", "#D5D8DD"),
    label: getRenderableTokenColor(tokenMap, "dk.component.status-light-label.default.default", "#2C2F36"),
    motion: getTokenTextValue(tokenMap, "dk.component.status-light-motion.default.default", "180ms")
  };

  const trayWidget = {
    panel: getRenderableTokenColor(tokenMap, "dk.component.tray-panel.default.default", "#FFFFFF"),
    header: getRenderableTokenColor(tokenMap, "dk.component.tray-header.default.default", "#F8F9FB"),
    border: getRenderableTokenColor(tokenMap, "dk.component.tray-border.default.default", "#D5D8DD"),
    label: getRenderableTokenColor(tokenMap, "dk.component.tray-label.default.default", "#2C2F36"),
    icon: getRenderableTokenColor(tokenMap, "dk.component.tray-icon.default.default", "#2C2F36")
  };

  const wellWidget = {
    container: getRenderableTokenColor(tokenMap, "dk.component.well-container.default.default", "#F8F9FB"),
    inset: getRenderableTokenColor(tokenMap, "dk.component.well-inset.default.default", "#FFFFFF"),
    border: getRenderableTokenColor(tokenMap, "dk.component.well-border.default.default", "#D5D8DD"),
    label: getRenderableTokenColor(tokenMap, "dk.component.well-label.default.default", "#2C2F36"),
    motion: getTokenTextValue(tokenMap, "dk.component.well-motion.default.default", "180ms")
  };

  const featuredWidgetComponents = new Set([
    "chip",
    "progress",
    "skeleton",
    "drawer",
    "date-picker",
    "slider",
    "stepper",
    "file-upload",
    "combobox",
    "segmented-control",
    "split-button",
    "toolbar",
    "side-nav",
    "toggle-group",
    "search",
    "command-bar",
    "action-group",
    "status-light",
    "tray",
    "well"
  ]);
  const additionalWidgetCatalog = componentCatalog.filter((entry) => !featuredWidgetComponents.has(entry.component));

  return (
    <div className={`page-shell density-${density} studio-view-${view}`}>
      <div className="studio-shell">
        <aside className="studio-sidebar" aria-label="Token Studio sidebar">
          <section id="theme-controls" className="panel sidebar-panel">
            <div className="section-heading">
              <h2>1. Theme and Filter Controls</h2>
              <p className="muted">Use this left panel to drive the entire workspace.</p>
            </div>

            <form className="filters-layout filters-layout-sidebar" method="GET">
              <div className="filters-card filters-card-theme">
                <h3>Theme</h3>
                <label>
                  Brand
                  <select name="brand" defaultValue={selectedBrand}>
                    {brands.map((brand) => (
                      <option key={brand} value={brand}>
                        {brand}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Mode
                  <select name="mode" defaultValue={selectedMode}>
                    {(brandModes[selectedBrand] ?? []).map((mode) => (
                      <option key={mode} value={mode}>
                        {mode}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Density
                  <select name="density" defaultValue={density}>
                    <option value="comfortable">comfortable</option>
                    <option value="cozy">cozy</option>
                    <option value="compact">compact</option>
                  </select>
                  <span className="field-help">Adjusts spacing and control density in Studio UI.</span>
                </label>
              </div>

              <div className="filters-card filters-card-scope">
                <h3>Token Scope</h3>
                <label>
                  Search by ID or value
                  <input name="q" defaultValue={filters.q} placeholder="surface, button, text, 16px" />
                </label>
                <label>
                  Type
                  <select name="type" defaultValue={filters.type}>
                    <option value="">all</option>
                    {allTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  State
                  <select name="state" defaultValue={filters.state}>
                    <option value="">all</option>
                    {allStates.map((state) => (
                      <option key={state} value={state}>
                        {state}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Category
                  <select name="category" defaultValue={filters.category}>
                    <option value="">all</option>
                    {allCategories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Component keyword
                  <input name="component" defaultValue={filters.component} placeholder="button" />
                </label>
              </div>

              <div className="filters-card filters-card-compare">
                <h3>Comparison Target</h3>
                <label>
                  Compare Brand
                  <select name="compareBrand" defaultValue={compareBrand}>
                    {brands.map((brand) => (
                      <option key={brand} value={brand}>
                        {brand}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Compare Mode
                  <select name="compareMode" defaultValue={compareMode}>
                    {(brandModes[compareBrand] ?? []).map((mode) => (
                      <option key={mode} value={mode}>
                        {mode}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="filters-actions">
                  <button className="btn btn-primary" type="submit">
                    Apply Selection
                  </button>
                  <a className="btn btn-secondary" href="/">
                    Reset Filters
                  </a>
                </div>
              </div>
            </form>
          </section>

          <section className="panel sidebar-panel sidebar-sections">
            <div className="section-heading">
              <h2>Sections</h2>
              <p className="muted">Jump directly to each workspace block.</p>
            </div>
            <nav className="sidebar-nav" aria-label="Token Studio sections">
              <Link href={toStudioRoute("/studio/preview")}>2. Visual Preview</Link>
              <Link href={toStudioRoute("/studio/diff")}>3. Diff Analysis</Link>
              <Link href={toStudioRoute("/studio/edit")}>4. Propose Edit</Link>
              <Link href={toStudioRoute("/studio/catalog")}>5. Token Catalog</Link>
              <Link href={toStudioRoute("/studio/components")}>6. Component Widgets</Link>
              <Link href={toStudioRoute("/studio/components")}>7. Component Docs</Link>
            </nav>
          </section>
        </aside>

        <div className="studio-content">
          <section className="hero hero-main">
            <div className="hero-copy">
              <p className="eyebrow">Token Studio</p>
              <h1>Understand Tokens in 4 Steps</h1>
              <p className="lead">
                Review token behavior with a guided workflow: set theme context, inspect preview behavior, compare
                environments, then send a validated token edit to draft PR.
              </p>
              <div className="step-links">
                <Link href={toStudioRoute("/studio")}>1. Theme Controls</Link>
                <Link href={toStudioRoute("/studio/preview")}>2. Visual Preview</Link>
                <Link href={toStudioRoute("/studio/diff")}>3. Diff Analysis</Link>
                <Link href={toStudioRoute("/studio/edit")}>4. Propose Edit</Link>
                <Link href={toStudioRoute("/studio/catalog")}>5. Token Catalog</Link>
                <Link href={toStudioRoute("/studio/components")}>6. Component Widgets</Link>
                <Link href={toStudioRoute("/studio/components")}>7. Component Docs</Link>
              </div>
            </div>

            <aside className="hero-context">
              <h2>Current Session</h2>
              <div className="hero-context-grid">
                <div className="context-card">
                  <p className="context-label">Brand</p>
                  <p className="context-value">{selectedBrand}</p>
                </div>
                <div className="context-card">
                  <p className="context-label">Mode</p>
                  <p className="context-value">{selectedMode}</p>
                </div>
                <div className="context-card">
                  <p className="context-label">Visible Tokens</p>
                  <p className="context-value">{filteredTokens.length}</p>
                </div>
                <div className="context-card">
                  <p className="context-label">Compared With</p>
                  <p className="context-value">{`${compareBrand}/${compareMode}`}</p>
                </div>
                <div className="context-card context-card-wide">
                  <p className="context-label">Text/Surface Contrast</p>
                  <p className={`status-chip ${contrastClass}`}>{contrastLabel}</p>
                </div>
              </div>
              <p className="context-note">Use contrast and diff together before approving brand-level updates.</p>
            </aside>
          </section>

          <section className="panel studio-summary" aria-label="Studio overview metrics">
            <div className="summary-grid">
              <article className="summary-card">
                <p className="summary-label">Theme Session</p>
                <p className="summary-value">{`${selectedBrand}/${selectedMode}`}</p>
                <p className="summary-note">{`Comparing with ${compareBrand}/${compareMode}`}</p>
                <p className="summary-note">{`Density: ${density}`}</p>
              </article>
              <article className="summary-card">
                <p className="summary-label">State Coverage</p>
                <p className="summary-value">{`${coveredStates.length}/${requiredStates.length}`}</p>
                <p className={`summary-note status-chip ${stateCoverage}`}>{coveredStates.join(", ")}</p>
              </article>
              <article className="summary-card">
                <p className="summary-label">Diff Footprint</p>
                <p className="summary-value">{diffCount}</p>
                <p className="summary-note">Token deltas pending review</p>
              </article>
              <article className="summary-card">
                <p className="summary-label">Catalog Size</p>
                <p className="summary-value">{tokens.length}</p>
                <p className="summary-note">{`${filteredTokens.length} visible under filters`}</p>
              </article>
            </div>
          </section>

          <section id="preview-board" className="panel">
        <div className="section-heading">
          <h2>2. Visual Preview Board</h2>
          <p className="muted">Evaluate visual behavior quickly before inspecting raw token payloads.</p>
        </div>

        <div className="preview-grid">
          <article>
            <h3>Color</h3>
            <div className="swatch-grid">
              {colorTokens.length > 0 ? (
                colorTokens.map((token) => (
                  <div key={token.id} className="swatch-card">
                    <div className="swatch" style={{ background: String(token.$value) }} />
                    <small>{token.id}</small>
                  </div>
                ))
              ) : (
                <p className="muted">No color tokens for current filter.</p>
              )}
            </div>
          </article>

          <article>
            <h3>Typography</h3>
            {typographyTokens.length > 0 ? (
              typographyTokens.map((token) => {
                const value =
                  typeof token.$value === "object" && token.$value ? (token.$value as Record<string, string | number>) : null;

                return (
                  <p
                    key={token.id}
                    className="type-specimen"
                    style={
                      value
                        ? {
                            fontFamily: String(value.fontFamily),
                            fontSize: String(value.fontSize),
                            lineHeight: String(value.lineHeight),
                            fontWeight: Number(value.fontWeight)
                          }
                        : {}
                    }
                  >
                    {`${token.id} - Build calm, predictable UI language at scale.`}
                  </p>
                );
              })
            ) : (
              <p className="muted">No typography tokens for current filter.</p>
            )}
          </article>

          <article>
            <h3>Spacing and Radius</h3>
            {spacingTokens.length > 0 ? (
              spacingTokens.map((token) => (
                <div key={token.id} className="metric-row">
                  <span>{token.id}</span>
                  <div style={{ width: String(token.$value), height: "14px" }} className="metric-bar" />
                </div>
              ))
            ) : (
              <p className="muted">No spacing tokens for current filter.</p>
            )}
            <div className="radius-showcase" aria-label="Radius sample cards">
              <div className="radius-box radius-sm">sm</div>
              <div className="radius-box radius-md">md</div>
              <div className="radius-box radius-pill">pill</div>
            </div>
          </article>

          <article>
            <h3>Shadow and Motion</h3>
            {shadowTokens.length > 0 ? (
              shadowTokens.map((token) => (
                <div key={token.id} className="shadow-card" style={{ boxShadow: String(token.$value) }}>
                  {token.id}
                </div>
              ))
            ) : (
              <p className="muted">No shadow tokens for current filter.</p>
            )}
            {motionTokens.length > 0 ? (
              motionTokens.map((token) => (
                <p key={token.id} className="motion-row">
                  <code>{token.id}</code>
                  <span>{serializeValue(token.$value)}</span>
                </p>
              ))
            ) : (
              <p className="muted">No motion tokens for current filter.</p>
            )}
          </article>
        </div>
      </section>

      <section id="diff-analysis" className="panel">
        <div className="section-heading">
          <h2>3. Diff Analysis</h2>
          <p className="muted">{`Comparing ${selectedBrand}/${selectedMode} against ${compareBrand}/${compareMode}`}</p>
        </div>

        <div className="diff-stats">
          <span className="diff-pill diff-pill-added">{`Added: ${diff.added.length}`}</span>
          <span className="diff-pill diff-pill-changed">{`Changed: ${diff.changed.length}`}</span>
          <span className="diff-pill diff-pill-removed">{`Removed: ${diff.removed.length}`}</span>
        </div>

        <div className="diff-grid">
          <div>
            <h3>{`Added (${diff.added.length})`}</h3>
            <ul>
              {diff.added.slice(0, 12).map((token) => (
                <li key={token.id}>{token.id}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3>{`Changed (${diff.changed.length})`}</h3>
            <ul>
              {diff.changed.slice(0, 12).map((item) => (
                <li key={item.current.id}>{`${item.current.id}: ${serializeValue(item.compare.$value)} -> ${serializeValue(
                  item.current.$value
                )}`}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3>{`Removed (${diff.removed.length})`}</h3>
            <ul>
              {diff.removed.slice(0, 12).map((token) => (
                <li key={token.id}>{token.id}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <TokenChangeForm
        brand={selectedBrand}
        mode={selectedMode}
        sectionId="edit-workflow"
        existingMappings={allMappings}
        existingTokenIds={tokens.map((token) => token.id)}
      />

      <section id="token-catalog" className="panel">
        <div className="section-heading">
          <h2>5. Token Catalog</h2>
          <p className="muted">Complete listing for final verification before proposing edits.</p>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Type</th>
                <th>State</th>
                <th>Category</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              {filteredTokens.map((token) => (
                <tr key={token.id}>
                  <td>
                    <code>{token.id}</code>
                  </td>
                  <td>{token.$type}</td>
                  <td>{token.state}</td>
                  <td>{token.category}</td>
                  <td>
                    {token.$type === "color" && isRenderableColor(token.$value) ? (
                      <div className="table-color-value">
                        <span
                          className="table-color-swatch"
                          style={{ backgroundColor: token.$value }}
                          aria-label={`${token.id} color preview`}
                        />
                        <code>{token.$value}</code>
                      </div>
                    ) : (
                      <code>{serializeValue(token.$value)}</code>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section id="component-widgets" className="panel">
        <div className="section-heading">
          <h2>6. Component Widgets</h2>
          <p className="muted">
            Live token-driven previews for recent component batches: chip, progress, skeleton, drawer, date-picker, slider,
            stepper, file-upload, combobox, segmented-control, split-button, toolbar, side-nav, toggle-group, search, and
            command-bar, action-group, status-light, tray, and well.
          </p>
        </div>

        <div className="widget-grid">
          <article className="widget-card">
            <div className="widget-head">
              <h3>Chip</h3>
              <code>dk.component.chip.*</code>
            </div>
            <div className="chip-widget-row">
              <span
                className="chip-widget-pill"
                style={{ backgroundColor: chipWidget.defaultBg, borderColor: chipWidget.border, color: chipWidget.text }}
              >
                Default
              </span>
              <span
                className="chip-widget-pill"
                style={{ backgroundColor: chipWidget.hoverBg, borderColor: chipWidget.border, color: chipWidget.text }}
              >
                Hover
              </span>
              <span
                className="chip-widget-pill"
                style={{ backgroundColor: chipWidget.activeBg, borderColor: chipWidget.border, color: chipWidget.text }}
              >
                Active
              </span>
              <span
                className="chip-widget-pill"
                style={{
                  backgroundColor: chipWidget.disabledBg,
                  borderColor: chipWidget.border,
                  color: chipWidget.disabledText,
                  opacity: 0.75
                }}
              >
                Disabled
              </span>
            </div>
          </article>

          <article className="widget-card">
            <div className="widget-head">
              <h3>Progress</h3>
              <code>dk.component.progress.*</code>
            </div>
            <p className="progress-widget-label" style={{ color: progressWidget.label }}>
              Uploading assets: 64%
            </p>
            <div className="progress-widget-track" style={{ backgroundColor: progressWidget.track, borderColor: progressWidget.border }}>
              <div
                className="progress-widget-fill"
                style={{ backgroundColor: progressWidget.fill, width: "64%", transitionDuration: progressWidget.motion }}
              />
            </div>
          </article>

          <article className="widget-card">
            <div className="widget-head">
              <h3>Skeleton</h3>
              <code>dk.component.skeleton.*</code>
            </div>
            <div className="skeleton-widget-stack">
              {[68, 100, 82].map((width, index) => (
                <span
                  // Component preview uses token animation colors and duration for visual verification.
                  key={width}
                  className="skeleton-widget-bar"
                  style={{
                    width: `${width}%`,
                    borderColor: skeletonWidget.border,
                    backgroundImage: `linear-gradient(90deg, ${skeletonWidget.base} 0%, ${skeletonWidget.shimmer} 50%, ${skeletonWidget.base} 100%)`,
                    animationDuration: skeletonWidget.motion,
                    animationDelay: `${index * 120}ms`
                  }}
                />
              ))}
            </div>
          </article>

          <article className="widget-card">
            <div className="widget-head">
              <h3>Drawer</h3>
              <code>dk.component.drawer.*</code>
            </div>
            <div className="drawer-widget-stage" style={{ backgroundColor: drawerWidget.scrim }}>
              <div className="drawer-widget-panel" style={{ backgroundColor: drawerWidget.panel, borderColor: drawerWidget.border }}>
                <h4 style={{ color: drawerWidget.title }}>Project Settings</h4>
                <p style={{ color: drawerWidget.body }}>
                  Configure release channels, token validation rules, and contribution permissions.
                </p>
              </div>
            </div>
          </article>

          <article className="widget-card">
            <div className="widget-head">
              <h3>Date Picker</h3>
              <code>dk.component.date-picker.*</code>
            </div>
            <div className="date-picker-widget-shell" style={{ backgroundColor: datePickerWidget.panel, borderColor: datePickerWidget.border }}>
              <p className="date-picker-widget-label" style={{ color: datePickerWidget.label }}>
                Select due date
              </p>
              <div
                className="date-picker-widget-input"
                style={{ backgroundColor: datePickerWidget.input, borderColor: datePickerWidget.border, color: datePickerWidget.label }}
              >
                <span>2026-03-15</span>
                <span style={{ color: datePickerWidget.icon }}>calendar</span>
              </div>
            </div>
          </article>

          <article className="widget-card">
            <div className="widget-head">
              <h3>Slider</h3>
              <code>dk.component.slider.*</code>
            </div>
            <p className="slider-widget-label" style={{ color: sliderWidget.label }}>
              Volume: 72%
            </p>
            <div className="slider-widget-track" style={{ backgroundColor: sliderWidget.track, borderColor: sliderWidget.border }}>
              <div className="slider-widget-fill" style={{ backgroundColor: sliderWidget.fill, width: "72%", transitionDuration: sliderWidget.motion }} />
              <span className="slider-widget-thumb" style={{ backgroundColor: sliderWidget.thumb, borderColor: sliderWidget.border, left: "72%" }} />
            </div>
          </article>

          <article className="widget-card">
            <div className="widget-head">
              <h3>Stepper</h3>
              <code>dk.component.stepper.*</code>
            </div>
            <div className="stepper-widget-shell" style={{ backgroundColor: stepperWidget.container, borderColor: stepperWidget.border }}>
              <div className="stepper-widget-steps">
                {[0, 1, 2, 3].map((stepIndex) => {
                  const active = stepIndex <= 1;
                  return (
                    <span
                      key={stepIndex}
                      className="stepper-widget-step"
                      style={{
                        backgroundColor: active ? stepperWidget.stepActive : stepperWidget.stepDefault,
                        borderColor: stepperWidget.border,
                        color: active ? "#FFFFFF" : stepperWidget.label
                      }}
                    >
                      {stepIndex + 1}
                    </span>
                  );
                })}
              </div>
              <div className="stepper-widget-indicator">
                <span style={{ backgroundColor: stepperWidget.indicatorActive }} />
                <span style={{ backgroundColor: stepperWidget.indicatorActive }} />
                <span style={{ backgroundColor: stepperWidget.indicatorDefault }} />
                <span style={{ backgroundColor: stepperWidget.indicatorDefault }} />
              </div>
            </div>
          </article>

          <article className="widget-card">
            <div className="widget-head">
              <h3>File Upload</h3>
              <code>dk.component.file-upload.*</code>
            </div>
            <div className="file-upload-widget-dropzone" style={{ backgroundColor: fileUploadWidget.dropzone, borderColor: fileUploadWidget.border }}>
              <p className="file-upload-widget-icon" style={{ color: fileUploadWidget.icon }}>
                upload
              </p>
              <p className="file-upload-widget-label" style={{ color: fileUploadWidget.label }}>
                Drop files here or browse
              </p>
              <p className="file-upload-widget-helper" style={{ color: fileUploadWidget.helper }}>
                SVG, PNG, PDF up to 25MB
              </p>
            </div>
          </article>

          <article className="widget-card">
            <div className="widget-head">
              <h3>Combobox</h3>
              <code>dk.component.combobox.*</code>
            </div>
            <div className="combobox-widget-shell" style={{ backgroundColor: comboboxWidget.panel, borderColor: comboboxWidget.border }}>
              <div
                className="combobox-widget-input"
                style={{ backgroundColor: comboboxWidget.input, borderColor: comboboxWidget.border, color: comboboxWidget.label }}
              >
                <span>Search component token...</span>
                <span style={{ color: comboboxWidget.icon }}>expand</span>
              </div>
              <div className="combobox-widget-option" style={{ backgroundColor: comboboxWidget.optionActive, color: "#FFFFFF" }}>
                <span>dk.component.button-bg.default.default</span>
                <span>enter</span>
              </div>
            </div>
          </article>

          <article className="widget-card">
            <div className="widget-head">
              <h3>Segmented Control</h3>
              <code>dk.component.segmented-control.*</code>
            </div>
            <div
              className="segmented-widget-shell"
              style={{ backgroundColor: segmentedControlWidget.container, borderColor: segmentedControlWidget.border }}
            >
              <div className="segmented-widget-group">
                {["Foundations", "Semantics", "Components"].map((label, index) => {
                  const active = index === 2;
                  return (
                    <span
                      key={label}
                      className="segmented-widget-segment"
                      style={{
                        backgroundColor: active ? segmentedControlWidget.segmentActive : segmentedControlWidget.segmentDefault,
                        color: active ? "#FFFFFF" : segmentedControlWidget.label
                      }}
                    >
                      {label}
                    </span>
                  );
                })}
              </div>
              <span className="segmented-widget-indicator" style={{ backgroundColor: segmentedControlWidget.indicatorActive }} />
            </div>
          </article>

          <article className="widget-card">
            <div className="widget-head">
              <h3>Split Button</h3>
              <code>dk.component.split-button.*</code>
            </div>
            <div className="split-button-widget-shell" style={{ borderColor: splitButtonWidget.border }}>
              <span className="split-button-widget-primary" style={{ backgroundColor: splitButtonWidget.primary, color: "#FFFFFF" }}>
                Publish
              </span>
              <span
                className="split-button-widget-secondary"
                style={{ backgroundColor: splitButtonWidget.secondary, borderColor: splitButtonWidget.border, color: splitButtonWidget.icon }}
              >
                v
              </span>
            </div>
            <p className="split-button-widget-note" style={{ color: splitButtonWidget.label }}>
              Primary action with contextual options.
            </p>
          </article>

          <article className="widget-card">
            <div className="widget-head">
              <h3>Toolbar</h3>
              <code>dk.component.toolbar.*</code>
            </div>
            <div className="toolbar-widget-shell" style={{ backgroundColor: toolbarWidget.container, borderColor: toolbarWidget.border }}>
              <div className="toolbar-widget-row">
                {["bold", "italic", "link", "code"].map((item, index) => {
                  const active = index === 0 || index === 3;
                  return (
                    <span
                      key={item}
                      className="toolbar-widget-item"
                      style={{
                        backgroundColor: active ? toolbarWidget.itemActive : toolbarWidget.itemDefault,
                        borderColor: toolbarWidget.border,
                        color: active ? "#FFFFFF" : toolbarWidget.icon
                      }}
                    >
                      {item}
                    </span>
                  );
                })}
              </div>
            </div>
            <p className="toolbar-widget-note" style={{ color: toolbarWidget.label }}>
              Token-driven action surface for editor controls.
            </p>
          </article>

          <article className="widget-card">
            <div className="widget-head">
              <h3>Side Nav</h3>
              <code>dk.component.side-nav.*</code>
            </div>
            <div className="side-nav-widget-shell" style={{ backgroundColor: sideNavWidget.container, borderColor: sideNavWidget.border }}>
              {[
                { icon: "home", label: "Overview", active: false },
                { icon: "stack", label: "Token Layers", active: true },
                { icon: "branch", label: "Mappings", active: false }
              ].map((item) => (
                <div
                  key={item.label}
                  className="side-nav-widget-item"
                  style={{
                    backgroundColor: item.active ? sideNavWidget.itemActive : sideNavWidget.itemDefault,
                    borderColor: sideNavWidget.border,
                    color: item.active ? "#FFFFFF" : sideNavWidget.label
                  }}
                >
                  <span style={{ color: item.active ? "#FFFFFF" : sideNavWidget.icon }}>{item.icon}</span>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </article>

          <article className="widget-card">
            <div className="widget-head">
              <h3>Toggle Group</h3>
              <code>dk.component.toggle-group.*</code>
            </div>
            <div
              className="toggle-group-widget-shell"
              style={{ backgroundColor: toggleGroupWidget.container, borderColor: toggleGroupWidget.border }}
            >
              <div className="toggle-group-widget-row">
                {["Density", "Contrast", "Grid"].map((label, index) => {
                  const active = index === 1;
                  return (
                    <span
                      key={label}
                      className="toggle-group-widget-item"
                      style={{
                        backgroundColor: active ? toggleGroupWidget.itemActive : toggleGroupWidget.itemDefault,
                        borderColor: toggleGroupWidget.border,
                        color: active ? "#FFFFFF" : toggleGroupWidget.label
                      }}
                    >
                      {label}
                    </span>
                  );
                })}
              </div>
              <span className="toggle-group-widget-indicator" style={{ backgroundColor: toggleGroupWidget.indicatorActive }} />
            </div>
          </article>

          <article className="widget-card">
            <div className="widget-head">
              <h3>Search</h3>
              <code>dk.component.search.*</code>
            </div>
            <div className="search-widget-shell" style={{ backgroundColor: searchWidget.panel, borderColor: searchWidget.border }}>
              <div
                className="search-widget-input"
                style={{ backgroundColor: searchWidget.input, borderColor: searchWidget.border, color: searchWidget.label }}
              >
                <span style={{ color: searchWidget.icon }}>search</span>
                <span>Find token by id or value</span>
              </div>
              <div className="search-widget-result" style={{ backgroundColor: searchWidget.resultActive, color: "#FFFFFF" }}>
                <span>dk.component.search-input.default.default</span>
                <span>selected</span>
              </div>
            </div>
          </article>

          <article className="widget-card">
            <div className="widget-head">
              <h3>Command Bar</h3>
              <code>dk.component.command-bar.*</code>
            </div>
            <div
              className="command-bar-widget-shell"
              style={{ backgroundColor: commandBarWidget.container, borderColor: commandBarWidget.border }}
            >
              <div className="command-bar-widget-row">
                {["format", "review", "publish"].map((item) => (
                  <span
                    key={item}
                    className="command-bar-widget-item"
                    style={{ backgroundColor: commandBarWidget.itemDefault, borderColor: commandBarWidget.border, color: commandBarWidget.icon }}
                  >
                    {item}
                  </span>
                ))}
                <span
                  className="command-bar-widget-action"
                  style={{ backgroundColor: commandBarWidget.actionActive, borderColor: commandBarWidget.border, color: "#FFFFFF" }}
                >
                  run
                </span>
              </div>
            </div>
            <p className="command-bar-widget-note" style={{ color: commandBarWidget.label }}>
              Context actions with one emphasized primary command.
            </p>
          </article>

          <article className="widget-card">
            <div className="widget-head">
              <h3>Action Group</h3>
              <code>dk.component.action-group.*</code>
            </div>
            <div className="action-group-widget-shell" style={{ backgroundColor: actionGroupWidget.container, borderColor: actionGroupWidget.border }}>
              <div className="action-group-widget-row">
                {["align", "distribute", "arrange"].map((item, index) => {
                  const active = index === 1;
                  return (
                    <span
                      key={item}
                      className="action-group-widget-item"
                      style={{
                        backgroundColor: active ? actionGroupWidget.itemActive : actionGroupWidget.itemDefault,
                        borderColor: actionGroupWidget.border,
                        color: active ? "#FFFFFF" : actionGroupWidget.icon
                      }}
                    >
                      {item}
                    </span>
                  );
                })}
              </div>
            </div>
            <p className="action-group-widget-note" style={{ color: actionGroupWidget.label }}>
              Shared action controls with a selected state.
            </p>
          </article>

          <article className="widget-card">
            <div className="widget-head">
              <h3>Status Light</h3>
              <code>dk.component.status-light.*</code>
            </div>
            <div className="status-light-widget-shell" style={{ backgroundColor: statusLightWidget.track, borderColor: statusLightWidget.border }}>
              <p className="status-light-widget-label" style={{ color: statusLightWidget.label }}>
                Build pipeline status
              </p>
              <div className="status-light-widget-track">
                <span
                  className="status-light-widget-dot"
                  style={{ backgroundColor: statusLightWidget.indicatorDefault, transitionDuration: statusLightWidget.motion }}
                />
                <span
                  className="status-light-widget-dot"
                  style={{ backgroundColor: statusLightWidget.indicatorHover, transitionDuration: statusLightWidget.motion }}
                />
                <span
                  className="status-light-widget-dot"
                  style={{ backgroundColor: statusLightWidget.indicatorDisabled, transitionDuration: statusLightWidget.motion }}
                />
              </div>
            </div>
          </article>

          <article className="widget-card">
            <div className="widget-head">
              <h3>Tray</h3>
              <code>dk.component.tray.*</code>
            </div>
            <div className="tray-widget-shell" style={{ backgroundColor: trayWidget.panel, borderColor: trayWidget.border }}>
              <div className="tray-widget-header" style={{ backgroundColor: trayWidget.header, borderColor: trayWidget.border, color: trayWidget.label }}>
                <span>Notifications</span>
                <span style={{ color: trayWidget.icon }}>close</span>
              </div>
              <div className="tray-widget-panel" style={{ borderColor: trayWidget.border }}>
                <p className="tray-widget-copy" style={{ color: trayWidget.label }}>
                  3 token changes need approval before merge.
                </p>
              </div>
            </div>
          </article>

          <article className="widget-card">
            <div className="widget-head">
              <h3>Well</h3>
              <code>dk.component.well.*</code>
            </div>
            <div className="well-widget-shell" style={{ backgroundColor: wellWidget.container, borderColor: wellWidget.border }}>
              <div
                className="well-widget-inset"
                style={{ backgroundColor: wellWidget.inset, borderColor: wellWidget.border, transitionDuration: wellWidget.motion }}
              >
                <p className="well-widget-copy" style={{ color: wellWidget.label }}>
                  Add migration notes, rationale, and release checklist.
                </p>
              </div>
            </div>
            <p className="well-widget-note" style={{ color: wellWidget.label }}>
              Inset surface for grouped supporting content.
            </p>
          </article>
        </div>

        {additionalWidgetCatalog.length > 0 ? (
          <div className="widget-subsection">
            <h3>Additional Component Widgets</h3>
            <p className="muted">
              Auto-generated widgets for all other component groups in the current selection, so every added component has
              a visual preview.
            </p>
            <div className="widget-catalog-grid">
              {additionalWidgetCatalog.map((entry) => {
                const defaultState = entry.states.default ?? {};
                const previewBackground =
                  defaultState.background && isRenderableColor(defaultState.background)
                    ? defaultState.background
                    : "var(--bg-subtle)";
                const previewBorder =
                  defaultState.border && isRenderableColor(defaultState.border) ? defaultState.border : "var(--line)";
                const previewText =
                  defaultState.text && isRenderableColor(defaultState.text) ? defaultState.text : "var(--text-strong)";
                const previewAccent =
                  defaultState.accent && isRenderableColor(defaultState.accent) ? defaultState.accent : previewText;

                return (
                  <article key={`widget-catalog-${entry.key}`} className="widget-mini-card">
                    <div className="widget-mini-head">
                      <h4>{entry.component}</h4>
                      <span>{entry.variant}</span>
                    </div>

                    <div
                      className="widget-mini-surface"
                      style={{ backgroundColor: previewBackground, borderColor: previewBorder, color: previewText }}
                    >
                      <span className="widget-mini-label">{`${entry.component} preview`}</span>
                      <span className="widget-mini-accent" style={{ backgroundColor: previewAccent }} />
                    </div>

                    <div className="widget-mini-states">
                      {componentStateOrder.map((state) => {
                        const stateEntry = entry.states[state] ?? {};
                        const dotColor =
                          (stateEntry.accent && isRenderableColor(stateEntry.accent) && stateEntry.accent) ||
                          (stateEntry.background && isRenderableColor(stateEntry.background) && stateEntry.background) ||
                          "var(--line)";

                        return (
                          <span key={`${entry.key}-${state}`} className="widget-mini-state">
                            <span className="widget-mini-dot" style={{ backgroundColor: dotColor }} aria-hidden />
                            {state}
                          </span>
                        );
                      })}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        ) : null}
      </section>

      <section id="component-docs" className="panel">
        <div className="section-heading">
          <h2>7. Component Previews and Docs</h2>
          <p className="muted">Per-component state previews with quick variable references for implementation handoff.</p>
        </div>

        <div className="component-summary">
          <p className="component-summary-item">{`Components in view: ${componentCatalog.length}`}</p>
          <p className="component-summary-item">States: default, hover, active, disabled, focus</p>
          <p className="component-summary-item">{`Component filter: ${componentQuery || "none"}`}</p>
        </div>

        <div className="component-grid">
          {componentCatalog.map((entry) => (
            <article key={entry.key} id={`component-${entry.component}-${entry.variant}`} className="component-card">
              <div className="component-card-head">
                <div>
                  <h3>{entry.component}</h3>
                  <p className="component-variant">{entry.variant}</p>
                </div>
                <p className="component-token-count">{`${entry.tokenCount} tokens`}</p>
              </div>

              <div className="component-state-grid">
                {componentStateOrder.map((state) => {
                  const statePreview = entry.states[state] ?? {};
                  const previewBackground =
                    statePreview.background && isRenderableColor(statePreview.background)
                      ? statePreview.background
                      : "var(--bg-subtle)";
                  const previewBorder =
                    statePreview.border && isRenderableColor(statePreview.border)
                      ? statePreview.border
                      : "var(--line)";
                  const previewText =
                    statePreview.text && isRenderableColor(statePreview.text) ? statePreview.text : "var(--text-strong)";
                  const previewAccent =
                    statePreview.accent && isRenderableColor(statePreview.accent)
                      ? statePreview.accent
                      : statePreview.text && isRenderableColor(statePreview.text)
                        ? statePreview.text
                        : "transparent";

                  return (
                    <div
                      key={`${entry.key}-${state}`}
                      className="component-state-card"
                      style={{ backgroundColor: previewBackground, borderColor: previewBorder, color: previewText }}
                    >
                      <span className="component-state-label">{state}</span>
                      <span className="component-state-dot" style={{ backgroundColor: previewAccent }} aria-hidden />
                    </div>
                  );
                })}
              </div>

              <details className="component-vars">
                <summary>Variable quick view</summary>
                <pre className="component-vars-preview">
                  <code>{entry.cssVars.slice(0, 8).join("\n")}</code>
                </pre>
                <Link className="component-doc-link" href={`/docs/components#${entry.component}-${entry.variant}`}>
                  Open full component docs
                </Link>
              </details>
            </article>
          ))}
          {componentCatalog.length === 0 ? <p className="muted">No component tokens match the current filter.</p> : null}
        </div>
      </section>

      <section id="developer-docs" className="panel">
        <div className="section-heading">
          <h2>Developer Documentation</h2>
          <p className="muted">Framework integration snippets are available in MDX pages.</p>
        </div>
        <div className="guide-links">
          <Link href="/docs/react">React</Link>
          <Link href="/docs/vue">Vue</Link>
          <Link href="/docs/angular">Angular</Link>
          <Link href="/docs/components">Components</Link>
        </div>
      </section>
        </div>
      </div>
    </div>
  );
}
