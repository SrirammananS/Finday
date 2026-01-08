import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

const FeedbackContext = createContext();

export const useFeedback = () => useContext(FeedbackContext);

export const FeedbackProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    const toast = useCallback((message, type = 'success') => {
        const id = Math.random().toString(36).substr(2, 9);
        setToasts(prev => [...prev, { id, message, type }]);

        // Auto-remove after 4s
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 4000);
    }, []);

    const removeToast = (id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };

    return (
        <FeedbackContext.Provider value={{ toast }}>
            {children}

            {/* Toast Container */}
            <div className="fixed top-6 left-1/2 -translate-x-1/2 w-full max-w-[400px] z-[4000] flex flex-col gap-2 px-6">
                <AnimatePresence>
                    {toasts.map(t => (
                        <motion.div
                            key={t.id}
                            initial={{ y: -50, opacity: 0, scale: 0.9 }}
                            animate={{ y: 0, opacity: 1, scale: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className={`flex items-center gap-3 p-4 rounded-2xl shadow-huge border bg-white ${t.type === 'error' ? 'border-rose-100' : 'border-emerald-100'
                                }`}
                        >
                            <div className={t.type === 'error' ? 'text-rose' : 'text-emerald'}>
                                {t.type === 'error' ? <AlertCircle size={20} strokeWidth={3} /> : <CheckCircle size={20} strokeWidth={3} />}
                            </div>
                            <p className="flex-1 text-xs font-black text-secondary uppercase tracking-widest">{t.message}</p>
                            <button onClick={() => removeToast(t.id)} className="text-muted hover:text-secondary p-1">
                                <X size={16} strokeWidth={3} />
                            </button>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </FeedbackContext.Provider>
    );
};
