import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Compact Terms · Privacy · Support row for auth and purchase screens (store compliance).
 */
export default function FooterLegalLinks({ marginTop = 16 }) {
  const linkStyle = { color: '#7c3aed', fontWeight: 600, textDecoration: 'none', fontSize: 12 };
  return (
    <p style={{ textAlign: 'center', fontSize: 12, color: '#9ca3af', margin: `${marginTop}px 0 0`, lineHeight: 1.5 }}>
      <Link to="/terms" style={linkStyle}>Terms of Use</Link>
      {' · '}
      <Link to="/privacy" style={linkStyle}>Privacy Policy</Link>
      {' · '}
      <Link to="/support" style={linkStyle}>Support</Link>
    </p>
  );
}
