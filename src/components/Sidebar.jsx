import React from 'react';
import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';

const links = [
    { to: '/', emoji: '🏠', label: 'Home' },
    { to: '/transactions', emoji: '📑', label: 'Ledger' },
    { to: '/accounts', emoji: '🏦', label: 'Wallets' },
    { to: '/bills', emoji: '🔔', label: 'Recurring' },
    { to: '/categories', emoji: '🏷️', label: 'Tags' },
    { to: '/settings', emoji: '⚙️', label: 'Settings' },
];

const Sidebar = () => {
    return (
        <aside className="sidebar">
            {/* Logo */}
            <div className="mb-12 px-2">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary font-bold">L</div>
                    <div>
                        <h2 className="text-lg font-extrabold text-text-main leading-none tracking-[-0.04em]">LAKSH</h2>
                        <p className="text-[8px] font-semibold text-text-muted uppercase tracking-[0.2em] mt-1 opacity-60">System Ledger</p>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex flex-col gap-1 flex-1">
                {links.map(link => (
                    <NavLink
                        key={link.to}
                        to={link.to}
                        className={({ isActive }) =>
                            `flex items-center gap-3 py-3 px-4 rounded-xl transition-all no-underline
                            ${isActive
                                ? 'bg-primary/10 text-primary shadow-sm'
                                : 'text-text-muted hover:bg-canvas-subtle hover:text-text-main'}`
                        }
                    >
                        {({ isActive }) => (
                            <>
                                <span className="text-xl leading-none">{link.emoji}</span>
                                <span className={`text-[15px] font-semibold tracking-tight ${isActive ? 'text-primary' : ''}`}>
                                    {link.label}
                                </span>
                                {isActive && (
                                    <motion.div
                                        layoutId="sidebar-dot"
                                        className="ml-auto w-1.5 h-1.5 bg-primary rounded-full"
                                    />
                                )}
                            </>
                        )}
                    </NavLink>
                ))}
            </nav>

            {/* Desktop Footer */}
            <div className="mt-auto px-1 py-6 border-t border-border">
                <div className="flex items-center gap-3 px-3 py-3 bg-card rounded-2xl border border-card-border">
                    <div className="w-10 h-10 rounded-full bg-primary text-black flex items-center justify-center text-[10px] font-bold shadow-lg shadow-primary/20">
                        PRO
                    </div>
                    <div>
                        <p className="text-xs font-bold text-text-main">Standard v1.2</p>
                        <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Connected</p>
                    </div>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
