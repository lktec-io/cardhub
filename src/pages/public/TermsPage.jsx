import { Container, SectionHeader, Seo } from '../../components/common';

export function TermsPage() {
  return (
    <div className="ch-legal-page">
      <Seo title="Terms of Service" description="CardHub Terms of Service." />
      <Container>
        <SectionHeader eyebrow="Legal" title="Terms of Service" description="Last updated 17 August 2026" />
        <div className="ch-legal-page__content">
          <p>
            CardHub is currently in active development by Clix Digital Works. These terms will
            govern your use of CardHub once the platform is generally available; they are
            published here ahead of launch as part of CardHub's foundation.
          </p>
          <h3 className="ch-h4">1. Using CardHub</h3>
          <p>
            You agree to use CardHub only for lawful purposes and to provide accurate information
            when creating an account.
          </p>
          <h3 className="ch-h4">2. Accounts</h3>
          <p>
            You are responsible for maintaining the confidentiality of your account credentials and
            for all activity under your account.
          </p>
          <h3 className="ch-h4">3. Content</h3>
          <p>
            You retain ownership of the invitation content you create. By using CardHub, you grant
            us the rights necessary to host and display that content back to you and your invited
            guests.
          </p>
          <h3 className="ch-h4">4. Changes</h3>
          <p>
            As CardHub grows through its development phases, these terms may be updated. Material
            changes will be communicated before they take effect.
          </p>
          <h3 className="ch-h4">5. Contact</h3>
          <p>Questions about these terms can be sent to hello@cardhub.co.tz.</p>
        </div>
      </Container>
    </div>
  );
}
