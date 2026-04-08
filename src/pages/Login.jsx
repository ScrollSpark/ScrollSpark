import React, { useState, useEffect } from 'react';
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

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [resendMsg, setResendMsg] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [callbackBusy, setCallbackBusy] = useState(true);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;
      if (session) {
        await queryClient.invalidateQueries({ queryKey: ['userProfile'] });
        navigate('/', { replace: true });
        return;
      }

      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      if (code) {
        const { error: exchangeErr } = await supabase.auth.exchangeCodeForSession(code);
        if (cancelled) return;
        if (exchangeErr) {
          setError(formatAuthError(exchangeErr));
          window.history.replaceState({}, '', `${window.location.pathname}${window.location.hash}`);
          setCallbackBusy(false);
          return;
        }
        await queryClient.invalidateQueries({ queryKey: ['userProfile'] });
        navigate('/', { replace: true });
        return;
      }

      const { data: { session: s2 } } = await supabase.auth.getSession();
      if (cancelled) return;
      if (s2) {
        await queryClient.invalidateQueries({ queryKey: ['userProfile'] });
        navigate('/', { replace: true });
        return;
      }

      setCallbackBusy(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [navigate, queryClient]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setResendMsg(null);
    setSubmitting(true);
    try {
      const { error: signErr } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signErr) throw signErr;

      await queryClient.invalidateQueries({ queryKey: ['userProfile'] });
      navigate('/', { replace: true });
    } catch (err) {
      setError(formatAuthError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendConfirmation = async () => {
    setError(null);
    setResendMsg(null);
    if (!email.trim()) {
      setError('Enter your email address above, then tap resend.');
      return;
    }
    setResending(true);
    try {
      const { error: resendErr } = await supabase.auth.resend({
        type: 'signup',
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/login`,
        },
      });
      if (resendErr) throw resendErr;
      setResendMsg('We sent another confirmation email. Check your inbox and spam folder.');
    } catch (err) {
      setError(formatAuthError(err));
    } finally {
      setResending(false);
    }
  };

  if (callbackBusy) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #7c3aed 0%, #ec4899 45%, #f97316 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{
          width: 40, height: 40, borderRadius: '50%',
          border: '4px solid rgba(255,255,255,0.4)', borderTopColor: 'white',
          animation: 'spin 0.8s linear infinite',
        }} />
      </div>
    );
  }

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
              Welcome back
            </h1>
            <p style={{ color: '#6b7280', margin: 0, fontSize: 15 }}>
              Log in to keep your sparks going.
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

            <div style={{ marginBottom: 18, position: 'relative' }}>
              <Lock
                size={18}
                color="#9ca3af"
                style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                style={inputStyle}
                onFocus={(e) => { e.target.style.borderColor = '#8b5cf6'; }}
                onBlur={(e) => { e.target.style.borderColor = '#e9d5ff'; }}
              />
            </div>

            {error && (
              <p style={{ color: '#dc2626', fontSize: 13, marginBottom: 12, textAlign: 'center', lineHeight: 1.5 }}>
                {error}
              </p>
            )}
            {resendMsg && (
              <p style={{ color: '#059669', fontSize: 13, marginBottom: 12, textAlign: 'center', lineHeight: 1.5 }}>
                {resendMsg}
              </p>
            )}

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
              {submitting ? 'Signing in…' : (
                <>Log in <ArrowRight size={18} /></>
              )}
            </motion.button>
          </form>

          <p style={{ textAlign: 'center', fontSize: 13, color: '#6b7280', margin: '0 0 16px' }}>
            <button
              type="button"
              onClick={handleResendConfirmation}
              disabled={resending}
              style={{
                background: 'none',
                border: 'none',
                color: '#7c3aed',
                fontWeight: 700,
                cursor: resending ? 'wait' : 'pointer',
                fontFamily: 'inherit',
                fontSize: 13,
                textDecoration: 'underline',
                padding: 0,
              }}
            >
              {resending ? 'Sending…' : 'Resend confirmation email'}
            </button>
            {' · '}
            Use the same email you signed up with.
          </p>

          <p style={{ textAlign: 'center', fontSize: 14, color: '#6b7280', margin: '0 0 8px' }}>
            New here?{' '}
            <Link
              to="/signup"
              style={{ color: '#7c3aed', fontWeight: 700, textDecoration: 'none' }}
            >
              Create an account
            </Link>
          </p>

          <FooterLegalLinks marginTop={0} />
        </motion.div>
      </div>
    </div>
  );
}
