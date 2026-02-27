import type { Metadata } from "next";
import Link from "next/link";
import { Manrope, Source_Sans_3 } from "next/font/google";
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

export const metadata: Metadata = {
  title: "PrismForge Token Studio",
  description: "Browse, diff, and propose token changes across brands and modes."
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
                  PF
                </span>
                <div>
                  <p className="brand">PrismForge Token Studio</p>
                  <p className="subtitle">Cross-platform token governance</p>
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
                <Link href="/docs/react">React</Link>
                <Link href="/docs/vue">Vue</Link>
                <Link href="/docs/angular">Angular</Link>
                <Link href="/docs/components">Components</Link>
              </nav>
            </div>
          </div>
        </header>
        <main className="app-main">{children}</main>
      </body>
    </html>
  );
}

