import type { Metadata } from "next";
import { LegalLayout } from "../legal-layout";

export const metadata: Metadata = {
  title: "Privacy Policy | Sales Copilot",
  description: "How Sales Copilot handles Instagram, lead, and AI-assisted workspace data.",
};

export default function PrivacyPage() {
  return (
    <LegalLayout
      eyebrow="Sales Copilot"
      title="Privacy Policy"
      intro="This page explains what information Sales Copilot may process when you connect Instagram or use the workspace."
    >
      <section className="legal-section">
        <h2>Information we may process</h2>
        <p>Depending on the features you use, Sales Copilot may process:</p>
        <ul>
          <li>Instagram professional account identity, account ID, and username.</li>
          <li>Instagram conversation metadata and direct-message content.</li>
          <li>Participant metadata when Meta provides it through the connected Instagram API.</li>
          <li>Lead and business information you enter into Sales Copilot.</li>
          <li>AI-generated research, drafts, and replies created through the workspace.</li>
        </ul>
      </section>

      <section className="legal-section">
        <h2>How information is used</h2>
        <p>We use this information to provide the features you request, including:</p>
        <ul>
          <li>Synchronizing eligible Instagram conversations.</li>
          <li>Providing inbox and reply assistance.</li>
          <li>Managing leads, business knowledge, and follow-ups.</li>
          <li>Generating AI-assisted drafts, research, and analysis when you invoke those features.</li>
        </ul>
      </section>

      <section className="legal-section">
        <h2>Services used</h2>
        <p>Meta and Instagram provide the Instagram account and messaging data made available through your connection. Supabase is used for application data and storage. When you invoke an AI feature, OpenAI may process relevant text to provide the requested generation or analysis.</p>
        <p>Sales Copilot does not sell personal data.</p>
      </section>

      <section className="legal-section">
        <h2>Your choices</h2>
        <p>You may disconnect Instagram from Sales Copilot. You may also request deletion of data associated with your use of the application by emailing <a href="mailto:geogmartin130@gmail.com">geogmartin130@gmail.com</a>.</p>
      </section>

      <section className="legal-section">
        <h2>Contact</h2>
        <p>Questions about privacy or data handling can be sent to <a href="mailto:geogmartin130@gmail.com">geogmartin130@gmail.com</a>.</p>
      </section>
    </LegalLayout>
  );
}
