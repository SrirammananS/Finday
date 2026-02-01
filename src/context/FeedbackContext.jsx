import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertCircle, X } from 'lucide-react';

const FeedbackContext = createContext();

export const useFeedback = () => useContext(FeedbackContext);

export const FeedbackProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);
    const isMountedRef = useRef(true);
    const timeoutRefs = useRef(new Set());

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            isMountedRef.current = false;
            timeoutRefs.current.forEach(clearTimeout);
            timeoutRefs.current.clear();
        };
    }, []);

    const toast = useCallback((message, type = 'success') => {
        if (!isMountedRef.current) return;
        
        const id = Math.random().toString(36).substr(2, 9);
        setToasts(prev => [...prev, { id, message, type }]);

        // Auto-remove after 4s
        const timeoutId = setTimeout(() => {
            if (isMountedRef.current) {
                setToasts(prev => prev.filter(t => t.id !== id));
            }
            timeoutRefs.current.delete(timeoutId);
        }, 4000);
        
        timeoutRefs.current.add(timeoutId);
    }, []);

    const removeToast = (id) => {
        if (!isMountedRef.current) return;
        setToasts(prev => prev.filter(t => t.id !== id));
    };

    return (
        <FeedbackContext.Provider value={{ toast }}>
            {children}

            {/* Toast Container */}
            <div className="fixed top-6 left-1/2 -translate-x-1/2 w-full max-w-[400px] z-[10001] flex flex-col gap-2 px-4">
                <AnimatePresence>
                    {toasts.map(t => (
                        <motion.div
                            key={t.id}
                            initial={{ y: -50, opacity: 0, scale: 0.9 }}
                            animate={{ y: 0, opacity: 1, scale: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className={`flex items-center gap-3 p-4 rounded-2xl shadow-2xl border backdrop-blur-xl ${t.type === 'error'
                                    ? 'bg-red-500/90 border-red-400 text-white'
                                    : 'bg-card border-primary/30 text-text-main'
                                }`}
                        >
                            <div className={t.type === 'error' ? 'text-white' : 'text-primary'}>
                                {t.type === 'error' ? <AlertCircle size={20} strokeWidth={2.5} /> : <CheckCircle size={20} strokeWidth={2.5} />}
                            </div>
                            <p className="flex-1 text-xs font-bold uppercase tracking-wider">{t.message}</p>
                            <button onClick={() => removeToast(t.id)} className="opacity-60 hover:opacity-100 p-1 transition-opacity">
                                <X size={16} strokeWidth={2.5} />
                            </button>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </FeedbackContext.Provider>
    );
};
