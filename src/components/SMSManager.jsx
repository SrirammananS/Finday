import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MessageSquare, History, Settings2 } from 'lucide-react';
import PendingTransactionsFeed from './PendingTransactionsFeed';
import SMSRulesManager from './SMSRulesManager';

export default function SMSManager({ isOpen, onClose }) {
    const [activeTab, setActiveTab] = useState('history'); // 'history' | 'rules'

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-card w-full max-w-2xl max-h-[90vh] rounded-2xl border border-card-border shadow-2xl overflow-hidden flex flex-col"
            >
                {/* Header */}
                <div className="p-4 border-b border-card-border bg-card flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                            <MessageSquare size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-text-main uppercase tracking-tight">SMS Manager</h2>
                            <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Transaction Intelligence</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-canvas-subtle flex items-center justify-center text-text-muted transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-card-border">
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`flex-1 py-3 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${activeTab === 'history' ? 'bg-primary/10 text-primary border-b-2 border-primary' : 'text-text-muted hover:text-text-main hover:bg-canvas-subtle'}`}
                    >
                        <History size={14} /> History / Pending
                    </button>
                    <button
                        onClick={() => setActiveTab('rules')}
                        className={`flex-1 py-3 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${activeTab === 'rules' ? 'bg-primary/10 text-primary border-b-2 border-primary' : 'text-text-muted hover:text-text-main hover:bg-canvas-subtle'}`}
                    >
                        <Settings2 size={14} /> Automation Rules
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto bg-canvas p-4">
                    {activeTab === 'history' ? (
                        <PendingTransactionsFeed /> // Reusing existing feed
                    ) : (
                        <SMSRulesManager isOpen={true} onClose={() => { }} embedded={true} />
                    )}
                </div>
            </motion.div>
        </div>
    );
}
