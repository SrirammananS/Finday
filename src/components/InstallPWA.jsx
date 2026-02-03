import React, { useState } from 'react';
import { Download, X } from 'lucide-react';
import { usePWA } from '../hooks/usePWA';

const InstallPWA = () => {
    const { supportsPWA, installPWA, isInstalled } = usePWA();
    const [dismissed, setDismissed] = useState(false);

    // Don't show if already installed, or if user dismissed, or if not supported
    if (!supportsPWA || dismissed || isInstalled) {
        return null;
    }

    return (
        <div className="fixed bottom-20 left-4 right-4 z-50 animate-in slide-in-from-bottom-4">
            <div className="card-lg bg-primary text-primary-foreground p-4 shadow-2xl flex items-center justify-between border-none">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                        <Download size={20} className="text-primary-foreground" />
                    </div>
                    <div>
                        <p className="text-sm font-black">Install FinFlow</p>
                        <p className="text-[10px] opacity-80 font-bold uppercase tracking-wider">Add to your home screen</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={installPWA}
                        className="btn bg-canvas text-text-main border-none px-4 py-2 rounded-xl text-xs font-black shadow-sm"
                    >
                        Install
                    </button>
                    <button
                        onClick={() => setDismissed(true)}
                        className="p-2 hover:bg-white/10 rounded-full transition"
                    >
                        <X size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default InstallPWA;
