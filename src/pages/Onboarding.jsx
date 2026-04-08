import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, ArrowRight, Sparkles } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { normalizeHobbies } from '@/lib/userProfile';
import { useQueryClient } from '@tanstack/react-query';

const HOBBY_SUGGESTIONS = [
  '🎨 Painting', '🎸 Guitar', '📚 Reading', '🏃 Running', '🧘 Yoga',
  '📷 Photography', '🍳 Cooking', '🌱 Gardening', '✍️ Writing', '🎮 Gaming',
  '🏊 Swimming', '🚴 Cycling', '🧩 Puzzles', '💃 Dancing', '🎭 Acting',
  '🏋️ Weightlifting', '🎵 Singing', '🧶 Knitting', '🏕️ Hiking', '🎲 Board Games',
];

async function saveUserProfile(hobbies, name) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const displayName = (name && name.trim()) || 'You';

  const { data: existing } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('user_profiles')
      .update({
        hobbies,
        name: displayName,
        onboarding_complete: true,
      })
      .eq('id', existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('user_profiles')
      .insert({
        user_id: user.id,
        hobbies,
        name: displayName,
        onboarding_complete: true,
        current_streak: 0,
        longest_streak: 0,
        total_sparks: 0,
      });
    if (error) throw error;
  }
}

function FloatingEmojis() {
  const emojis = ['⚡', '🎨', '🎸', '📚', '🏃', '🌟', '🎯', '✨'];
  return (
    <div style={{ pointerEvents: 'none', position: 'fixed', inset: 0, overflow: 'hidden', zIndex: 0 }}>
      {emojis.map((emoji, i) => (
        <motion.div
          key={i}
          style={{ position: 'absolute', fontSize: 24, opacity: 0.2, left: `${(i * 13) % 90}%` }}
          initial={{ y: '110vh' }}
          animate={{ y: '-10vh' }}
          transition={{ duration: 9 + i * 1.5, repeat: Infinity, delay: i * 1.3, ease: 'linear' }}
        >
          {emoji}
        </motion.div>
      ))}
    </div>
  );
}

