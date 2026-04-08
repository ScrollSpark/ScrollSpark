import React from 'react';
import LegalPageShell from '@/components/LegalPageShell';
import { legalSection, legalH2, legalP, legalUl } from '@/lib/legalStyles';
import { SUPPORT_EMAIL } from '@/lib/appContact';

export default function PrivacyPolicy() {
  return (
    <LegalPageShell title="Privacy Policy" lastUpdated="April 6, 2026">
      <div style={legalSection}>
        <p style={legalP}>
          ScrollSpark (“we,” “us”) respects your privacy. This Privacy Policy describes how we collect, use, and share
          information when you use the ScrollSpark mobile application and related services (together, the “Service”).
        </p>
      </div>

      <div style={legalSection}>
        <h2 style={legalH2}>1. Information we collect</h2>
        <p style={legalP}><strong style={{ color: '#111827' }}>Account and profile.</strong> When you create an account, we
          collect your email address and credentials. You may also provide a display name, hobbies, and preferences used
          to personalize sparks and the experience.</p>
        <p style={legalP}><strong style={{ color: '#111827' }}>Usage and content.</strong> We process information needed to
          provide sparks (such as hobby context you choose to send when generating a spark), streaks, limits, and app
          functionality.</p>
        <p style={legalP}><strong style={{ color: '#111827' }}>Device and technical data.</strong> We may collect
          device-related information (such as app version, operating system) and logs needed for security, debugging,
          and reliability.</p>
        <p style={legalP}><strong style={{ color: '#111827' }}>Purchases.</strong> If you subscribe through the App Store
          or Google Play, Apple or Google and our subscription partner (e.g. RevenueCat) process payment information. We
          do not receive your full card number.</p>
      </div>

      <div style={legalSection}>
        <h2 style={legalH2}>2. How we use information</h2>
        <p style={legalP}>We use information to:</p>
        <ul style={legalUl}>
          <li>Provide, maintain, and improve the Service;</li>
          <li>Authenticate you and protect accounts;</li>
          <li>Generate and deliver sparks and related features (including through AI systems);</li>
          <li>Enforce usage limits and subscription status;</li>
          <li>Communicate with you about the Service (e.g. security or policy notices);</li>
          <li>Comply with law and respond to lawful requests.</li>
        </ul>
      </div>

      <div style={legalSection}>
        <h2 style={legalH2}>3. AI and third-party processing</h2>
        <p style={legalP}>
          Sparks may be created using artificial intelligence. Content you provide for personalization (such as hobby
          names or prompts you supply) may be sent to our backend systems and AI providers to generate text or related
          outputs. Do not submit sensitive personal data you are not comfortable having processed for this purpose.
        </p>
      </div>

      <div style={legalSection}>
        <h2 style={legalH2}>4. How we share information</h2>
        <p style={legalP}>We may share information with:</p>
        <ul style={legalUl}>
          <li><strong style={{ color: '#111827' }}>Service providers</strong> who host data, run authentication, analytics,
            or AI on our behalf (for example, cloud and authentication providers);</li>
          <li><strong style={{ color: '#111827' }}>App stores and subscription platforms</strong> (Apple, Google, and
            subscription management tools) as needed to process purchases and entitlements;</li>
          <li><strong style={{ color: '#111827' }}>Authorities</strong> when required by law or to protect rights and safety.</li>
        </ul>
        <p style={legalP}>We do not sell your personal information as traditionally defined in “sale” opt-out laws.</p>
      </div>

      <div style={legalSection}>
        <h2 style={legalH2}>5. Retention</h2>
        <p style={legalP}>
          We retain information as long as your account is active and as needed to provide the Service, comply with legal
          obligations, resolve disputes, and enforce our agreements. Some data may persist in backups for a limited period.
        </p>
      </div>

      <div style={legalSection}>
        <h2 style={legalH2}>6. Security</h2>
        <p style={legalP}>
          We use reasonable technical and organizational measures to protect information. No method of transmission or
          storage is 100% secure.
        </p>
      </div>

      <div style={legalSection}>
        <h2 style={legalH2}>7. Your choices and rights</h2>
        <p style={legalP}>
          Depending on where you live, you may have rights to access, correct, delete, or export personal information, or
          to object to or restrict certain processing. To exercise these rights, contact us at{' '}
          <a href={`mailto:${SUPPORT_EMAIL}`} style={{ color: '#7c3aed', fontWeight: 600 }}>
            {SUPPORT_EMAIL}
          </a>
          . We may need to verify your request.
        </p>
      </div>

      <div style={legalSection}>
        <h2 style={legalH2}>8. Children</h2>
        <p style={legalP}>
          The Service is not directed to children under 13 (or the minimum age required in your region), and we do not
          knowingly collect personal information from children in violation of applicable law.
        </p>
      </div>

      <div style={legalSection}>
        <h2 style={legalH2}>9. International users</h2>
        <p style={legalP}>
          If you use the Service from outside the country where we operate systems, your information may be transferred
          to and processed in countries that may have different data protection laws.
        </p>
      </div>

      <div style={legalSection}>
        <h2 style={legalH2}>10. Changes</h2>
        <p style={legalP}>
          We may update this Privacy Policy from time to time. We will post the updated policy in the App and revise the
          “Last updated” date above.
        </p>
      </div>

      <div style={{ ...legalSection, marginBottom: 0 }}>
        <h2 style={legalH2}>11. Contact</h2>
        <p style={{ ...legalP, marginBottom: 0 }}>
          Questions about this Privacy Policy:{' '}
          <a href={`mailto:${SUPPORT_EMAIL}`} style={{ color: '#7c3aed', fontWeight: 600 }}>
            {SUPPORT_EMAIL}
          </a>
        </p>
      </div>
    </LegalPageShell>
  );
}
