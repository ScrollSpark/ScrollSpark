import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function LegalPageShell({ title, lastUpdated, backTo = '/', children }) {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #faf5ff 0%, #fffbeb 50%, #fdf2f8 100%)',
      padding: '24px 16px 48px',
    }}>
      <div style={{ maxWidth: 560, margin: '0 auto' }}>
        <Link
          to={backTo}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            color: '#6b7280',
            fontWeight: 600,
            fontSize: 15,
            textDecoration: 'none',
            marginBottom: 20,
          }}
        >
          <ArrowLeft size={18} /> Back
        </Link>

        <h1 style={{ fontSize: 26, fontWeight: 900, margin: '0 0 8px', color: '#111827' }}>
          {title}
        </h1>
        {lastUpdated ? (
          <p style={{ fontSize: 13, color: '#9ca3af', margin: '0 0 28px' }}>
            Last updated: {lastUpdated}
          </p>
        ) : (
          <div style={{ marginBottom: 28 }} />
        )}

        <div style={{
          background: 'white',
          borderRadius: 20,
          padding: 24,
          boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
        }}>
          {children}
        </div>
      </div>
    </div>
  );
}
