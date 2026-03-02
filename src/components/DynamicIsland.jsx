import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import TransactionForm from './TransactionForm';
import SMSInput from './SMSInput';
import { LayoutDashboard, Wallet, Settings, Plus, MessageSquare, FileText } from 'lucide-react';

const links = [
    { to: '/', icon: <LayoutDashboard size={18} />, label: 'Home' },
    { to: '/transactions', icon: <FileText size={18} />, label: 'Ledger' },
    { to: '/accounts', icon: <Wallet size={18} />, label: 'Accounts' },
    { to: '/settings', icon: <Settings size={18} />, label: 'Settings' },
];

const DynamicIsland = () => {
    const [showForm, setShowForm] = useState(false);
    const [showSMS, setShowSMS] = useState(false);

    return (
        <>
            <div className="modern-island-wrapper">
                <div className="modern-island modern-island-scroll group gap-1 md:gap-2">
                    {links.map(link => (
                        <NavLink
                            key={link.to}
                            to={link.to}
                            className={({ isActive }) =>
                                `modern-island-item relative w-11 h-11 md:w-10 md:h-10 flex-shrink-0 flex items-center justify-center rounded-full transition-all duration-300 z-10 ${isActive
                                    ? 'text-primary-foreground'
                                    : 'text-text-muted hover:bg-canvas-subtle hover:text-text-main'
                                }`
                            }
                            title={link.label}
                            aria-label={link.label}
                        >
                        {({ isActive }) => (
                            <>
                                <span className="relative z-10">{link.icon}</span>
                                {isActive && (
                                    <motion.div
                                        layoutId="island-active-bg"
                                        className="absolute inset-0 bg-primary rounded-full z-0 shadow-[0_0_20px_rgba(var(--primary-rgb),0.5)]"
                                        transition={{ type: 'spring', damping: 25, stiffness: 400 }}
                                    />
                                )}
                            </>
                        )}
                    </NavLink>
                    ))}

                    <div className="w-px h-4 md:h-5 bg-card-border mx-0.5 flex-shrink-0" aria-hidden />

                    {/* SMS Button - 44px tap target on mobile */}
                    <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setShowSMS(true)}
                        className="w-11 h-11 md:w-10 md:h-10 flex-shrink-0 flex items-center justify-center text-text-muted hover:text-primary hover:bg-primary/10 rounded-full transition-all relative group"
                        title="Add from SMS"
                        aria-label="Add from SMS"
                    >
                    <MessageSquare size={18} />
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full opacity-0 group-hover:opacity-100 transition-opacity animate-pulse" />
                </motion.button>

                    {/* Add Button - 44px tap target on mobile */}
                    <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setShowForm(true)}
                        className="w-11 h-11 md:w-10 md:h-10 flex-shrink-0 flex items-center justify-center bg-primary text-primary-foreground rounded-full transition-all shadow-lg shadow-primary/25 hover:shadow-primary/40 relative group"
                        title="Add Transaction"
                        aria-label="Add Transaction"
                    >
                    <Plus size={18} />
                    <motion.div
                        className="absolute inset-0 bg-primary rounded-full opacity-0 group-hover:opacity-20"
                        animate={{ scale: [1, 1.5, 1], opacity: [0, 0.3, 0] }}
                        transition={{ duration: 2, repeat: Infinity }}
                    />
                </motion.button>
                </div>
            </div>

            <AnimatePresence>
                {showForm && (
                    <TransactionForm onClose={() => setShowForm(false)} />
                )}
            </AnimatePresence>

            <SMSInput isOpen={showSMS} onClose={() => setShowSMS(false)} />
        </>
    );
};

export default DynamicIsland;
