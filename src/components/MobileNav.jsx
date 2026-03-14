import React from 'react';
import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';

const links = [
    { to: '/', emoji: '🏠', label: 'Space' },
    { to: '/transactions', emoji: '📑', label: 'Terminal' },
    { to: '/accounts', emoji: '🏦', label: 'Nodal' },
    { to: '/credit-cards', emoji: '💳', label: 'Cards' },
    { to: '/bills', emoji: '🔔', label: 'Flow' },
    { to: '/settings', emoji: '⚙️', label: 'System' },
];

const MobileNav = () => {
    return (
        <nav className="glass-nav">
            <div className="flex justify-around items-center max-w-lg mx-auto">
                {links.map(link => (
                    <NavLink
                        key={link.to}
                        to={link.to}
                        className={({ isActive }) =>
                            `group relative flex flex-col items-center gap-1.5 transition-all outline-none ${isActive ? 'text-primary' : 'text-text-muted'}`
                        }
                    >
                        {({ isActive }) => (
                            <>
                                <div className={`text-2xl transition-all duration-300 ${isActive ? 'scale-125 -translate-y-1' : 'opacity-60 grayscale group-hover:grayscale-0'}`}>
                                    {link.emoji}
                                </div>
                                <span className={`text-xs font-black uppercase tracking-[0.15em] transition-all ${isActive ? 'opacity-100' : 'opacity-0'}`}>
                                    {link.label}
                                </span>
                                {isActive && (
                                    <motion.div
                                        layoutId="nav-glow"
                                        className="absolute -top-4 w-8 h-1 bg-primary rounded-full blur-[2px] shadow-[0_0_10px_rgba(var(--primary-rgb),0.8)]"
                                    />
                                )}
                            </>
                        )}
                    </NavLink>
                ))}
            </div>
        </nav>
    );
};

export default MobileNav;
