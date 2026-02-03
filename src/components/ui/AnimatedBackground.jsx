import React, { useRef, useEffect } from 'react';
import gsap from 'gsap';

// TypeGPU-inspired animated background with floating orbs
const AnimatedBackground = ({ variant = 'default', intensity = 'medium' }) => {
    const containerRef = useRef(null);
    const orbsRef = useRef([]);

    // Intensity settings
    const intensityMap = {
        low: { orbCount: 3, blur: 80, opacity: 0.15 },
        medium: { orbCount: 5, blur: 100, opacity: 0.2 },
        high: { orbCount: 8, blur: 120, opacity: 0.3 },
    };

    const settings = intensityMap[intensity] || intensityMap.medium;

    // Color schemes
    const colorSchemes = {
        default: ['#22c55e', '#3b82f6', '#a855f7'],
        finance: ['#10b981', '#06b6d4', '#8b5cf6'],
        warm: ['#f59e0b', '#ef4444', '#ec4899'],
        cool: ['#3b82f6', '#06b6d4', '#8b5cf6'],
    };

    const colors = colorSchemes[variant] || colorSchemes.default;

    useEffect(() => {
        if (!containerRef.current) return;

        // Create floating orbs
        const orbs = [];
        for (let i = 0; i < settings.orbCount; i++) {
            const orb = document.createElement('div');
            orb.className = 'absolute rounded-full pointer-events-none';
            orb.style.width = `${Math.random() * 200 + 100}px`;
            orb.style.height = orb.style.width;
            orb.style.background = colors[i % colors.length];
            orb.style.opacity = settings.opacity;
            orb.style.filter = `blur(${settings.blur}px)`;
            orb.style.left = `${Math.random() * 100}%`;
            orb.style.top = `${Math.random() * 100}%`;
            orb.style.transform = 'translate(-50%, -50%)';
            containerRef.current.appendChild(orb);
            orbs.push(orb);
            orbsRef.current = orbs;

            // Animate each orb with GSAP
            const duration = 15 + Math.random() * 10;
            gsap.to(orb, {
                x: `random(-100, 100)`,
                y: `random(-100, 100)`,
                scale: `random(0.8, 1.5)`,
                duration,
                ease: 'sine.inOut',
                repeat: -1,
                yoyo: true,
                delay: Math.random() * 5
            });
        }

        return () => {
            // Cleanup
            orbs.forEach(orb => {
                gsap.killTweensOf(orb);
                orb.remove();
            });
        };
    }, [variant, intensity, settings, colors]);

    return (
        <div
            ref={containerRef}
            className="fixed inset-0 pointer-events-none overflow-hidden z-0"
            style={{ mixBlendMode: 'screen' }}
        />
    );
};

// Simpler grain overlay
export const GrainOverlay = ({ opacity = 0.03 }) => (
    <div
        className="fixed inset-0 pointer-events-none z-[1]"
        style={{
            opacity,
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
    />
);

// Grid background effect
export const GridBackground = ({ size = 40, color = 'rgba(255,255,255,0.03)' }) => (
    <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
            backgroundImage: `
                linear-gradient(${color} 1px, transparent 1px),
                linear-gradient(90deg, ${color} 1px, transparent 1px)
            `,
            backgroundSize: `${size}px ${size}px`,
        }}
    />
);

export default AnimatedBackground;
