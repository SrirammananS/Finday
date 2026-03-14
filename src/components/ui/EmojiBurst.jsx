import React, { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react';
import ReactDOM from 'react-dom';
import gsap from 'gsap';
import { EASES } from '../../utils/gsapAnimations';

const PARTICLE_COUNT = 16;
const TOTAL_DURATION = 5.2; // seconds – slow enough to see the full effect

const HAPTIC_PATTERNS = {
  income:  [60, 80, 60, 80, 100, 80, 100, 80, 140, 80, 180, 80, 200, 80, 300],
  expense: [200, 120, 250, 120, 300, 120, 350, 120, 400],
  cc:      [40, 40, 40, 60, 40, 40, 40, 60, 60, 60, 60, 60, 80, 60, 100, 60, 140, 60, 200, 60, 280],
};

function triggerHaptic(pattern) {
  try {
    if (window.AndroidBridge?.vibrate) {
      window.AndroidBridge.vibrate(pattern.join(','));
    } else if (navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  } catch (_) { /* ignore */ }
}

const GLOW_COLORS = {
  income:  { inner: 'rgba(0, 230, 118, 0.35)', outer: 'rgba(0, 230, 118, 0.08)' },
  expense: { inner: 'rgba(244, 63, 94, 0.32)', outer: 'rgba(244, 63, 94, 0.06)' },
  cc:      { inner: 'rgba(139, 92, 246, 0.35)', outer: 'rgba(139, 92, 246, 0.08)' },
  welcome: { inner: 'rgba(251, 191, 36, 0.4)', outer: 'rgba(251, 191, 36, 0.1)' },
};

const WELCOME_EMOJIS = ['👋', '🎉', '✨', '😊', '🙌', '🌟', '💫', '🎊', '🚀', '💛', '🤗', '⭐', '🌈', '💖', '🔥', '👍'];
const WELCOME_PARTICLE_COUNT = 20;

function getFullScreenSpread() {
  if (typeof window === 'undefined') return { w: 400, h: 400 };
  const w = Math.max(window.innerWidth, 400);
  const h = Math.max(window.innerHeight, 400);
  return { w: w * 0.55, h: h * 0.55 };
}

function generateParticles(emoji, type) {
  const { w, h } = getFullScreenSpread();
  return Array.from({ length: PARTICLE_COUNT }, (_, i) => {
    const useAlt = type === 'cc' && i >= PARTICLE_COUNT - 2;
    const angle = (Math.PI * 2 * i) / PARTICLE_COUNT + (Math.random() - 0.5) * 0.6;
    const radialSpread = Math.min(w, h) * (0.5 + Math.random() * 0.5);

    let targetX, targetY;
    if (type === 'income') {
      targetX = (Math.random() - 0.5) * w * 1.2;
      targetY = -(h * 0.4 + Math.random() * h * 0.5);
    } else if (type === 'cc') {
      targetX = Math.cos(angle) * radialSpread;
      targetY = Math.sin(angle) * radialSpread;
    } else {
      targetX = (Math.random() - 0.5) * w * 1.2;
      targetY = h * 0.2 + Math.random() * h * 0.5;
    }

    return {
      id: `${Date.now()}-${i}`,
      emoji: useAlt ? '💳' : emoji,
      x: targetX,
      y: targetY,
      delay: i * 0.06 + Math.random() * 0.05,
      size: 28 + Math.random() * 18,
      rotation: (Math.random() - 0.5) * 60,
    };
  });
}

function generateWelcomeParticles() {
  const { w, h } = getFullScreenSpread();
  const spread = Math.min(w, h) * 0.6;
  return Array.from({ length: WELCOME_PARTICLE_COUNT }, (_, i) => {
    const angle = (Math.PI * 2 * i) / WELCOME_PARTICLE_COUNT + (Math.random() - 0.5) * 0.8;
    const r = spread * (0.6 + Math.random() * 0.5);
    const targetX = Math.cos(angle) * r;
    const targetY = Math.sin(angle) * r;
    const emoji = WELCOME_EMOJIS[Math.floor(Math.random() * WELCOME_EMOJIS.length)];
    return {
      id: `welcome-${Date.now()}-${i}`,
      emoji,
      x: targetX,
      y: targetY,
      delay: i * 0.07 + Math.random() * 0.06,
      size: 36 + Math.random() * 24,
      rotation: (Math.random() - 0.5) * 80,
    };
  });
}

const prefersReducedMotion = () => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

function runBurstAnimation(containerEl, burst, colors) {
  if (!containerEl) return;
  const glowEl = containerEl.querySelector('[data-burst-glow]');
  const particlesEl = containerEl.querySelectorAll('[data-burst-particle]');

  const tl = gsap.timeline({ onComplete: () => {} });

  // Glow: slow fade in, hold, slow fade out
  if (glowEl) {
    tl.fromTo(glowEl, { opacity: 0 }, { opacity: 1, duration: 0.5, ease: 'power2.out' }, 0);
    tl.to(glowEl, { opacity: 0.85, duration: 0.3, ease: 'none' }, 0.5);
    tl.to(glowEl, { opacity: 0, duration: 1.4, ease: 'power2.in' }, 2.2);
  }

  // Particles: start at center, burst out with stagger and bouncy ease, then fade
  particlesEl.forEach((el, i) => {
    const p = burst.particles[i];
    if (!p) return;
    gsap.set(el, { x: 0, y: 0, scale: 0.2, opacity: 1, rotation: 0 });
    tl.to(el, {
      x: p.x,
      y: p.y,
      scale: 1.15,
      rotation: p.rotation,
      duration: 2.4,
      delay: p.delay,
      ease: EASES.bounceSubtle,
      overwrite: 'auto',
    }, 0);
    tl.to(el, {
      opacity: 0,
      scale: 0.9,
      duration: 0.9,
      ease: 'power2.in',
    }, 2.8 + p.delay);
  });
}

const EmojiBurst = () => {
  const [bursts, setBursts] = useState([]);
  const containerRefs = useRef({});
  const animatedIds = useRef(new Set());

  const handleTransactionSaved = useCallback((e) => {
    if (prefersReducedMotion()) return;

    const { type = 'expense', emoji = '💸' } = e.detail || {};
    const resolvedType = type === 'cc' ? 'cc' : type === 'income' ? 'income' : 'expense';

    triggerHaptic(HAPTIC_PATTERNS[resolvedType]);

    const id = `burst-${Date.now()}`;
    const particles = generateParticles(emoji, resolvedType);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setBursts((prev) => [...prev, { id, type: resolvedType, particles }]);
      });
    });

    const removeAt = (TOTAL_DURATION + 0.5) * 1000;
    setTimeout(() => {
      setBursts((prev) => prev.filter((b) => b.id !== id));
      animatedIds.current.delete(id);
      delete containerRefs.current[id];
    }, removeAt);
  }, []);

  const handleWelcomeBurst = useCallback(() => {
    if (prefersReducedMotion()) return;

    const id = `welcome-${Date.now()}`;
    const particles = generateWelcomeParticles();

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setBursts((prev) => [...prev, { id, type: 'welcome', particles }]);
      });
    });

    const removeAt = (TOTAL_DURATION + 0.5) * 1000;
    setTimeout(() => {
      setBursts((prev) => prev.filter((b) => b.id !== id));
      animatedIds.current.delete(id);
      delete containerRefs.current[id];
    }, removeAt);
  }, []);

  useLayoutEffect(() => {
    const rafIds = [];
    bursts.forEach((burst) => {
      if (animatedIds.current.has(burst.id)) return;
      const el = containerRefs.current[burst.id];
      if (!el) return;
      animatedIds.current.add(burst.id);
      const colors = GLOW_COLORS[burst.type];
      // Defer one frame so portal is painted and refs/layout are stable
      const rafId = requestAnimationFrame(() => {
        runBurstAnimation(el, burst, colors);
      });
      rafIds.push(rafId);
    });
    return () => rafIds.forEach((id) => cancelAnimationFrame(id));
  }, [bursts]);

  useEffect(() => {
    window.addEventListener('transaction-saved', handleTransactionSaved);
    window.addEventListener('welcome-burst', handleWelcomeBurst);
    return () => {
      window.removeEventListener('transaction-saved', handleTransactionSaved);
      window.removeEventListener('welcome-burst', handleWelcomeBurst);
    };
  }, [handleTransactionSaved, handleWelcomeBurst]);

  if (bursts.length === 0) return null;

  return ReactDOM.createPortal(
    <div
      className="fixed inset-0 z-[99999] pointer-events-none overflow-hidden w-full h-full min-h-screen min-w-full"
      style={{ willChange: 'transform', transform: 'translateZ(0)', isolation: 'isolate' }}
    >
      {bursts.map((burst) => {
        const colors = GLOW_COLORS[burst.type];
        const gradient = `radial-gradient(circle 150vmax at 50% 50%, ${colors.inner} 0%, ${colors.outer} 30%, transparent 55%)`;
        return (
          <div
            key={burst.id}
            ref={(el) => { if (el) containerRefs.current[burst.id] = el; }}
            className="absolute inset-0 w-full h-full min-h-screen min-w-full"
          >
            <div
              data-burst-glow
              className="absolute inset-0 w-full h-full min-h-screen min-w-full"
              style={{ background: gradient }}
            />
            {burst.particles.map((p) => (
              <span
                key={p.id}
                data-burst-particle
                className="absolute left-1/2 top-1/2 select-none -translate-x-1/2 -translate-y-1/2"
                style={{ fontSize: p.size, willChange: 'transform, opacity' }}
              >
                {p.emoji}
              </span>
            ))}
          </div>
        );
      })}
    </div>,
    document.body
  );
};

export default EmojiBurst;