export default function Onboarding() {
  const [searchParams] = useSearchParams();
  const fromSettings = searchParams.get('from') === 'settings';

  const [hobbies, setHobbies] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [userName, setUserName] = useState('You');
  const [step, setStep] = useState(() => (fromSettings ? 1 : 0));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!cancelled && !user) navigate('/signup', { replace: true });
    })();
    return () => { cancelled = true; };
  }, [navigate]);

  useEffect(() => {
    if (!fromSettings) return;
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const { data } = await supabase
        .from('user_profiles')
        .select('hobbies, name')
        .eq('user_id', user.id)
        .maybeSingle();
      if (cancelled || !data) return;
      setHobbies(normalizeHobbies(data.hobbies));
      if (data.name) setUserName(data.name);
    })();
    return () => { cancelled = true; };
  }, [fromSettings]);

  const addHobby = (hobby) => {
    const clean = hobby.trim();
    if (clean && !hobbies.includes(clean) && hobbies.length < 10) {
      setHobbies([...hobbies, clean]);
      setInputValue('');
    }
  };

  const removeHobby = (hobby) => {
    setHobbies(hobbies.filter((h) => h !== hobby));
  };

  const handleSubmit = async () => {
    if (hobbies.length < 5) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await saveUserProfile(hobbies, userName);
      await queryClient.refetchQueries({ queryKey: ['userProfile'] });
      navigate(fromSettings ? '/settings' : '/', { replace: true });
    } catch (err) {
      console.error('Failed to save profile:', err);
      setError('Something went wrong saving your profile. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #7c3aed 0%, #ec4899 50%, #f97316 100%)',
      position: 'relative', overflow: 'hidden',
    }}>
      <FloatingEmojis />

      <div style={{
        position: 'relative', zIndex: 10,
        minHeight: '100vh', display: 'flex',
        alignItems: 'center', justifyContent: 'center', padding: 16,
      }}>
        <AnimatePresence mode="wait">
          {step === 0 && !fromSettings && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              style={{ textAlign: 'center', color: 'white', maxWidth: 480 }}
            >
              <motion.div
                style={{ fontSize: 72, marginBottom: 24 }}
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ repeat: Infinity, duration: 2 }}
              >
                ⚡
              </motion.div>
              <h1 style={{ fontSize: 36, fontWeight: 900, margin: '0 0 16px' }}>
                Welcome to ScrollSpark!
              </h1>
              <p style={{ fontSize: 18, opacity: 0.9, margin: '0 0 8px', lineHeight: 1.5 }}>
                Your friendly nudge to stop doomscrolling and start doing amazing things ✨
              </p>
              <p style={{ fontSize: 16, opacity: 0.75, margin: '0 0 32px', lineHeight: 1.5 }}>
                No judgment here — just good vibes and gentle reminders to chase your passions! 🎯
              </p>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setStep(1)}
                style={{
                  background: 'white', color: '#7c3aed',
                  border: 'none', borderRadius: 16,
                  padding: '16px 32px', fontSize: 18, fontWeight: 700,
                  cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8,
                  boxShadow: '0 8px 30px rgba(0,0,0,0.2)',
                }}
              >
                Let's Get Sparking! <ArrowRight size={20} />
              </motion.button>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div
              key="hobbies"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              style={{
                width: '100%', maxWidth: 520,
                background: 'rgba(255,255,255,0.97)',
                borderRadius: 28, padding: 32,
                boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
              }}
            >
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                {fromSettings && (
                  <button
                    type="button"
                    onClick={() => navigate('/settings')}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      marginBottom: 16,
                      background: 'none',
                      border: 'none',
                      color: '#7c3aed',
                      fontWeight: 700,
                      fontSize: 14,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                    }}
                  >
                    ← Back to settings
                  </button>
                )}
                <span style={{ fontSize: 40 }}>🎨</span>
                <h2 style={{ fontSize: 24, fontWeight: 900, margin: '8px 0 4px', color: '#111827' }}>
                  {fromSettings ? 'Update your name & hobbies' : 'What do you love doing?'}
                </h2>
                <p style={{ color: '#6b7280', margin: 0 }}>
                  Pick 5-10 hobbies or interests ({hobbies.length}/10)
                </p>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label
                  htmlFor="onboarding-name"
                  style={{
                    display: 'block',
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#374151',
                    marginBottom: 8,
                  }}
                >
                  What should we call you?
                </label>
                <input
                  id="onboarding-name"
                  type="text"
                  autoComplete="name"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="You"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 12,
                    border: '2px solid #e9d5ff',
                    fontSize: 15,
                    outline: 'none',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#8b5cf6'}
                  onBlur={(e) => e.target.style.borderColor = '#e9d5ff'}
                />
                <p style={{ fontSize: 12, color: '#9ca3af', margin: '6px 0 0' }}>
                  We use this in your personalized sparks. Default is &quot;You&quot; — change it anytime.
                </p>
              </div>

              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addHobby(inputValue)}
                  placeholder="Type a hobby..."
                  style={{
                    flex: 1, padding: '10px 14px', borderRadius: 12,
                    border: '2px solid #e9d5ff', fontSize: 15, outline: 'none',
                    fontFamily: 'inherit',
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#8b5cf6'}
                  onBlur={(e) => e.target.style.borderColor = '#e9d5ff'}
                />
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => addHobby(inputValue)}
                  disabled={!inputValue.trim() || hobbies.length >= 10}
                  style={{
                    width: 44, height: 44, borderRadius: 12, border: 'none',
                    background: '#8b5cf6', color: 'white', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    opacity: (!inputValue.trim() || hobbies.length >= 10) ? 0.4 : 1,
                  }}
                >
                  <Plus size={20} />
                </motion.button>
              </div>

              <AnimatePresence>
                {hobbies.length > 0 && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}
                  >
                    {hobbies.map((hobby) => (
                      <motion.button
                        key={hobby}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        layout
                        onClick={() => removeHobby(hobby)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 4,
                          background: 'linear-gradient(90deg, #8b5cf6, #ec4899)',
                          color: 'white', border: 'none', borderRadius: 999,
                          padding: '6px 14px', fontSize: 13, fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        {hobby} <X size={12} />
                      </motion.button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              <div style={{ marginBottom: 24 }}>
                <p style={{ fontSize: 13, color: '#6b7280', fontWeight: 600, marginBottom: 8 }}>
                  ✨ Quick picks:
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {HOBBY_SUGGESTIONS.filter((s) => !hobbies.includes(s)).slice(0, 12).map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => addHobby(suggestion)}
                      disabled={hobbies.length >= 10}
                      style={{
                        padding: '5px 12px', fontSize: 12, fontWeight: 500,
                        borderRadius: 999, border: '2px solid #e9d5ff',
                        color: '#7c3aed', background: 'white', cursor: 'pointer',
                        opacity: hobbies.length >= 10 ? 0.4 : 1,
                        fontFamily: 'inherit',
                      }}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <p style={{ color: '#ef4444', fontSize: 13, marginBottom: 12, textAlign: 'center' }}>
                  {error}
                </p>
              )}

              <motion.button
                whileHover={{ scale: hobbies.length >= 5 ? 1.02 : 1 }}
                whileTap={{ scale: hobbies.length >= 5 ? 0.98 : 1 }}
                onClick={handleSubmit}
                disabled={hobbies.length < 5 || isSubmitting}
                style={{
                  width: '100%', padding: '18px 0', borderRadius: 16, border: 'none',
                  background: 'linear-gradient(90deg, #8b5cf6, #ec4899, #f97316)',
                  color: 'white', fontWeight: 700, fontSize: 17,
                  cursor: hobbies.length < 5 || isSubmitting ? 'not-allowed' : 'pointer',
                  opacity: hobbies.length < 5 || isSubmitting ? 0.5 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  fontFamily: 'inherit',
                }}
              >
                {isSubmitting ? (
                  <>
                    <div style={{
                      width: 20, height: 20, borderRadius: '50%',
                      border: '2px solid rgba(255,255,255,0.4)', borderTopColor: 'white',
                      animation: 'spin 0.8s linear infinite',
                    }} />
                    Saving...
                  </>
                ) : hobbies.length < 5 ? (
                  <>Add {5 - hobbies.length} more {5 - hobbies.length === 1 ? 'hobby' : 'hobbies'}</>
                ) : (
                  <><Sparkles size={20} /> I'm Ready to Spark! ⚡</>
                )}
              </motion.button>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
