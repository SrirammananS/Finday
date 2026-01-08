import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import TransactionForm from './TransactionForm';

const links = [
    { to: '/', emoji: '🏠', label: 'Space' },
    { to: '/transactions', emoji: '📑', label: 'Ledger' },
    { to: '/accounts', emoji: '🏦', label: 'Nodal' },
    { to: '/insights', emoji: '📈', label: 'Analysis' },
    { to: '/settings', emoji: '⚙️', label: 'Kernel' },
];

const DynamicIsland = () => {
    const [showForm, setShowForm] = useState(false);

    return (
        <>
            <div className="genz-island group !gap-1 md:!gap-2">
                {links.map(link => (
                    <NavLink
                        key={link.to}
                        to={link.to}
                        className={({ isActive }) =>
                            `relative w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-full transition-all duration-500 z-10 ${isActive
                                ? 'text-black'
                                : 'text-white/40 hover:bg-white/5 hover:text-white'
                            }`
                        }
                    >
                        {({ isActive }) => (
                            <>
                                <span className="text-lg md:text-xl relative z-10">{link.emoji}</span>
                                {isActive && (
                                    <motion.div
                                        layoutId="island-active-bg"
                                        className="absolute inset-0 bg-white rounded-full z-0"
                                        transition={{ type: 'spring', damping: 25, stiffness: 400 }}
                                    />
                                )}
                            </>
                        )}
                    </NavLink>
                ))}

                <div className="w-[1px] h-4 md:h-6 bg-white/10 mx-1 md:mx-2" />

                <button
                    onClick={() => setShowForm(true)}
                    className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center bg-toxic-lime text-black rounded-full text-lg md:text-xl hover:scale-110 active:scale-95 transition-all shadow-toxic"
                >
                    ＋
                </button>
            </div>

            <AnimatePresence>
                {showForm && (
                    <TransactionForm onClose={() => setShowForm(false)} />
                )}
            </AnimatePresence>
        </>
    );
};

export default DynamicIsland;
