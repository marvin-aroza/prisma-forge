import type { Metadata } from "next";
import Link from "next/link";
import { Manrope, Source_Sans_3 } from "next/font/google";
import { getStudioFeatureFlags, getStudioInitials, getStudioMetadata } from "../lib/studio-config.js";
import "./globals.css";

const headingFont = Manrope({
  subsets: ["latin"],
  variable: "--font-heading",
  weight: ["600", "700", "800"]
});

const bodyFont = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-body"
});

const studioMeta = getStudioMetadata();
const studioFlags = getStudioFeatureFlags();

export const metadata: Metadata = {
  title: studioMeta.name,
  description: studioMeta.description
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${headingFont.variable} ${bodyFont.variable}`}>
        <header className="topbar">
          <div className="topbar-inner">
            <div className="brand-cluster">
              <Link className="brand-link" href="/studio">
                <span className="brand-mark" aria-hidden>
                  {getStudioInitials(studioMeta.name)}
                </span>
                <div>
                  <p className="brand">{studioMeta.name}</p>
                  <p className="subtitle">{studioMeta.subtitle}</p>
                </div>
              </Link>
              <div className="header-tags" aria-label="Platform highlights">
                <span>Open Source</span>
                <span>DTCG JSON</span>
                <span>PR Workflow</span>
              </div>
            </div>

            <div className="topbar-utilities">
              <p className="topbar-status">
                <span className="status-dot" aria-hidden />
                Stable + Next channels
              </p>
              <nav className="topnav" aria-label="Documentation links">
                <Link href="/studio">Studio</Link>
                {studioFlags.docs ? <Link href="/docs/react">React</Link> : null}
                {studioFlags.docs ? <Link href="/docs/vue">Vue</Link> : null}
                {studioFlags.docs ? <Link href="/docs/angular">Angular</Link> : null}
                {studioFlags.docs ? <Link href="/docs/components">Components</Link> : null}
              </nav>
            </div>
          </div>
        </header>
        <main className="app-main">{children}</main>
      </body>
    </html>
  );
}

