import React from 'react';
import LegalPageShell from '@/components/LegalPageShell';
import { legalSection, legalH2, legalP } from '@/lib/legalStyles';

export default function TermsOfUse() {
  return (
    <LegalPageShell title="Terms of Use" lastUpdated="April 6, 2026">
      <div style={legalSection}>
        <h2 style={legalH2}>1. Agreement</h2>
        <p style={legalP}>
          By accessing or using ScrollSpark (“the App”), you agree to these Terms of Use. If you do not agree, do not
          use the App.
        </p>
      </div>

      <div style={legalSection}>
        <h2 style={legalH2}>2. The service</h2>
        <p style={legalP}>
          ScrollSpark provides tools to support your hobbies, including AI-generated “sparks” and related features.
          We may add, change, or remove features to improve the service, comply with law, or address reliability and
          safety.
        </p>
      </div>

      <div style={legalSection}>
        <h2 style={legalH2}>3. Sparks and usage limits</h2>
        <p style={legalP}>
          Your use of sparks may be subject to limits (for example, per day or per month), including different
          limits for free and paid tiers.{' '}
          <strong style={{ color: '#111827' }}>
            The number of sparks you may receive per month (and other usage limits) may change from time to time,
            including when we adjust allowances based on the cost to generate or deliver sparks
          </strong>{' '}
          (such as changes in AI inference, hosting, or other operational costs). We will try to communicate
          material changes in the App when reasonable.
        </p>
        <p style={legalP}>
          Limits exist to keep the service fair and sustainable. Attempts to abuse, automate, or circumvent limits
          may result in suspension or termination of access.
        </p>
      </div>

      <div style={legalSection}>
        <h2 style={legalH2}>4. Accounts</h2>
        <p style={legalP}>
          You are responsible for your account credentials and for activity under your account. Provide accurate
          information and keep your contact details up to date where the App allows.
        </p>
      </div>

      <div style={legalSection}>
        <h2 style={legalH2}>5. Subscriptions and payments</h2>
        <p style={legalP}>
          If you purchase a subscription through the App Store or Google Play, billing and cancellation are
          governed by those platforms’ terms in addition to these Terms. Features and limits tied to a subscription
          remain subject to Section 3.
        </p>
      </div>

      <div style={legalSection}>
        <h2 style={legalH2}>6. Content and AI output</h2>
        <p style={legalP}>
          Sparks and other AI-assisted content are generated for inspiration and motivation. They are not
          professional advice (medical, legal, financial, or otherwise). You use the App at your own discretion.
        </p>
      </div>

      <div style={legalSection}>
        <h2 style={legalH2}>7. Disclaimers</h2>
        <p style={legalP}>
          The App is provided “as is” to the fullest extent permitted by law. We do not warrant uninterrupted or
          error-free operation.
        </p>
      </div>

      <div style={legalSection}>
        <h2 style={legalH2}>8. Limitation of liability</h2>
        <p style={legalP}>
          To the maximum extent permitted by applicable law, ScrollSpark and its operators will not be liable for
          indirect, incidental, special, consequential, or punitive damages, or for loss of profits or data, arising
          from your use of the App.
        </p>
      </div>

      <div style={legalSection}>
        <h2 style={legalH2}>9. Changes to these terms</h2>
        <p style={legalP}>
          We may update these Terms from time to time. The “Last updated” date at the top will change when we do.
          Continued use of the App after changes means you accept the updated Terms.
        </p>
      </div>

      <div style={{ ...legalSection, marginBottom: 0 }}>
        <h2 style={legalH2}>10. Contact</h2>
        <p style={{ ...legalP, marginBottom: 0 }}>
          For questions about these Terms, use the Support page in the App or contact us through the email listed
          there.
        </p>
      </div>
    </LegalPageShell>
  );
}
