import React, { useState, useEffect } from 'react';
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
        } catch (err) {
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

    return (
        <>
            <AnimatePresence>
                {!showDetector && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[90] bg-black/70 backdrop-blur-md"
                        onClick={onClose}
                    >
                        <motion.div
                            initial={{ y: 100, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 100, opacity: 0 }}
                            onClick={e => e.stopPropagation()}
                            className="fixed bottom-0 left-0 right-0 w-full max-w-lg mx-auto bg-card border border-card-border rounded-t-3xl md:rounded-2xl overflow-hidden md:bottom-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2"
                        >
                            {/* Header */}
                            <div className="p-6 border-b border-card-border flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                                        <MessageSquare size={20} className="text-primary" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black text-text-main">Add from SMS</h3>
                                        <p className="text-xs text-text-muted">Paste your bank SMS</p>
                                    </div>
                                </div>
                                <button onClick={onClose} className="p-2 hover:bg-canvas-subtle rounded-full">
                                    <X size={20} className="text-text-muted" />
                                </button>
                            </div>

                            {/* Body */}
                            <div className="p-6">
                                <div className="relative">
                                    <textarea
                                        value={smsText}
                                        onChange={e => setSmsText(e.target.value)}
                                        placeholder="Paste your bank SMS here...&#10;&#10;Example:&#10;Rs.500.00 debited from A/c XX1234 on 26-01-26 to VPA swiggy@upi"
                                        className="w-full h-40 bg-canvas-subtle border border-card-border rounded-xl p-4 text-sm text-text-main placeholder:text-text-muted/40 outline-none focus:border-primary resize-none"
                                    />
                                    <button
                                        onClick={handlePaste}
                                        className="absolute top-3 right-3 p-2 bg-card border border-card-border rounded-lg text-text-muted hover:text-primary hover:border-primary transition-all"
                                        title="Paste from clipboard"
                                    >
                                        <Clipboard size={16} />
                                    </button>
                                </div>

                                <p className="text-[10px] text-text-muted mt-3 text-center">
                                    We'll automatically detect the amount, merchant, and category
                                </p>
                            </div>

                            {/* Footer */}
                            <div className="p-6 pt-0">
                                <button
                                    onClick={handleDetect}
                                    disabled={!smsText.trim()}
                                    className="w-full py-4 bg-primary text-primary-foreground rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Send size={18} /> Detect Transaction
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
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
};

export default SMSInput;
