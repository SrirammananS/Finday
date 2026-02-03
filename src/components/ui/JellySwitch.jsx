import React, { useRef, useEffect } from 'react';
import gsap from 'gsap';

const JellySwitch = ({ isOn, onToggle, label, size = 'md' }) => {
    const knobRef = useRef(null);
    const trackRef = useRef(null);

    // Size config
    const sizes = {
        sm: { width: 40, height: 24, padding: 2, knob: 20 },
        md: { width: 56, height: 32, padding: 4, knob: 24 },
        lg: { width: 72, height: 40, padding: 4, knob: 32 },
    };

    const { width, height, padding, knob: knobSize } = sizes[size] || sizes.md;
    const travelDistance = width - knobSize - (padding * 2);

    // GSAP Jelly animation on state change
    useEffect(() => {
        if (!knobRef.current) return;

        const targetX = isOn ? travelDistance : 0;

        // Kill any existing animations
        gsap.killTweensOf(knobRef.current);

        // Jelly spring animation
        const tl = gsap.timeline();

        tl.to(knobRef.current, {
            x: targetX,
            duration: 0.35,
            ease: 'elastic.out(1.2, 0.5)'
        });

        // Squish effect
        tl.to(knobRef.current, {
            scaleX: 1.2,
            scaleY: 0.85,
            duration: 0.1,
            ease: 'power2.out'
        }, 0);

        tl.to(knobRef.current, {
            scaleX: 0.9,
            scaleY: 1.1,
            duration: 0.1,
            ease: 'power2.inOut'
        }, 0.1);

        tl.to(knobRef.current, {
            scaleX: 1,
            scaleY: 1,
            duration: 0.25,
            ease: 'elastic.out(1, 0.4)'
        }, 0.2);

    }, [isOn, travelDistance]);

    // Track color animation
    useEffect(() => {
        if (!trackRef.current) return;

        gsap.to(trackRef.current, {
            backgroundColor: isOn ? 'var(--color-primary)' : 'rgba(255, 255, 255, 0.1)',
            duration: 0.3,
            ease: 'power2.out'
        });
    }, [isOn]);

    const handleClick = () => {
        // Haptic feedback on mobile
        if (navigator.vibrate) {
            navigator.vibrate(10);
        }
        onToggle();
    };

    return (
        <div className="flex items-center gap-4 cursor-pointer select-none" onClick={handleClick}>
            {label && (
                <span className="text-[10px] font-black uppercase tracking-widest text-text-muted">
                    {label}
                </span>
            )}
            <div
                ref={trackRef}
                className="relative rounded-full transition-shadow duration-300 hover:shadow-[0_0_15px_rgba(var(--primary-rgb),0.3)]"
                style={{
                    width,
                    height,
                    backgroundColor: isOn ? 'var(--color-primary)' : 'rgba(255, 255, 255, 0.1)'
                }}
            >
                {/* Glow effect */}
                <div
                    className={`absolute inset-0 rounded-full transition-opacity duration-300 ${isOn ? 'opacity-100' : 'opacity-0'}`}
                    style={{
                        background: 'radial-gradient(circle at center, rgba(var(--primary-rgb), 0.3), transparent 70%)',
                        filter: 'blur(8px)'
                    }}
                />

                {/* Knob */}
                <div
                    ref={knobRef}
                    className="absolute bg-white rounded-full shadow-lg"
                    style={{
                        width: knobSize,
                        height: knobSize,
                        top: padding,
                        left: padding,
                        boxShadow: isOn
                            ? '0 2px 8px rgba(0,0,0,0.2), 0 0 10px rgba(var(--primary-rgb),0.3)'
                            : '0 2px 8px rgba(0,0,0,0.2)'
                    }}
                />
            </div>
        </div>
    );
};

export default JellySwitch;
