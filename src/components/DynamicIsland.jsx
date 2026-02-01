import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import TransactionForm from './TransactionForm';
import SMSInput from './SMSInput';
import { LayoutDashboard, Wallet, PieChart, Settings, Plus, MessageSquare, CalendarClock } from 'lucide-react';

const links = [
    { to: '/', icon: <LayoutDashboard size={20} />, label: 'Home' },
    { to: '/accounts', icon: <Wallet size={20} />, label: 'Accounts' },
    { to: '/bills', icon: <CalendarClock size={20} />, label: 'Bills' },
    { to: '/insights', icon: <PieChart size={20} />, label: 'Insights' },
    { to: '/settings', icon: <Settings size={20} />, label: 'Settings' },
];

const DynamicIsland = () => {
    const [showForm, setShowForm] = useState(false);
    const [showSMS, setShowSMS] = useState(false);

    React.useEffect(() => {
        if (showForm || showSMS) document.body.classList.add('modal-open');
        else document.body.classList.remove('modal-open');
    }, [showForm, showSMS]);

    return (
        <>
            <div className="modern-island group gap-1 md:gap-2">
                {links.map(link => (
                    <NavLink
                        key={link.to}
                        to={link.to}
                        className={({ isActive }) =>
                            `relative w-10 h-10 md:w-11 md:h-11 flex items-center justify-center rounded-full transition-all duration-300 z-10 ${isActive
                                ? 'text-canvas'
                                : 'text-text-muted hover:bg-text-main/5 hover:text-text-main'
                            }`
                        }
                        title={link.label}
                    >
                        {({ isActive }) => (
                            <>
                                <span className="relative z-10">{link.icon}</span>
                                {isActive && (
                                    <motion.div
                                        layoutId="island-active-bg"
                                        className="absolute inset-0 bg-text-main rounded-full z-0"
                                        transition={{ type: 'spring', damping: 25, stiffness: 400 }}
                                    />
                                )}
                            </>
                        )}
                    </NavLink>
                ))}

                <div className="w-[1px] h-4 md:h-5 bg-card-border mx-1" />

                {/* SMS Button */}
                <button
                    onClick={() => setShowSMS(true)}
                    className="w-10 h-10 md:w-11 md:h-11 flex items-center justify-center text-text-muted hover:text-primary hover:bg-primary/10 rounded-full transition-all"
                    title="Add from SMS"
                >
                    <MessageSquare size={20} />
                </button>

                {/* Add Button */}
                <button
                    onClick={() => setShowForm(true)}
                    className="w-10 h-10 md:w-11 md:h-11 flex items-center justify-center bg-primary text-primary-foreground rounded-full hover:scale-110 active:scale-95 transition-all shadow-lg shadow-primary/25"
                >
                    <Plus size={22} />
                </button>
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
