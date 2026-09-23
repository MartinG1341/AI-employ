import Link from "next/link";
import { Sparkles } from "lucide-react";

type LegalLayoutProps = {
  eyebrow: string;
  title: string;
  intro: string;
  children: React.ReactNode;
};

export function LegalLayout({ eyebrow, title, intro, children }: LegalLayoutProps) {
  return (
    <main className="legal-shell">
      <header className="legal-header">
        <Link href="/" className="legal-brand">
          <span className="legal-brand-mark"><Sparkles size={15} /></span>
          <span>Sales Copilot</span>
        </Link>
        <nav className="legal-nav" aria-label="Legal navigation">
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/data-deletion">Data deletion</Link>
        </nav>
      </header>

      <article className="legal-content">
        <div className="legal-hero">
          <span className="legal-eyebrow">{eyebrow}</span>
          <h1>{title}</h1>
          <p>{intro}</p>
        </div>
        <div className="legal-body">{children}</div>
      </article>

      <footer className="legal-footer">
        <span>Sales Copilot</span>
        <a href="mailto:geogmartin130@gmail.com">geogmartin130@gmail.com</a>
      </footer>
    </main>
  );
}
