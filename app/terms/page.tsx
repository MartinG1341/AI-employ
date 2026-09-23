import type { Metadata } from "next";
import { LegalLayout } from "../legal-layout";

export const metadata: Metadata = {
  title: "Terms of Service | Sales Copilot",
  description: "Terms for using the Sales Copilot application.",
};

export default function TermsPage() {
  return (
    <LegalLayout
      eyebrow="Sales Copilot"
      title="Terms of Service"
      intro="These simple terms describe the expectations for using the early-stage Sales Copilot service."
    >
      <section className="legal-section">
        <h2>Service</h2>
        <p>Sales Copilot is a workspace for managing leads and follow-ups, reviewing eligible Instagram conversations, and creating AI-assisted research and message drafts. Features may change as the service develops.</p>
      </section>

      <section className="legal-section">
        <h2>Your connected accounts</h2>
        <p>You are responsible for the Instagram and other accounts you connect, the permissions you grant, and the information you enter. You must have the authority to use those accounts and data with Sales Copilot.</p>
        <p>You must comply with Meta and Instagram terms, policies, messaging rules, and any other rules that apply to your connected accounts.</p>
      </section>

      <section className="legal-section">
        <h2>Third-party services</h2>
        <p>Sales Copilot depends on third-party services, including Meta, Instagram, Supabase, and AI providers. We do not guarantee uninterrupted availability, delivery, or behavior of third-party APIs or services.</p>
      </section>

      <section className="legal-section">
        <h2>AI-assisted output</h2>
        <p>AI research, replies, and drafts may be incomplete, inaccurate, or unsuitable for a particular situation. Review and approve output before relying on it, sending it, or making a business decision.</p>
      </section>

      <section className="legal-section">
        <h2>Acceptable use</h2>
        <p>You may not use Sales Copilot to violate laws, third-party rights, or platform rules; send unauthorized or deceptive communications; abuse or disrupt the service; attempt to access data that is not yours; or submit malicious content or instructions.</p>
      </section>

      <section className="legal-section">
        <h2>Limitations</h2>
        <p>Sales Copilot is provided as an early-stage software service. To the extent permitted by applicable law, it is provided without guarantees that it will be error-free, uninterrupted, or suitable for every purpose. You remain responsible for reviewing data, drafts, actions, and results before relying on them.</p>
      </section>

      <section className="legal-section">
        <h2>Contact</h2>
        <p>For questions about these terms, contact <a href="mailto:geogmartin130@gmail.com">geogmartin130@gmail.com</a>.</p>
      </section>
    </LegalLayout>
  );
}
