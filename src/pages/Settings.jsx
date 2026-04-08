import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, LogOut, Pencil, Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { fetchUserProfile, normalizeHobbies } from '@/lib/userProfile';

function FloatingEmojis() {
  const emojis = ['⚙️', '✨', '⚡', '🎯'];
  return (
    <div style={{ pointerEvents: 'none', position: 'fixed', inset: 0, overflow: 'hidden', zIndex: 0 }}>
      {emojis.map((emoji, i) => (
        <motion.div
          key={i}
          style={{ position: 'absolute', fontSize: 22, opacity: 0.12, left: `${(i * 22) % 85}%` }}
          initial={{ y: '110vh' }}
          animate={{ y: '-10vh' }}
          transition={{ duration: 11 + i, repeat: Infinity, delay: i * 1.1, ease: 'linear' }}
        >
          {emoji}
        </motion.div>
      ))}
    </div>
  );
}

export default function Settings() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [loggingOut, setLoggingOut] = useState(false);

  const { data: profile, isLoading } = useQuery({
    queryKey: ['userProfile'],
    queryFn: fetchUserProfile,
  });

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await supabase.auth.signOut();
      queryClient.removeQueries({ queryKey: ['userProfile'] });
      navigate('/login', { replace: true });
    } catch (e) {
      console.error(e);
    } finally {
      setLoggingOut(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{
          width: 40, height: 40, borderRadius: '50%',
          border: '4px solid #e9d5ff', borderTopColor: '#8b5cf6',
          animation: 'spin 0.8s linear infinite',
        }} />
      </div>
    );
  }

  if (profile?._guest) {
    navigate('/signup', { replace: true });
    return null;
  }

  const hobbies = normalizeHobbies(profile?.hobbies);
  const displayName = profile?.name || profile?.full_name || profile?.display_name || 'You';

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #faf5ff 0%, #fdf2f8 50%, #fff7ed 100%)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <FloatingEmojis />

      <div style={{ position: 'relative', zIndex: 10, maxWidth: 440, margin: '0 auto', padding: '24px 16px' }}>
        <Link
          to="/"
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
          <ArrowLeft size={18} /> Back to dashboard
        </Link>

        <h1 style={{ fontSize: 28, fontWeight: 900, margin: '0 0 8px', color: '#111827' }}>Settings</h1>
        <p style={{ color: '#6b7280', margin: '0 0 28px', fontSize: 15 }}>
          Your account and profile
        </p>

        <div style={{
          background: 'white',
          borderRadius: 20,
          padding: 22,
          boxShadow: '0 4px 24px rgba(0,0,0,0.07)',
          marginBottom: 16,
        }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#9ca3af', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Name
          </p>
          <p style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: '0 0 16px' }}>{displayName}</p>

          <p style={{ fontSize: 12, fontWeight: 700, color: '#9ca3af', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Hobbies ({hobbies.length})
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {hobbies.length ? hobbies.map((h) => (
              <span
                key={h}
                style={{
                  padding: '6px 12px',
                  borderRadius: 999,
                  background: '#f3e8ff',
                  color: '#6b21a8',
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                {h}
              </span>
            )) : (
              <span style={{ color: '#9ca3af', fontSize: 14 }}>No hobbies yet</span>
            )}
          </div>
        </div>

        <motion.button
          type="button"
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate('/settings/personalization')}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            width: '100%',
            padding: '16px 0',
            borderRadius: 16,
            border: '2px solid #ddd6fe',
            background: '#faf5ff',
            color: '#5b21b6',
            fontWeight: 800,
            fontSize: 16,
            cursor: 'pointer',
            fontFamily: 'inherit',
            marginBottom: 12,
          }}
        >
          <Sparkles size={18} /> Spark images &amp; prompts
        </motion.button>

        <motion.button
          type="button"
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate('/onboarding?from=settings')}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            width: '100%',
            padding: '16px 0',
            borderRadius: 16,
            border: 'none',
            background: 'linear-gradient(90deg, #8b5cf6, #ec4899)',
            color: 'white',
            fontWeight: 800,
            fontSize: 16,
            cursor: 'pointer',
            fontFamily: 'inherit',
            marginBottom: 12,
          }}
        >
          <Pencil size={18} /> Edit name &amp; hobbies
        </motion.button>

        <p style={{ textAlign: 'center', fontSize: 13, color: '#6b7280', margin: '0 0 8px', lineHeight: 1.6 }}>
          <Link to="/terms" style={{ color: '#7c3aed', fontWeight: 600, textDecoration: 'none' }}>
            Terms of Use
          </Link>
          {' · '}
          <Link to="/privacy" style={{ color: '#7c3aed', fontWeight: 600, textDecoration: 'none' }}>
            Privacy Policy
          </Link>
          {' · '}
          <Link to="/support" style={{ color: '#7c3aed', fontWeight: 600, textDecoration: 'none' }}>
            Support
          </Link>
        </p>

        <p style={{ textAlign: 'center', fontSize: 13, margin: '0 0 16px' }}>
          <Link
            to="/support#account-deletion"
            style={{ color: '#b45309', fontWeight: 700, textDecoration: 'none' }}
          >
            Delete account
          </Link>
        </p>

        <motion.button
          type="button"
          whileTap={{ scale: loggingOut ? 1 : 0.98 }}
          disabled={loggingOut}
          onClick={handleLogout}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            width: '100%',
            padding: '16px 0',
            borderRadius: 16,
            border: '2px solid #fecaca',
            background: '#fef2f2',
            color: '#b91c1c',
            fontWeight: 800,
            fontSize: 16,
            cursor: loggingOut ? 'wait' : 'pointer',
            fontFamily: 'inherit',
            opacity: loggingOut ? 0.7 : 1,
          }}
        >
          <LogOut size={18} />
          {loggingOut ? 'Signing out…' : 'Log out'}
        </motion.button>
      </div>
    </div>
  );
}
