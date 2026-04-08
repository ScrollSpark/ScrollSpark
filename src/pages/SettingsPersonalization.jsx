import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save, Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { fetchUserProfile } from '@/lib/userProfile';
import {
  SPARK_GENDER_OPTIONS,
  SPARK_ETHNICITY_OPTIONS,
  SPARK_AGE_OPTIONS,
  COMMON_TIMEZONES,
  getLocalHourMinuteInTimezone,
} from '@/lib/sparkPersonalization';

const labelStyle = {
  display: 'block',
  fontSize: 12,
  fontWeight: 700,
  color: '#6b7280',
  marginBottom: 6,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
};

const inputStyle = {
  width: '100%',
  padding: '12px 14px',
  borderRadius: 12,
  border: '1px solid #e5e7eb',
  fontSize: 16,
  fontFamily: 'inherit',
  boxSizing: 'border-box',
};

export default function SettingsPersonalization() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: profile, isLoading } = useQuery({
    queryKey: ['userProfile'],
    queryFn: fetchUserProfile,
  });

  const [gender, setGender] = useState('');
  const [ethnicity, setEthnicity] = useState('');
  const [ethnicityCustom, setEthnicityCustom] = useState('');
  const [ageRange, setAgeRange] = useState('');
  const [sleepStart, setSleepStart] = useState('');
  const [sleepEnd, setSleepEnd] = useState('');
  const [timezone, setTimezone] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    if (!profile || profile._guest) return;
    setGender(profile.spark_gender || '');
    setEthnicity(profile.spark_ethnicity || '');
    setEthnicityCustom(profile.spark_ethnicity_custom || '');
    setAgeRange(profile.spark_age_range || '');
    setSleepStart(profile.spark_sleep_start || '');
    setSleepEnd(profile.spark_sleep_end || '');
    setTimezone(
      profile.spark_timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || ''
    );
  }, [profile]);

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            border: '4px solid #e9d5ff',
            borderTopColor: '#8b5cf6',
            animation: 'spin 0.8s linear infinite',
          }}
        />
      </div>
    );
  }

  if (profile?._guest) {
    navigate('/signup', { replace: true });
    return null;
  }

  const previewTime = timezone
    ? getLocalHourMinuteInTimezone(timezone)
    : { hour: 0, minute: 0 };
  const previewLabel = timezone
    ? `${String(previewTime.hour).padStart(2, '0')}:${String(previewTime.minute).padStart(2, '0')}`
    : '—';

  const handleSave = async () => {
    if (!profile?.id) return;
    setSaving(true);
    setSavedFlash(false);
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          spark_gender: gender || null,
          spark_ethnicity: ethnicity || null,
          spark_ethnicity_custom: ethnicity === 'other' ? ethnicityCustom.trim().slice(0, 120) || null : null,
          spark_age_range: ageRange || null,
          spark_sleep_start: sleepStart || null,
          spark_sleep_end: sleepEnd || null,
          spark_timezone: timezone.trim().slice(0, 80) || null,
        })
        .eq('id', profile.id);

      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ['userProfile'] });
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2500);
    } catch (e) {
      console.error(e);
      alert('Could not save. If columns are missing, run the latest Supabase migration.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #faf5ff 0%, #fdf2f8 50%, #fff7ed 100%)',
        padding: '24px 16px',
      }}
    >
      <div style={{ maxWidth: 480, margin: '0 auto' }}>
        <Link
          to="/settings"
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
          <ArrowLeft size={18} /> Back to settings
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <Sparkles size={28} color="#8b5cf6" />
          <h1 style={{ fontSize: 26, fontWeight: 900, margin: 0, color: '#111827' }}>
            Spark customization
          </h1>
        </div>
        <p style={{ color: '#6b7280', margin: '0 0 20px', fontSize: 15, lineHeight: 1.5 }}>
          Tune how sparks look and sound for <strong>you</strong>.
        </p>

        <div
          style={{
            background: 'linear-gradient(135deg, #eef2ff 0%, #faf5ff 100%)',
            border: '1px solid #c7d2fe',
            borderRadius: 16,
            padding: 16,
            marginBottom: 22,
          }}
        >
          <p style={{ margin: 0, fontSize: 14, color: '#3730a3', lineHeight: 1.55, fontWeight: 600 }}>
            This page is only to make <strong>images and spoken prompts</strong> feel more relevant — for
            example, matching a person you identify with in pictures, or avoiding “go for a run right
            now” when it’s the middle of the night where you are.
          </p>
          <p style={{ margin: '12px 0 0', fontSize: 13, color: '#4c1d95', lineHeight: 1.5 }}>
            ScrollSpark is <strong>not</strong> using this to collect data for ads, resale, or profiling.
            All fields are optional. You can clear them anytime.
          </p>
        </div>

        <div
          style={{
            background: 'white',
            borderRadius: 20,
            padding: 22,
            boxShadow: '0 4px 24px rgba(0,0,0,0.07)',
            marginBottom: 16,
          }}
        >
          <label style={labelStyle}>Gender (for imagery)</label>
          <select
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            style={{ ...inputStyle, marginBottom: 18, cursor: 'pointer' }}
          >
            {SPARK_GENDER_OPTIONS.map((o) => (
              <option key={o.value || 'none'} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>

          <label style={labelStyle}>Ethnicity / heritage (for imagery)</label>
          <select
            value={ethnicity}
            onChange={(e) => setEthnicity(e.target.value)}
            style={{ ...inputStyle, marginBottom: 10, cursor: 'pointer' }}
          >
            {SPARK_ETHNICITY_OPTIONS.map((o) => (
              <option key={o.value || 'none'} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          {ethnicity === 'other' && (
            <input
              type="text"
              value={ethnicityCustom}
              onChange={(e) => setEthnicityCustom(e.target.value)}
              placeholder="Describe however feels right to you"
              maxLength={120}
              style={{ ...inputStyle, marginBottom: 18 }}
            />
          )}

          <label style={labelStyle}>Age range (for imagery)</label>
          <select
            value={ageRange}
            onChange={(e) => setAgeRange(e.target.value)}
            style={{ ...inputStyle, marginBottom: 18, cursor: 'pointer' }}
          >
            {SPARK_AGE_OPTIONS.map((o) => (
              <option key={o.value || 'none'} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>

          <label style={labelStyle}>Usual sleep (local times)</label>
          <p style={{ fontSize: 13, color: '#9ca3af', margin: '0 0 10px' }}>
            Together with your time zone, this also nudges Spark Me toward calmer hobbies from your
            list in the evening or at night. Scroll Watch “Reactivate” push reminders are not sent
            while local time is inside this sleep window. Use the same clock as your time zone below.
          </p>
          <div style={{ display: 'flex', gap: 12, marginBottom: 18 }}>
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: 12, color: '#6b7280' }}>Fall asleep around</span>
              <input
                type="time"
                value={sleepStart}
                onChange={(e) => setSleepStart(e.target.value)}
                style={{ ...inputStyle, marginTop: 6 }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: 12, color: '#6b7280' }}>Wake around</span>
              <input
                type="time"
                value={sleepEnd}
                onChange={(e) => setSleepEnd(e.target.value)}
                style={{ ...inputStyle, marginTop: 6 }}
              />
            </div>
          </div>

          <label style={labelStyle}>Time zone</label>
          <p style={{ fontSize: 13, color: '#9ca3af', margin: '0 0 10px' }}>
            Used with sleep hours and “is it night?” for prompts. Detected:{' '}
            <strong>{Intl.DateTimeFormat().resolvedOptions().timeZone}</strong>
          </p>
          <select
            value={COMMON_TIMEZONES.includes(timezone) ? timezone : '__custom__'}
            onChange={(e) => {
              if (e.target.value === '__custom__') return;
              setTimezone(e.target.value);
            }}
            style={{ ...inputStyle, marginBottom: 10, cursor: 'pointer' }}
          >
            <option value="__custom__">Custom (type below)</option>
            {COMMON_TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            placeholder="e.g. America/Chicago"
            style={inputStyle}
          />
          {timezone ? (
            <p style={{ fontSize: 12, color: '#8b5cf6', margin: '10px 0 0' }}>
              Preview local time in that zone: <strong>{previewLabel}</strong>
            </p>
          ) : null}
        </div>

        <motion.button
          type="button"
          whileTap={{ scale: saving ? 1 : 0.98 }}
          disabled={saving}
          onClick={handleSave}
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
            cursor: saving ? 'wait' : 'pointer',
            fontFamily: 'inherit',
            opacity: saving ? 0.85 : 1,
          }}
        >
          <Save size={18} /> {saving ? 'Saving…' : 'Save customization'}
        </motion.button>

        {savedFlash && (
          <p style={{ textAlign: 'center', color: '#059669', fontWeight: 700, marginTop: 14 }}>
            Saved.
          </p>
        )}
      </div>
    </div>
  );
}
