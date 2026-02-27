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

export default function ComponentsDocPage() {
  const tokens = loadResolvedTokens("acme", "light");
  const components = getComponentCatalog(tokens);

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
          <Link href="/">Back to Token Studio</Link>
          <Link href="/docs/react">React snippets</Link>
          <Link href="/docs/vue">Vue snippets</Link>
          <Link href="/docs/angular">Angular snippets</Link>
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
