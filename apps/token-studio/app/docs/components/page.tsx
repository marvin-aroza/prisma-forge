import Link from "next/link";
import type { ComponentCatalogEntry } from "../../../lib/tokens";
import { getComponentCatalog, loadResolvedTokens } from "../../../lib/tokens";

function pickVar(entry: ComponentCatalogEntry, keys: string[]) {
  return (
    entry.cssVars.find((cssVar) => keys.some((key) => cssVar.includes(`-${key}-`) || cssVar.endsWith(`-${key}`))) ??
    entry.cssVars[0] ??
    "--dk-component-fallback"
  );
}

function buildSnippet(entry: ComponentCatalogEntry) {
  const borderVar = pickVar(entry, ["border"]);
  const backgroundVar = pickVar(entry, ["bg", "background", "panel", "container", "item", "tab"]);
  const textVar = pickVar(entry, ["label", "title", "body", "link", "text"]);
  const motionVar = pickVar(entry, ["motion"]);

  return `.pf-${entry.component}-${entry.variant} {
  border-color: var(${borderVar});
  background: var(${backgroundVar});
  color: var(${textVar});
  transition-duration: var(${motionVar});
}`;
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

export default function ComponentsDocPage() {
  const tokens = loadResolvedTokens("acme", "light");
  const components = getComponentCatalog(tokens);
  const tokenMap = new Map(tokens.map((token) => [token.id, token]));

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

  return (
    <div className="page-shell docs-shell">
      <section className="panel">
        <div className="section-heading">
          <h1 className="doc-h1">Component Token Reference</h1>
          <p className="doc-p">
            Per-component docs generated from resolved tokens (`acme/light`). Use this as the implementation map for UI
            components in any frontend stack.
          </p>
        </div>
        <div className="guide-links">
          <Link href="/studio">Back to Token Studio</Link>
          <Link href="/docs/react">React snippets</Link>
          <Link href="/docs/vue">Vue snippets</Link>
          <Link href="/docs/angular">Angular snippets</Link>
        </div>
      </section>

      <section className="panel">
        <div className="section-heading">
          <h2 className="doc-h2">Featured Component Examples</h2>
          <p className="doc-p">
            Dedicated docs previews for the latest component batch: action-group, status-light, tray, and well.
          </p>
        </div>

        <div className="widget-grid">
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
      </section>

      <section className="panel">
        <div className="section-heading">
          <h2 className="doc-h2">Component Catalog</h2>
          <p className="doc-p">{`${components.length} component variants with mapped token variables.`}</p>
        </div>

        <div className="component-grid component-grid-docs">
          {components.map((entry) => (
            <article key={entry.key} id={`${entry.component}-${entry.variant}`} className="component-card">
              <div className="component-card-head">
                <div>
                  <h3>{entry.component}</h3>
                  <p className="component-variant">{entry.variant}</p>
                </div>
                <p className="component-token-count">{`${entry.tokenCount} tokens`}</p>
              </div>

              <pre className="component-vars-preview">
                <code>{buildSnippet(entry)}</code>
              </pre>

              <details className="component-vars">
                <summary>All CSS variables</summary>
                <pre className="component-vars-preview">
                  <code>{entry.cssVars.join("\n")}</code>
                </pre>
              </details>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
