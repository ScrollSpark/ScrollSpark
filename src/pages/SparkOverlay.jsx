import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Volume2, VolumeX, RefreshCw } from 'lucide-react';
import { buildSpeechText } from '@/lib/sparkSpeech';
import { fetchSparkTtsAudio, pickRandomSparkVoice } from '@/lib/sparkTts';
import { sparkPrimaryCtaLabel } from '@/lib/sparkCta';

export default function SparkOverlay({ show, sparkData, onDismiss, onRegenerate, onLetsGoHobby }) {
  const [muted, setMuted] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const audioRef = useRef(null);
  const objectUrlRef = useRef(null);

  const displayImageUrl = useMemo(() => {
    const u = sparkData?.imageUrl;
    return typeof u === 'string' && u.length > 0 ? u : '';
  }, [sparkData?.imageUrl]);

  useEffect(() => {
    setImageFailed(false);
  }, [displayImageUrl]);

  function releaseAudioResources() {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
      audio.onended = null;
      audio.onerror = null;
      audioRef.current = null;
    }
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }

  function stopSpeaking() {
    releaseAudioResources();
  }

  useEffect(() => {
    if (!show || muted) {
      stopSpeaking();
      return undefined;
    }
    const text = buildSpeechText(sparkData);
    if (!text || typeof window === 'undefined') return undefined;

    let cancelled = false;
    const ac = new AbortController();
    const prefetched = sparkData?.ttsBlob instanceof Blob ? sparkData.ttsBlob : null;

    (async () => {
      try {
        releaseAudioResources();
        let blob = prefetched;
        if (!blob) {
          const voiceId = pickRandomSparkVoice();
          blob = await fetchSparkTtsAudio(text, ac.signal, voiceId);
        }
        if (cancelled || !blob) return;

        const url = URL.createObjectURL(blob);
        objectUrlRef.current = url;

        const audio = new Audio(url);
        audioRef.current = audio;

        audio.onended = () => {
          releaseAudioResources();
        };
        audio.onerror = () => {
          releaseAudioResources();
        };

        try {
          await audio.play();
        } catch {
          releaseAudioResources();
        }
      } catch (e) {
        if (cancelled || (e instanceof DOMException && e.name === 'AbortError')) return;
        console.error('Grok TTS failed:', e);
        releaseAudioResources();
      }
    })();

    return () => {
      cancelled = true;
      ac.abort();
      releaseAudioResources();
    };
  }, [show, muted, sparkData?.message, sparkData?.hobby, sparkData?.ttsBlob]);

  function handleDismiss() {
    stopSpeaking();
    onDismiss?.();
  }

  function handleRegenerate() {
    stopSpeaking();
    onRegenerate?.();
  }

  function handleLetsGoHobby() {
    stopSpeaking();
    onLetsGoHobby?.();
  }

  function toggleMute() {
    setMuted((m) => !m);
  }

  const hobbyEmoji = (hobby = '') => {
    const map = {
      guitar: '🎸', painting: '🎨', reading: '📚', running: '🏃', yoga: '🧘',
      photography: '📷', cooking: '🍳', gardening: '🌱', writing: '✍️', gaming: '🎮',
      swimming: '🏊', cycling: '🚴', puzzles: '🧩', dancing: '💃', acting: '🎭',
      weightlifting: '🏋️', singing: '🎵', knitting: '🧶', hiking: '🏕️', 'board games': '🎲',
    };
    const key = hobby.toLowerCase().replace(/^[^\w]+/, '').trim();
    return map[key] || '⚡';
  };

  const hobbyLabel = sparkData?.hobby ? String(sparkData.hobby) : 'your hobby';

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'linear-gradient(160deg, #4c1d95 0%, #831843 50%, #7c2d12 100%)',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            padding: 24, overflowY: 'auto',
          }}
        >
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Close and continue doomscrolling"
            style={{
              position: 'absolute', top: 20, right: 20,
              background: 'rgba(255,255,255,0.15)', border: 'none',
              borderRadius: 999,
              padding: '10px 14px 10px 16px',
              display: 'flex', alignItems: 'center', gap: 10,
              cursor: 'pointer', color: 'white',
              fontWeight: 700, fontSize: 13,
              fontFamily: 'inherit',
              maxWidth: 'calc(100% - 40px)',
            }}
          >
            <span style={{ whiteSpace: 'nowrap', letterSpacing: '0.02em' }}>Continue Doomscrolling</span>
            <X size={20} aria-hidden />
          </button>

          <button
            type="button"
            onClick={toggleMute}
            style={{
              position: 'absolute', top: 20, left: 20,
              background: 'rgba(255,255,255,0.15)', border: 'none',
              borderRadius: '50%', width: 40, height: 40,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: 'white',
            }}
          >
            {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>

          {['✨', '⚡', '🌟', '💫', '🎯'].map((e, i) => (
            <motion.div
              key={i}
              style={{
                position: 'absolute', fontSize: 28, opacity: 0.15,
                left: `${10 + i * 18}%`, top: `${10 + (i % 3) * 25}%`,
                pointerEvents: 'none',
              }}
              animate={{ y: [0, -12, 0] }}
              transition={{ duration: 2.5 + i * 0.4, repeat: Infinity, ease: 'easeInOut' }}
            >
              {e}
            </motion.div>
          ))}

          <div style={{ maxWidth: 480, width: '100%', textAlign: 'center' }}>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              style={{ fontSize: 28, fontWeight: 900, color: 'white', margin: '0 0 8px', lineHeight: 1.2 }}
            >
              {sparkData?.title || 'Time to Spark! ⚡'}
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              style={{ fontSize: 15, color: 'rgba(255,255,255,0.75)', margin: '0 0 20px' }}
            >
              {sparkData?.subtitle}
            </motion.p>

            {displayImageUrl && !imageFailed ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                style={{
                  marginBottom: 28,
                  borderRadius: 22,
                  overflow: 'hidden',
                  border: '2px solid rgba(255,255,255,0.28)',
                  boxShadow: '0 16px 48px rgba(0,0,0,0.4)',
                  aspectRatio: '16 / 9',
                  background: 'rgba(0,0,0,0.2)',
                }}
              >
                <img
                  src={displayImageUrl}
                  alt={`Warm illustration inspired by ${hobbyLabel}`}
                  style={{
                    display: 'block',
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                  onError={() => setImageFailed(true)}
                />
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3, type: 'spring' }}
                style={{
                  marginBottom: 28,
                  borderRadius: 22,
                  border: '2px solid rgba(255,255,255,0.2)',
                  background: 'rgba(255,255,255,0.08)',
                  aspectRatio: '16 / 9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 88,
                }}
                aria-hidden
              >
                {hobbyEmoji(sparkData?.hobby)}
              </motion.div>
            )}

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
              style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
            >
              <motion.button
                type="button"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleLetsGoHobby}
                style={{
                  width: '100%', padding: '18px 0', borderRadius: 18, border: 'none',
                  background: 'white', color: '#4c1d95',
                  fontWeight: 900, fontSize: 18, cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {sparkPrimaryCtaLabel(sparkData?.hobby)} 🚀
              </motion.button>

              <motion.button
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleRegenerate}
                style={{
                  width: '100%', padding: '14px 0', borderRadius: 18,
                  border: '1.5px solid rgba(255,255,255,0.35)',
                  background: 'transparent', color: 'rgba(255,255,255,0.85)',
                  fontWeight: 600, fontSize: 15, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  fontFamily: 'inherit',
                }}
              >
                <RefreshCw size={16} /> Give me another spark
              </motion.button>
            </motion.div>

          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
