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
            <div className="flex items-center gap-3 mb-12 px-2">
                <div className="text-3xl">🧩</div>
                <div>
                    <h2 className="text-xl font-bold text-text leading-none tracking-tight">Finday</h2>
                    <p className="text-[11px] font-bold text-text-secondary uppercase tracking-[0.05em] mt-1">Smart Asset</p>
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
                                ? 'bg-white shadow-sm text-blue'
                                : 'text-text-secondary hover:bg-border-light hover:text-text'}`
                        }
                    >
                        {({ isActive }) => (
                            <>
                                <span className="text-xl leading-none">{link.emoji}</span>
                                <span className={`text-[15px] font-semibold tracking-tight ${isActive ? 'text-blue' : ''}`}>
                                    {link.label}
                                </span>
                                {isActive && (
                                    <motion.div
                                        layoutId="sidebar-dot"
                                        className="ml-auto w-1.5 h-1.5 bg-blue rounded-full"
                                    />
                                )}
                            </>
                        )}
                    </NavLink>
                ))}
            </nav>

            {/* Desktop Footer */}
            <div className="mt-auto px-1 py-6 border-t border-border">
                <div className="flex items-center gap-3 px-3 py-3 bg-white/50 rounded-2xl border border-border/40">
                    <div className="w-10 h-10 rounded-full bg-blue text-white flex items-center justify-center text-[10px] font-bold shadow-blue/20 shadow-lg">
                        PRO
                    </div>
                    <div>
                        <p className="text-xs font-bold text-text">Standard v1.2</p>
                        <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Connected</p>
                    </div>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
