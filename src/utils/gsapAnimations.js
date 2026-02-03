/**
 * LAKSH GSAP Animation Utilities - Gen Z 2026 Edition
 * 
 * Advanced GSAP Features:
 * - Timeline sequencing with labels
 * - ScrollTrigger integration
 * - Stagger patterns (grid, wave, random)
 * - Magnetic hover effects
 * - Morphing transitions
 * - Performance optimization for mobile
 * - Reduced motion support
 * 
 * Gen Z 2026 Design Trends:
 * - Bold micro-interactions
 * - Playful bouncy physics
 * - Glassmorphism reveals
 * - Neon glow effects
 * - Liquid morphing
 * - Glitch aesthetics
 */

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Register GSAP plugins
if (typeof window !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger);
}

// GSAP global config
gsap.config({
    nullTargetWarn: false,
    trialWarn: false,
});

// ============================================
// GEN Z EASING CURVES - Bouncy, Playful, Snappy
// ============================================
export const EASES = {
    // Smooth & buttery (default for most)
    butter: 'power2.out',
    butterIn: 'power2.in',
    butterInOut: 'power2.inOut',

    // Bouncy Gen Z feel
    bounce: 'elastic.out(1, 0.5)',
    bounceSubtle: 'elastic.out(1, 0.75)',
    bounceMild: 'elastic.out(1, 0.85)',

    // Snappy interactions (perfect for buttons)
    snap: 'back.out(1.7)',
    snapIn: 'back.in(1.7)',
    snapMild: 'back.out(1.2)',

    // Smooth scroll
    smooth: 'power4.inOut',
    smoothOut: 'power4.out',

    // Quick micro-interactions
    micro: 'power3.out',
    microIn: 'power3.in',

    // Dramatic reveals
    dramatic: 'expo.out',
    dramaticIn: 'expo.in',

    // Spring physics
    spring: 'elastic.out(0.5, 0.3)',
    springTight: 'elastic.out(0.8, 0.5)',

    // Linear (for infinite loops)
    linear: 'none',
};

