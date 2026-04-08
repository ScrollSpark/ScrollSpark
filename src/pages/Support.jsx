import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import LegalPageShell from '@/components/LegalPageShell';
import { legalSection, legalH2, legalP, legalUl } from '@/lib/legalStyles';
import { SUPPORT_EMAIL } from '@/lib/appContact';

export default function Support() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const { hash } = window.location;
    if (hash === '#account-deletion') {
      const el = document.getElementById('account-deletion');
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  const mailtoGeneral = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('ScrollSpark support')}`;
  const mailtoDelete = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Delete my ScrollSpark account')}&body=${encodeURIComponent(
    'Please delete my ScrollSpark account associated with this email address.\n'
  )}`;

  return (
    <LegalPageShell title="Help & Support" lastUpdated={null}>
      <div style={legalSection}>
        <p style={legalP}>
          ScrollSpark is a hobby motivation app. Use the options below if you need help, have privacy questions, or want
          to delete your account.
        </p>
      </div>

      <div style={legalSection}>
        <h2 style={legalH2}>Contact us</h2>
        <p style={legalP}>
          Email:{' '}
          <a href={mailtoGeneral} style={{ color: '#7c3aed', fontWeight: 700, wordBreak: 'break-all' }}>
            {SUPPORT_EMAIL}
          </a>
        </p>
        <p style={legalP}>
          We aim to respond to routine requests within a few business days. For subscription billing issues, Apple and
          Google also provide purchase history and refund tools in their store settings.
        </p>
      </div>

      <div style={legalSection}>
        <h2 style={legalH2}>Subscriptions (App Store & Google Play)</h2>
        <p style={legalP}>
          Premium is sold through the platform where you installed the app. To manage or cancel a subscription, use
          Apple’s or Google’s subscription settings. You can also open in-app subscription management where available
          (e.g. RevenueCat Customer Center on iOS).
        </p>
        <p style={legalP}>
          <Link to="/premium" style={{ color: '#7c3aed', fontWeight: 600 }}>
            Go to Premium
          </Link>
        </p>
      </div>

      <div style={{ ...legalSection, scrollMarginTop: 24 }} id="account-deletion">
        <h2 style={legalH2}>Delete your account</h2>
        <p style={legalP}>
          You may request deletion of your ScrollSpark account and associated profile data. Send an email from the address
          registered on your account so we can verify ownership.
        </p>
        <p style={legalP}>
          <a
            href={mailtoDelete}
            style={{
              display: 'inline-block',
              background: 'linear-gradient(90deg, #8b5cf6, #ec4899)',
              color: 'white',
              fontWeight: 800,
              fontSize: 15,
              padding: '12px 20px',
              borderRadius: 12,
              textDecoration: 'none',
            }}
          >
            Request account deletion
          </a>
        </p>
        <p style={{ ...legalP, fontSize: 13, color: '#6b7280' }}>
          After deletion, you may lose access to streaks, sparks history, and subscription entitlements tied to this
          account. Some records may be retained where required by law or for legitimate security and fraud-prevention
          purposes.
        </p>
      </div>

      <div style={legalSection}>
        <h2 style={legalH2}>Common topics</h2>
        <ul style={legalUl}>
          <li><strong style={{ color: '#111827' }}>Email confirmation:</strong> check spam, and use “Resend confirmation” on the login screen.</li>
          <li><strong style={{ color: '#111827' }}>Sparks limits:</strong> see Terms of Use — limits may change over time.</li>
          <li><strong style={{ color: '#111827' }}>Privacy:</strong> read our Privacy Policy for how data is used.</li>
        </ul>
      </div>

      <div style={{ ...legalSection, marginBottom: 0 }}>
        <h2 style={legalH2}>Legal</h2>
        <p style={{ ...legalP, marginBottom: 8 }}>
          <Link to="/terms" style={{ color: '#7c3aed', fontWeight: 600 }}>Terms of Use</Link>
          {' · '}
          <Link to="/privacy" style={{ color: '#7c3aed', fontWeight: 600 }}>Privacy Policy</Link>
        </p>
      </div>
    </LegalPageShell>
  );
}
