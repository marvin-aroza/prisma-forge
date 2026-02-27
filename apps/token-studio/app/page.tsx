import Link from "next/link";
import { TokenChangeForm } from "./components/token-change-form";
import { contrastRatio } from "../lib/color";
import {
  diffTokens,
  filterTokens,
  getComponentCatalog,
  getUniqueValues,
  listBrandsAndModes,
  loadResolvedTokens
} from "../lib/tokens";

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

export default async function Page({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
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

  return (
    <div className={`page-shell density-${density}`}>
      <section className="hero hero-main">
        <div className="hero-copy">
          <p className="eyebrow">Token Studio</p>
          <h1>Understand Tokens in 4 Steps</h1>
          <p className="lead">
            Review token behavior with a guided workflow: set theme context, inspect preview behavior, compare environments,
            then send a validated token edit to draft PR.
          </p>
          <div className="step-links">
            <a href="#theme-controls">1. Theme Controls</a>
            <a href="#preview-board">2. Visual Preview</a>
            <a href="#diff-analysis">3. Diff Analysis</a>
            <a href="#edit-workflow">4. Propose Edit</a>
            <a href="#token-catalog">5. Token Catalog</a>
            <a href="#component-docs">6. Component Docs</a>
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

      <section id="theme-controls" className="panel">
        <div className="section-heading">
          <h2>1. Theme and Filter Controls</h2>
          <p className="muted">Pick brand/mode, narrow token scope, then set the comparison target.</p>
        </div>

        <form className="filters-layout" method="GET">
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

      <TokenChangeForm brand={selectedBrand} mode={selectedMode} sectionId="edit-workflow" />

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

      <section id="component-docs" className="panel">
        <div className="section-heading">
          <h2>6. Component Previews and Docs</h2>
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

      <section className="panel">
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
  );
}
