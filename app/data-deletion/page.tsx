import type { Metadata } from "next";
import { LegalLayout } from "../legal-layout";

export const metadata: Metadata = {
  title: "Data Deletion | Sales Copilot",
  description: "How to request deletion of Sales Copilot application data.",
};

export default function DataDeletionPage() {
  return (
    <LegalLayout
      eyebrow="Sales Copilot"
      title="Data deletion"
      intro="You can request deletion of data associated with your use of Sales Copilot at any time."
    >
      <section className="legal-section">
        <h2>How to request deletion</h2>
        <p>Email <a href="mailto:geogmartin130@gmail.com?subject=Sales%20Copilot%20data%20deletion%20request">geogmartin130@gmail.com</a> with the subject “Sales Copilot data deletion request.”</p>
        <p>To help us identify the right data, include the email address or other non-sensitive identifier you used with Sales Copilot, the Instagram username connected to the workspace if applicable, and a description of what you want deleted.</p>
        <div className="legal-callout"><p>Never include a password, access token, app secret, or other credential in a deletion request.</p></div>
      </section>

      <section className="legal-section">
        <h2>Data that can be included</h2>
        <p>A deletion request may cover:</p>
        <ul>
          <li>Sales Copilot account or application data associated with your use.</li>
          <li>Stored Instagram connection and token data.</li>
          <li>Synchronized Instagram conversations and messages.</li>
          <li>Lead, follow-up, business knowledge, and learning data associated with the request.</li>
        </ul>
      </section>

      <section className="legal-section">
        <h2>After a request</h2>
        <p>We may need to confirm which workspace or connected account the request concerns before taking action. We will use the information in your request only to identify and process the deletion request, and we may retain limited information where required for security, legal, or operational reasons.</p>
      </section>

      <section className="legal-section">
        <h2>Contact</h2>
        <p>Deletion requests and related questions should be sent to <a href="mailto:geogmartin130@gmail.com">geogmartin130@gmail.com</a>.</p>
      </section>
    </LegalLayout>
  );
}