// ============================================
// CORE ANIMATIONS (Enhanced)
// ============================================
export const animations = {
    // Jelly effect - satisfying squish for interactions
    jelly: (element, options = {}) => {
        const { scale = 1.05, duration = 0.4 } = options;
        return gsap.timeline()
            .to(element, {
                scale: scale * 1.12,
                duration: duration * 0.25,
                ease: EASES.microIn
            })
            .to(element, {
                scale: scale * 0.92,
                duration: duration * 0.2,
                ease: EASES.butterInOut
            })
            .to(element, {
                scale: 1,
                duration: duration * 0.55,
                ease: EASES.bounceSubtle
            });
    },

    // Enhanced fade in with slide
    fadeInUp: (element, options = {}) => {
        const { duration = 0.7, delay = 0, y = 30, rotation = 0 } = options;
        return gsap.fromTo(element,
            { opacity: 0, y, rotation },
            { opacity: 1, y: 0, rotation: 0, duration, delay, ease: EASES.butter }
        );
    },

    // Fade in from different directions
    fadeInDown: (element, options = {}) => {
        const { duration = 0.7, delay = 0, y = -30 } = options;
        return gsap.fromTo(element,
            { opacity: 0, y },
            { opacity: 1, y: 0, duration, delay, ease: EASES.butter }
        );
    },

    fadeInLeft: (element, options = {}) => {
        const { duration = 0.7, delay = 0, x = -40 } = options;
        return gsap.fromTo(element,
            { opacity: 0, x },
            { opacity: 1, x: 0, duration, delay, ease: EASES.butter }
        );
    },

    fadeInRight: (element, options = {}) => {
        const { duration = 0.7, delay = 0, x = 40 } = options;
        return gsap.fromTo(element,
            { opacity: 0, x },
            { opacity: 1, x: 0, duration, delay, ease: EASES.butter }
        );
    },

    // Scale reveal with bounce
    scaleIn: (element, options = {}) => {
        const { duration = 0.6, delay = 0, scale = 0.85 } = options;
        return gsap.fromTo(element,
            { opacity: 0, scale },
            { opacity: 1, scale: 1, duration, delay, ease: EASES.snap }
        );
    },

    // Stagger animation for lists (enhanced)
    staggerIn: (elements, options = {}) => {
        const { duration = 0.5, stagger = 0.08, y = 20, from = 'start' } = options;
        return gsap.fromTo(elements,
            { opacity: 0, y },
            {
                opacity: 1,
                y: 0,
                duration,
                stagger: { each: stagger, from },
                ease: EASES.butter
            }
        );
    },

    // Grid stagger pattern
    gridStagger: (elements, options = {}) => {
        const { columns = 2, duration = 0.6, staggerAmount = 0.4 } = options;
        const rows = Math.ceil(elements.length / columns);
        return gsap.from(elements, {
            opacity: 0,
            scale: 0.9,
            y: 25,
            duration,
            ease: EASES.butter,
            stagger: {
                amount: staggerAmount,
                grid: [rows, columns],
                from: 'start',
            },
        });
    },

    // Wave stagger pattern
    waveStagger: (elements, options = {}) => {
        const { duration = 0.7, stagger = 0.06 } = options;
        return gsap.from(elements, {
            y: 35,
            opacity: 0,
            rotation: 3,
            duration,
            ease: EASES.butter,
            stagger: {
                each: stagger,
                from: 'random',
            },
        });
    },

    // Pulse effect for notifications/badges
    pulse: (element, options = {}) => {
        const { scale = 1.15, duration = 0.8 } = options;
        return gsap.to(element, {
            scale,
            duration: duration / 2,
            ease: EASES.butterInOut,
            yoyo: true,
            repeat: 1
        });
    },

    // Heartbeat pulse
    heartbeat: (element, options = {}) => {
        const { duration = 0.8 } = options;
        return gsap.timeline({ repeat: -1, repeatDelay: 1 })
            .to(element, { scale: 1.2, duration: duration * 0.15, ease: EASES.micro })
            .to(element, { scale: 1, duration: duration * 0.15, ease: EASES.butter })
            .to(element, { scale: 1.15, duration: duration * 0.15, ease: EASES.micro })
            .to(element, { scale: 1, duration: duration * 0.55, ease: EASES.bounceSubtle });
    },

    // Card hover lift effect (enhanced)
    cardLift: (element, isHovering = true) => {
        return gsap.to(element, {
            y: isHovering ? -6 : 0,
            scale: isHovering ? 1.02 : 1,
            boxShadow: isHovering
                ? '0 25px 50px rgba(0,0,0,0.4)'
                : '0 4px 12px rgba(0,0,0,0.15)',
            duration: 0.35,
            ease: isHovering ? EASES.snapMild : EASES.butter
        });
    },

    // Page transitions
    pageSlideIn: (element) => {
        return gsap.fromTo(element,
            { x: 60, opacity: 0 },
            { x: 0, opacity: 1, duration: 0.6, ease: EASES.butter }
        );
    },

    pageSlideOut: (element) => {
        return gsap.to(element,
            { x: -60, opacity: 0, duration: 0.4, ease: EASES.microIn }
        );
    },

    // Counter animation for numbers (enhanced)
    countUp: (element, endValue, options = {}) => {
        const { duration = 2, startValue = 0, prefix = '', suffix = '', decimals = 0 } = options;
        const obj = { value: startValue };
        return gsap.to(obj, {
            value: endValue,
            duration,
            ease: EASES.butter,
            onUpdate: () => {
                element.textContent = prefix + obj.value.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',') + suffix;
            }
        });
    },

    // Currency flip animation
    currencyFlip: (element, newValue, options = {}) => {
        const { duration = 0.5, prefix = '₹' } = options;
        const tl = gsap.timeline();

        tl.to(element, {
            y: -25,
            opacity: 0,
            duration: duration * 0.4,
            ease: EASES.micro,
            onComplete: () => {
                element.textContent = prefix + Math.abs(newValue).toLocaleString('en-IN');
            }
        }).fromTo(element,
            { y: 25, opacity: 0 },
            { y: 0, opacity: 1, duration: duration * 0.6, ease: EASES.bounceSubtle }
        );

        return tl;
    },

    // Shimmer loading effect
    shimmer: (element) => {
        return gsap.to(element, {
            backgroundPosition: '200% 0',
            duration: 1.5,
            ease: EASES.linear,
            repeat: -1
        });
    },

    // Toggle switch animation
    toggleSwitch: (knob, isOn) => {
        return gsap.to(knob, {
            x: isOn ? '100%' : '0%',
            duration: 0.3,
            ease: EASES.snap
        });
    },

    // Ripple effect (enhanced)
    ripple: (container, event, options = {}) => {
        const { color = 'rgba(204, 255, 0, 0.35)' } = options;
        const rect = container.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        const size = Math.max(rect.width, rect.height);

        const ripple = document.createElement('span');
        ripple.style.cssText = `
            position: absolute;
            width: ${size}px;
            height: ${size}px;
            background: radial-gradient(circle, ${color} 0%, transparent 70%);
            border-radius: 50%;
            pointer-events: none;
            left: ${x - size / 2}px;
            top: ${y - size / 2}px;
            transform: scale(0);
        `;

        container.style.position = 'relative';
        container.style.overflow = 'hidden';
        container.appendChild(ripple);

        const tl = gsap.timeline({
            onComplete: () => ripple.remove()
        });

        tl.to(ripple, {
            scale: 2.5,
            opacity: 0,
            duration: 0.7,
            ease: EASES.butter
        });

        return tl;
    },

    // Spin animation
    spin: (element, options = {}) => {
        const { duration = 1, direction = 1 } = options;
        return gsap.to(element, {
            rotation: 360 * direction,
            duration,
            ease: EASES.linear,
            repeat: -1
        });
    },

    // Kill all animations
    kill: (element) => {
        gsap.killTweensOf(element);
    }
};

