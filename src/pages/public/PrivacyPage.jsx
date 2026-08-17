import { Container, SectionHeader, Seo } from '../../components/common';

export function PrivacyPage() {
  return (
    <div className="ch-legal-page">
      <Seo title="Privacy Policy" description="CardHub Privacy Policy." />
      <Container>
        <SectionHeader eyebrow="Legal" title="Privacy Policy" description="Last updated 17 August 2026" />
        <div className="ch-legal-page__content">
          <p>
            This Privacy Policy explains how Clix Digital Works collects and uses information
            through CardHub. CardHub is under active development; this policy will expand as new
            features (guest data, payments, communications) are introduced.
          </p>
          <h3 className="ch-h4">1. Information we collect</h3>
          <p>
            When you create a CardHub account, we collect your name, email address, phone number,
            and a securely hashed password. We never store your password in plain text.
          </p>
          <h3 className="ch-h4">2. How we use your information</h3>
          <p>
            We use your information to operate your CardHub account, secure your session, and
            communicate with you about your account and events.
          </p>
          <h3 className="ch-h4">3. Data security</h3>
          <p>
            Passwords are hashed with bcrypt, sessions use short-lived access tokens with securely
            stored refresh tokens, and all account actions are recorded in an internal audit log.
          </p>
          <h3 className="ch-h4">4. Your choices</h3>
          <p>
            You can update your profile information and notification preferences from your account
            settings at any time.
          </p>
          <h3 className="ch-h4">5. Contact</h3>
          <p>Questions about this policy can be sent to hello@cardhub.co.tz.</p>
        </div>
      </Container>
    </div>
  );
}
