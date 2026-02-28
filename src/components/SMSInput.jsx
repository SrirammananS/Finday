import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Clipboard, Send } from 'lucide-react';
import SMSDetector from './SMSDetector';

const SMSInput = ({ isOpen, onClose }) => {
    const [smsText, setSmsText] = useState('');
    const [showDetector, setShowDetector] = useState(false);

    const handlePaste = async () => {
        try {
            const text = await navigator.clipboard.readText();
            if (text) {
                setSmsText(text);
            }
        } catch {
            console.log('Clipboard access denied');
        }
    };

    const handleDetect = () => {
        if (smsText.trim()) {
            setShowDetector(true);
        }
    };

    const handleDetectorClose = () => {
        setShowDetector(false);
        setSmsText('');
        onClose();
    };

    if (!isOpen) return null;

    const content = (
        <>
            <AnimatePresence>
                {!showDetector && (
                    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 overflow-hidden">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/70 backdrop-blur-md"
                            onClick={onClose}
                        />
                        <motion.div
                            initial={{ y: 100, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 100, opacity: 0 }}
                            onClick={e => e.stopPropagation()}
                            className="relative w-full max-w-lg max-h-[90dvh] bg-card border border-card-border rounded-t-3xl md:rounded-2xl overflow-hidden flex flex-col"
                        >
                            {/* Header - Enhanced */}
                            <div className="flex-shrink-0 p-6 border-b border-card-border flex justify-between items-center bg-gradient-to-r from-primary/10 to-transparent">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
                                        <MessageSquare size={22} className="text-primary" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black text-text-main uppercase tracking-tight">SMS Entry</h3>
                                        <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mt-0.5">Paste Bank SMS</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={onClose} 
                                    className="p-2 hover:bg-canvas-subtle rounded-full transition-all hover:scale-110"
                                >
                                    <X size={20} className="text-text-muted" />
                                </button>
                            </div>

                            {/* Body - Enhanced (scrollable if needed) */}
                            <div className="p-6 space-y-4 flex-1 overflow-y-auto min-h-0">
                                <div className="relative">
                                    <textarea
                                        value={smsText}
                                        onChange={e => setSmsText(e.target.value)}
                                        placeholder="Paste your bank SMS here...&#10;&#10;Example:&#10;Rs.500.00 debited from A/c XX1234 on 26-01-26 to VPA swiggy@upi"
                                        className="w-full h-48 bg-canvas-subtle border border-card-border rounded-xl p-4 text-sm font-medium text-text-main placeholder:text-text-muted/40 outline-none focus:border-primary focus:bg-canvas-elevated resize-none transition-all"
                                        autoFocus
                                    />
                                    <button
                                        onClick={handlePaste}
                                        className="absolute top-3 right-3 p-2.5 bg-card border border-card-border rounded-xl text-text-muted hover:text-primary hover:border-primary hover:bg-primary/10 transition-all group"
                                        title="Paste from clipboard"
                                    >
                                        <Clipboard size={18} className="group-hover:scale-110 transition-transform" />
                                    </button>
                                </div>

                                {/* Info Card */}
                                <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
                                    <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-1">Auto-Detection</p>
                                    <p className="text-xs text-text-muted">
                                        We'll automatically detect: Amount • Merchant • Category • Date
                                    </p>
                                </div>
                            </div>

                            {/* Footer - Enhanced */}
                            <div className="flex-shrink-0 p-6 pt-0 flex gap-3">
                                <button
                                    onClick={onClose}
                                    className="px-6 py-4 rounded-xl border border-card-border text-text-muted hover:text-text-main hover:border-primary/30 transition-all text-sm font-bold uppercase"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDetect}
                                    disabled={!smsText.trim()}
                                    className="flex-1 py-4 bg-primary text-primary-foreground rounded-xl font-black uppercase tracking-widest text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all"
                                >
                                    <Send size={18} /> Parse SMS
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showDetector && (
                    <SMSDetector
                        smsText={smsText}
                        onClose={handleDetectorClose}
                        onSuccess={() => {
                            setSmsText('');
                        }}
                    />
                )}
            </AnimatePresence>
        </>
    );

    return ReactDOM.createPortal(content, document.body);
};

export default SMSInput;