// ============================================
// GEN Z SPECIAL EFFECTS (2026 Trends)
// ============================================
export const genZEffects = {
    // Glitch text effect
    glitch: (element, options = {}) => {
        const { duration = 0.6, intensity = 5 } = options;
        const tl = gsap.timeline({ repeat: 2 });

        for (let i = 0; i < 8; i++) {
            tl.to(element, {
                x: gsap.utils.random(-intensity, intensity),
                y: gsap.utils.random(-intensity / 2, intensity / 2),
                skewX: gsap.utils.random(-3, 3),
                filter: `hue-rotate(${gsap.utils.random(-20, 20)}deg)`,
                duration: duration / 16,
                ease: 'none',
            });
        }

        tl.to(element, { x: 0, y: 0, skewX: 0, filter: 'none', duration: 0.15, ease: EASES.butter });
        return tl;
    },

    // Neon pulse glow
    neonPulse: (element, options = {}) => {
        const { color = '#CCFF00', duration = 1.8, intensity = 15 } = options;
        return gsap.to(element, {
            textShadow: `0 0 ${intensity}px ${color}, 0 0 ${intensity * 2}px ${color}, 0 0 ${intensity * 3}px ${color}`,
            duration,
            ease: 'sine.inOut',
            repeat: -1,
            yoyo: true,
        });
    },

    // Box neon glow
    neonGlow: (element, options = {}) => {
        const { color = '#CCFF00', duration = 2, intensity = 20 } = options;
        return gsap.to(element, {
            boxShadow: `0 0 ${intensity}px ${color}, 0 0 ${intensity * 2}px ${color}, inset 0 0 ${intensity / 2}px ${color}`,
            duration,
            ease: 'sine.inOut',
            repeat: -1,
            yoyo: true,
        });
    },

    // Liquid morph on hover
    liquidMorph: (element) => {
        const morphStates = [
            '30% 70% 70% 30% / 30% 30% 70% 70%',
            '40% 60% 60% 40% / 60% 40% 60% 40%',
            '50% 50% 50% 50%',
        ];

        const tl = gsap.timeline({ paused: true });
        tl.to(element, {
            borderRadius: morphStates[0],
            duration: 0.3,
            ease: EASES.butter,
        }).to(element, {
            borderRadius: morphStates[1],
            duration: 0.3,
            ease: EASES.butter,
        });

        return {
            enter: () => tl.play(),
            leave: () => tl.reverse(),
            cleanup: () => gsap.killTweensOf(element),
        };
    },

    // Magnetic cursor follow effect
    magnetic: (element, options = {}) => {
        const { strength = 0.35 } = options;

        const handleMouseMove = (e) => {
            const bounds = element.getBoundingClientRect();
            const centerX = bounds.left + bounds.width / 2;
            const centerY = bounds.top + bounds.height / 2;
            const x = (e.clientX - centerX) * strength;
            const y = (e.clientY - centerY) * strength;

            gsap.to(element, {
                x,
                y,
                duration: 0.4,
                ease: EASES.micro,
            });
        };

        const handleMouseLeave = () => {
            gsap.to(element, {
                x: 0,
                y: 0,
                duration: 0.6,
                ease: EASES.bounceSubtle,
            });
        };

        element.addEventListener('mousemove', handleMouseMove);
        element.addEventListener('mouseleave', handleMouseLeave);

        return () => {
            element.removeEventListener('mousemove', handleMouseMove);
            element.removeEventListener('mouseleave', handleMouseLeave);
        };
    },

    // Button squish press
    buttonPress: (element) => {
        const handleMouseDown = () => {
            gsap.to(element, {
                scale: 0.92,
                duration: 0.1,
                ease: EASES.microIn,
            });
        };

        const handleMouseUp = () => {
            gsap.to(element, {
                scale: 1,
                duration: 0.5,
                ease: EASES.bounceSubtle,
            });
        };

        element.addEventListener('mousedown', handleMouseDown);
        element.addEventListener('mouseup', handleMouseUp);
        element.addEventListener('mouseleave', handleMouseUp);
        element.addEventListener('touchstart', handleMouseDown, { passive: true });
        element.addEventListener('touchend', handleMouseUp);

        return () => {
            element.removeEventListener('mousedown', handleMouseDown);
            element.removeEventListener('mouseup', handleMouseUp);
            element.removeEventListener('mouseleave', handleMouseUp);
            element.removeEventListener('touchstart', handleMouseDown);
            element.removeEventListener('touchend', handleMouseUp);
        };
    },

    // Floating animation
    float: (element, options = {}) => {
        const { y = 15, duration = 3 } = options;
        return gsap.to(element, {
            y: -y,
            duration,
            ease: 'sine.inOut',
            yoyo: true,
            repeat: -1,
        });
    },

    // Rotate subtle
    subtleRotate: (element, options = {}) => {
        const { rotation = 5, duration = 4 } = options;
        return gsap.to(element, {
            rotation,
            duration,
            ease: 'sine.inOut',
            yoyo: true,
            repeat: -1,
        });
    },

    // Gradient shift background
    gradientShift: (element, options = {}) => {
        const { duration = 10 } = options;
        return gsap.to(element, {
            backgroundPosition: '200% 200%',
            duration,
            ease: EASES.linear,
            repeat: -1,
        });
    },

    // Blur in reveal
    blurIn: (element, options = {}) => {
        const { duration = 0.8, blur = 20 } = options;
        return gsap.fromTo(element,
            { filter: `blur(${blur}px)`, opacity: 0 },
            { filter: 'blur(0px)', opacity: 1, duration, ease: EASES.butter }
        );
    },
};

