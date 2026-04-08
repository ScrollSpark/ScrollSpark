import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Mail, Lock, ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { formatAuthError } from '@/lib/authErrors';
import FooterLegalLinks from '@/components/FooterLegalLinks';

function FloatingEmojis() {
  const emojis = ['⚡', '✨', '🌟', '💫', '🎯'];
  return (
    <div style={{ pointerEvents: 'none', position: 'fixed', inset: 0, overflow: 'hidden', zIndex: 0 }}>
      {emojis.map((emoji, i) => (
        <motion.div
          key={i}
          style={{ position: 'absolute', fontSize: 22, opacity: 0.18, left: `${(i * 17) % 88}%` }}
          initial={{ y: '110vh' }}
          animate={{ y: '-10vh' }}
          transition={{ duration: 10 + i, repeat: Infinity, delay: i * 1.2, ease: 'linear' }}
        >
          {emoji}
        </motion.div>
      ))}
    </div>
  );
}

const inputStyle = {
  width: '100%',
  padding: '12px 14px 12px 44px',
  borderRadius: 14,
  border: '2px solid #e9d5ff',
  fontSize: 15,
  outline: 'none',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
};

export default function SignUp() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setInfo(null);

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      const redirect = typeof window !== 'undefined' ? `${window.location.origin}/login` : undefined;
      const { data, error: signErr } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: redirect
          ? {
              emailRedirectTo: redirect,
            }
          : undefined,
      });
      if (signErr) throw signErr;

      await queryClient.invalidateQueries({ queryKey: ['userProfile'] });

      if (data.session) {
        navigate('/onboarding', { replace: true });
      } else {
        setInfo(
          'Check your email for a confirmation link. After you confirm, you can sign in and finish setup.'
        );
      }
    } catch (err) {
      setError(formatAuthError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #7c3aed 0%, #ec4899 45%, #f97316 100%)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <FloatingEmojis />

      <div style={{
        position: 'relative',
        zIndex: 10,
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            width: '100%',
            maxWidth: 420,
            background: 'rgba(255,255,255,0.97)',
            borderRadius: 28,
            padding: 32,
            boxShadow: '0 24px 60px rgba(0,0,0,0.22)',
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ fontSize: 44, marginBottom: 8 }}>⚡</div>
            <h1 style={{ fontSize: 26, fontWeight: 900, margin: '0 0 6px', color: '#111827' }}>
              Create your account
            </h1>
            <p style={{ color: '#6b7280', margin: 0, fontSize: 15 }}>
              Join ScrollSpark and turn scroll time into hobby time.
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 14, position: 'relative' }}>
              <Mail
                size={18}
                color="#9ca3af"
                style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                style={inputStyle}
                onFocus={(e) => { e.target.style.borderColor = '#8b5cf6'; }}
                onBlur={(e) => { e.target.style.borderColor = '#e9d5ff'; }}
              />
            </div>

            <div style={{ marginBottom: 14, position: 'relative' }}>
              <Lock
                size={18}
                color="#9ca3af"
                style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password (min 6 characters)"
                style={inputStyle}
                onFocus={(e) => { e.target.style.borderColor = '#8b5cf6'; }}
                onBlur={(e) => { e.target.style.borderColor = '#e9d5ff'; }}
              />
            </div>

            <div style={{ marginBottom: 18, position: 'relative' }}>
              <Lock
                size={18}
                color="#9ca3af"
                style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                type="password"
                autoComplete="new-password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Confirm password"
                style={inputStyle}
                onFocus={(e) => { e.target.style.borderColor = '#8b5cf6'; }}
                onBlur={(e) => { e.target.style.borderColor = '#e9d5ff'; }}
              />
            </div>

            {error && (
              <p style={{ color: '#dc2626', fontSize: 13, marginBottom: 12, textAlign: 'center' }}>
                {error}
              </p>
            )}
            {info && (
              <p style={{ color: '#059669', fontSize: 13, marginBottom: 12, textAlign: 'center', lineHeight: 1.5 }}>
                {info}
              </p>
            )}

            <p style={{ fontSize: 12, lineHeight: 1.5, color: '#6b7280', margin: '0 0 16px', textAlign: 'center' }}>
              By creating an account, you agree to ScrollSpark’s{' '}
              <Link to="/terms" style={{ color: '#7c3aed', fontWeight: 700, textDecoration: 'none' }}>
                Terms of Use
              </Link>
              {' '}and{' '}
              <Link to="/privacy" style={{ color: '#7c3aed', fontWeight: 700, textDecoration: 'none' }}>
                Privacy Policy
              </Link>
              .
            </p>

            <motion.button
              type="submit"
              disabled={submitting}
              whileTap={{ scale: submitting ? 1 : 0.98 }}
              style={{
                width: '100%',
                padding: '16px 0',
                borderRadius: 16,
                border: 'none',
                background: 'linear-gradient(90deg, #8b5cf6, #ec4899, #f97316)',
                color: 'white',
                fontWeight: 800,
                fontSize: 16,
                cursor: submitting ? 'not-allowed' : 'pointer',
                opacity: submitting ? 0.75 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                fontFamily: 'inherit',
                marginBottom: 20,
              }}
            >
              {submitting ? 'Creating account…' : (
                <>Sign up <ArrowRight size={18} /></>
              )}
            </motion.button>
          </form>

          <p style={{ textAlign: 'center', fontSize: 14, color: '#6b7280', margin: '0 0 8px' }}>
            Already have an account?{' '}
            <Link
              to="/login"
              style={{ color: '#7c3aed', fontWeight: 700, textDecoration: 'none' }}
            >
              Log in
            </Link>
          </p>

          <FooterLegalLinks marginTop={0} />
        </motion.div>
      </div>
    </div>
  );
}
