import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Play, Pause, Crown, Settings } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';

const TIMER_DURATION = 15 * 60;

// ---------------------------------------------------------------------------
// Supabase helpers
// ---------------------------------------------------------------------------

async function fetchUserProfile() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function updateUserProfile(profileId, updates) {
  const { data, error } = await supabase
    .from('user_profiles')
    .update(updates)
    .eq('id', profileId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function generateSparkFromEdgeFunction(hobby) {
  const { data, error } = await supabase.functions.invoke('generate-spark', {
    body: { hobby },
  });
  if (error) throw error;
  return data;
}

// ---------------------------------------------------------------------------
// Self-contained UI components (no external dependencies)
// ---------------------------------------------------------------------------

function FloatingEmojis() {
  const emojis = ['⚡', '🎨', '🎸', '📚', '🏃', '🌟', '🎯', '✨'];
  return (
    <div style={{ pointerEvents: 'none', position: 'fixed', inset: 0, overflow: 'hidden', zIndex: 0 }}>
      {emojis.map((emoji, i) => (
        <motion.div
          key={i}
          style={{ position: 'absolute', fontSize: 24, opacity: 0.15, left: `${(i * 13) % 90}%` }}
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

function StreakBadge({ streak }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
      color: 'white', padding: '12px 28px', borderRadius: 40,
      boxShadow: '0 4px 20px rgba(139,92,246,0.35)',
    }}>
      <span style={{ fontSize: 28 }}>🔥</span>
      <div>
        <p style={{ fontSize: 32, fontWeight: 900, lineHeight: 1, margin: 0 }}>{streak}</p>
        <p style={{ fontSize: 12, opacity: 0.9, margin: 0 }}>day streak</p>
      </div>
    </div>
  );
}

function TimerRing({ progress, timeLeft, isRunning }) {
  const radius = 58;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - progress * circumference;
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div style={{ position: 'relative', width: 144, height: 144 }}>
      <svg width="144" height="144" viewBox="0 0 144 144">
        <circle cx="72" cy="72" r={radius} fill="none" stroke="#e9d5ff" strokeWidth="9" />
        <circle
          cx="72" cy="72" r={radius} fill="none"
          stroke={isRunning ? '#8b5cf6' : '#c4b5fd'}
          strokeWidth="9" strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 72 72)"
          style={{ transition: 'stroke-dashoffset 1s linear' }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <p style={{ fontSize: 24, fontWeight: 900, margin: 0, color: '#1f2937' }}>
          {minutes}:{String(seconds).padStart(2, '0')}
        </p>
        <p style={{ fontSize: 11, color: '#6b7280', margin: 0 }}>minutes</p>
      </div>
    </div>
  );
}

function ConfettiExplosion({ trigger }) {
  if (!trigger) return null;
  const pieces = ['🎉', '⚡', '🌟', '🎊', '✨', '💫', '🎈'];
  return (
    <div style={{ pointerEvents: 'none', position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
      {pieces.map((e, i) => (
        <motion.div
          key={i}
          style={{ position: 'absolute', fontSize: 32 }}
          initial={{ scale: 0, x: 0, y: 0, opacity: 1 }}
          animate={{ scale: [0, 1.5, 0], x: (i - 3) * 90, y: -140, opacity: [1, 1, 0] }}
          transition={{ duration: 1.4, delay: i * 0.08 }}
        >
          {e}
        </motion.div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared styles
// ---------------------------------------------------------------------------

const iconBtnStyle = {
  width: 36, height: 36, borderRadius: '50%',
  border: '1px solid #e5e7eb', background: 'white',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  cursor: 'pointer',
};

const statCardStyle = {
  background: 'white', borderRadius: 16,
  boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
  padding: '14px 8px', textAlign: 'center',
};

const cardStyle = {
  background: 'white', borderRadius: 24,
  boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
  padding: 24, marginBottom: 16,
};

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export default function Dashboard() {
  const [timeLeft, setTimeLeft] = useState(TIMER_DURATION);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const timerRef = useRef(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['userProfile'],
    queryFn: fetchUserProfile,
  });

  useEffect(() => {
    if (profile && !profile.onboarding_complete) navigate('/onboarding');
  }, [profile, navigate]);

  useEffect(() => {
    if (!isLoading && !profile) navigate('/onboarding');
  }, [isLoading, profile, navigate]);

  useEffect(() => {
    if (profile?.current_streak > 0) {
      setShowConfetti(true);
      const t = setTimeout(() => setShowConfetti(false), 4000);
      return () => clearTimeout(t);
    }
  }, [profile?.current_streak]);

  useEffect(() => {
    if (isTimerRunning && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            setIsTimerRunning(false);
            handleGenerateSpark();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [isTimerRunning]);

  const toggleTimer = () => {
    if (isTimerRunning) {
      clearInterval(timerRef.current);
      setIsTimerRunning(false);
    } else {
      if (timeLeft === 0) setTimeLeft(TIMER_DURATION);
      setIsTimerRunning(true);
    }
  };

  const handleGenerateSpark = useCallback(async () => {
    if (!profile?.hobbies?.length) return;
    setIsGenerating(true);
    try {
      const randomHobby = profile.hobbies[Math.floor(Math.random() * profile.hobbies.length)];
      const result = await generateSparkFromEdgeFunction(randomHobby);

      const today = new Date().toISOString().split('T')[0];
      const lastDate = profile.last_spark_date;
      let newStreak = profile.current_streak || 0;

      if (lastDate !== today) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        newStreak = lastDate === yesterdayStr ? newStreak + 1 : 1;
      }

      const longestStreak = Math.max(newStreak, profile.longest_streak || 0);

      await updateUserProfile(profile.id, {
        last_spark_date: today,
        current_streak: newStreak,
        longest_streak: longestStreak,
        total_sparks: (profile.total_sparks || 0) + 1,
      });

      queryClient.invalidateQueries({ queryKey: ['userProfile'] });
      navigate('/spark', { state: { sparkData: { ...result, hobby: randomHobby }, streak: newStreak } });
      setTimeLeft(TIMER_DURATION);
    } catch (err) {
      console.error('Failed to generate spark:', err);
    } finally {
      setIsGenerating(false);
    }
  }, [profile, navigate, queryClient]);

  const progress = 1 - timeLeft / TIMER_DURATION;

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

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #faf5ff 0%, #fdf2f8 50%, #fff7ed 100%)',
      position: 'relative', overflow: 'hidden',
    }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <FloatingEmojis />
      <ConfettiExplosion trigger={showConfetti} />

      <div style={{ position: 'relative', zIndex: 10, maxWidth: 480, margin: '0 auto', padding: '24px 16px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0, color: '#111827' }}>⚡ ScrollSpark</h1>
            <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>Your spark of motivation</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Link to="/premium" style={{ textDecoration: 'none' }}>
              <button style={iconBtnStyle}><Crown size={18} color="#f59e0b" /></button>
            </Link>
            <Link to="/onboarding" style={{ textDecoration: 'none' }}>
              <button style={iconBtnStyle}><Settings size={18} color="#9ca3af" /></button>
            </Link>
          </div>
        </div>

        {/* Streak */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 32 }}>
          <StreakBadge streak={profile?.current_streak || 0} />
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 32 }}>
          {[
            { label: 'Total Sparks', value: profile?.total_sparks || 0, emoji: '⚡' },
            { label: 'Best Streak', value: profile?.longest_streak || 0, emoji: '🏆' },
            { label: 'Hobbies', value: profile?.hobbies?.length || 0, emoji: '🎨' },
          ].map((stat) => (
            <div key={stat.label} style={statCardStyle}>
              <span style={{ fontSize: 20 }}>{stat.emoji}</span>
              <p style={{ fontSize: 26, fontWeight: 900, margin: '4px 0 2px', color: '#111827' }}>{stat.value}</p>
              <p style={{ fontSize: 11, color: '#6b7280', margin: 0, fontWeight: 600 }}>{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Timer card */}
        <div style={cardStyle}>
          <h2 style={{ textAlign: 'center', fontSize: 16, fontWeight: 700, marginBottom: 16, color: '#111827' }}>
            📱 Scroll Watch Timer
          </h2>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <TimerRing progress={progress} timeLeft={timeLeft} isRunning={isTimerRunning} />
          </div>
          <p style={{ textAlign: 'center', fontSize: 13, color: '#6b7280', marginBottom: 16, lineHeight: 1.5 }}>
            {isTimerRunning
              ? "We're watching the clock for you! When time's up, we'll spark you into action 🎯"
              : "Start the timer when you begin scrolling. We'll nudge you in 15 minutes! 💛"}
          </p>
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={toggleTimer}
            style={{
              width: '100%', padding: '14px 0', borderRadius: 16, border: 'none',
              fontWeight: 700, fontSize: 16, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              background: isTimerRunning ? '#f3f4f6' : 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
              color: isTimerRunning ? '#374151' : 'white',
            }}
          >
            {isTimerRunning
              ? <><Pause size={18} /> Pause Scroll Watch</>
              : <><Play size={18} /> Start Scroll Watch</>}
          </motion.button>
        </div>

        {/* Spark Me */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleGenerateSpark}
          disabled={isGenerating}
          style={{
            width: '100%', padding: '28px 0', borderRadius: 24, border: 'none',
            background: 'linear-gradient(90deg, #8b5cf6, #ec4899, #f97316)',
            color: 'white', fontWeight: 900, fontSize: 20,
            cursor: isGenerating ? 'not-allowed' : 'pointer',
            opacity: isGenerating ? 0.75 : 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            boxShadow: '0 8px 30px rgba(139,92,246,0.4)',
          }}
        >
          {isGenerating ? (
            <>
              <div style={{
                width: 22, height: 22, borderRadius: '50%',
                border: '3px solid rgba(255,255,255,0.4)', borderTopColor: 'white',
                animation: 'spin 0.8s linear infinite',
              }} />
              Generating your spark...
            </>
          ) : (
            <><Sparkles size={22} /> Spark Me! ⚡</>
          )}
        </motion.button>

        <p style={{ textAlign: 'center', fontSize: 12, color: '#9ca3af', marginTop: 12 }}>
          Tap anytime for a burst of motivation about your hobbies! 🌟
        </p>
      </div>
    </div>
  );
}