// ============================================
// SCROLL-TRIGGERED ANIMATIONS
// ============================================
export const scrollAnimations = {
    // Fade up on scroll
    fadeUp: (elements, options = {}) => {
        const { stagger = 0.1, y = 50, start = 'top 85%' } = options;

        return gsap.from(elements, {
            y,
            opacity: 0,
            duration: 0.8,
            stagger,
            ease: EASES.butter,
            scrollTrigger: {
                trigger: elements[0] || elements,
                start,
                toggleActions: 'play none none reverse',
            },
        });
    },

    // Scale reveal
    scaleReveal: (element, options = {}) => {
        const { scale = 0.9, start = 'top 80%' } = options;

        return gsap.from(element, {
            scale,
            opacity: 0,
            duration: 1,
            ease: EASES.dramatic,
            scrollTrigger: {
                trigger: element,
                start,
                toggleActions: 'play none none reverse',
            },
        });
    },

    // Parallax effect
    parallax: (element, options = {}) => {
        const { speed = 0.5 } = options;

        return gsap.to(element, {
            y: () => ScrollTrigger.maxScroll(window) * speed * -1,
            ease: EASES.linear,
            scrollTrigger: {
                trigger: element,
                start: 'top bottom',
                end: 'bottom top',
                scrub: true,
            },
        });
    },

    // Progress bar
    progress: (element) => {
        gsap.set(element, { transformOrigin: 'left', scaleX: 0 });

        return gsap.to(element, {
            scaleX: 1,
            ease: EASES.linear,
            scrollTrigger: {
                trigger: document.body,
                start: 'top top',
                end: 'bottom bottom',
                scrub: true,
            },
        });
    },

    // Cleanup all scroll triggers
    cleanup: () => {
        ScrollTrigger.getAll().forEach(trigger => trigger.kill());
    },
};

// ============================================
// TIMELINE SEQUENCES
// ============================================
export const timelines = {
    // Hero entrance sequence
    heroEntrance: (elements = {}) => {
        const { logo, title, subtitle, cta, features } = elements;
        const tl = gsap.timeline({ defaults: { ease: EASES.butter } });

        if (logo) {
            tl.from(logo, {
                scale: 0.5,
                opacity: 0,
                duration: 0.8,
                ease: EASES.snap,
            });
        }

        if (title) {
            tl.from(title, {
                y: 80,
                opacity: 0,
                rotateX: -30,
                duration: 1,
                ease: EASES.dramatic,
            }, '-=0.4');
        }

        if (subtitle) {
            tl.from(subtitle, {
                y: 30,
                opacity: 0,
                duration: 0.7,
            }, '-=0.5');
        }

        if (cta) {
            tl.from(cta, {
                scale: 0.8,
                opacity: 0,
                duration: 0.6,
                ease: EASES.bounce,
            }, '-=0.3');
        }

        if (features && features.length) {
            tl.from(features, {
                y: 40,
                opacity: 0,
                stagger: 0.1,
                duration: 0.7,
            }, '-=0.2');
        }

        return tl;
    },

    // Modal sequence
    modalEnter: (overlay, content) => {
        const tl = gsap.timeline();

        tl.fromTo(overlay,
            { opacity: 0 },
            { opacity: 1, duration: 0.3, ease: EASES.butter }
        ).fromTo(content,
            { scale: 0.92, opacity: 0, y: 40 },
            { scale: 1, opacity: 1, y: 0, duration: 0.5, ease: EASES.snap },
            '-=0.1'
        );

        return tl;
    },

    modalExit: (overlay, content) => {
        const tl = gsap.timeline();

        tl.to(content, {
            scale: 0.95,
            opacity: 0,
            y: 30,
            duration: 0.3,
            ease: EASES.microIn,
        }).to(overlay, {
            opacity: 0,
            duration: 0.25,
            ease: EASES.butter,
        }, '-=0.1');

        return tl;
    },

    // Dashboard card reveal
    dashboardReveal: (cards) => {
        const tl = gsap.timeline({ defaults: { ease: EASES.butter } });

        tl.from(cards, {
            y: 60,
            opacity: 0,
            scale: 0.95,
            stagger: {
                each: 0.08,
                from: 'start',
            },
            duration: 0.7,
        });

        return tl;
    },

    // Transaction list reveal
    transactionReveal: (items) => {
        return gsap.from(items, {
            x: -30,
            opacity: 0,
            stagger: 0.05,
            duration: 0.5,
            ease: EASES.butter,
        });
    },
};

// ============================================
// PERFORMANCE UTILITIES
// ============================================

// Check for reduced motion preference
export const prefersReducedMotion = () => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

// Safe animate with reduced motion fallback
export const safeAnimate = (target, vars, fallback = {}) => {
    if (prefersReducedMotion()) {
        return gsap.set(target, { ...fallback, opacity: vars.opacity ?? 1 });
    }
    return gsap.to(target, vars);
};

// Batch animations for performance
export const batchAnimate = (elements, animation, options = {}) => {
    const { batchSize = 10, delay = 0.1 } = options;
    const batches = [];
    const arr = Array.from(elements);

    for (let i = 0; i < arr.length; i += batchSize) {
        batches.push(arr.slice(i, i + batchSize));
    }

    const tl = gsap.timeline();
    batches.forEach((batch, index) => {
        tl.add(() => animation(batch), index * delay);
    });

    return tl;
};

// ============================================
// REACT HOOK HELPER
// ============================================
export const useGsapAnimation = () => {
    return {
        animations,
        genZEffects,
        scrollAnimations,
        timelines,
        EASES,
        prefersReducedMotion,
        safeAnimate,
    };
};

// Export ScrollTrigger for advanced usage
export { ScrollTrigger };

export default animations;
