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
        <div
            className="fixed left-4 right-4 z-[998] animate-in slide-in-from-bottom-4"
            style={{ bottom: 'max(5.5rem, calc(5.5rem + env(safe-area-inset-bottom, 0px)))' }}
        >
            <div className="card-lg bg-primary text-primary-foreground p-4 shadow-2xl flex items-center justify-between border-none rounded-2xl">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                        <Download size={20} className="text-primary-foreground" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-sm font-black truncate">Install LAKSH</p>
                        <p className="text-[10px] opacity-80 font-bold uppercase tracking-wider">Add to home screen</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <button
                        onClick={installPWA}
                        className="btn bg-canvas text-text-main border-none px-4 py-3 rounded-xl text-xs font-black shadow-sm min-h-[44px]"
                    >
                        Install
                    </button>
                    <button
                        onClick={() => setDismissed(true)}
                        className="p-2.5 hover:bg-white/10 rounded-full transition min-h-[44px] min-w-[44px] flex items-center justify-center"
                    >
                        <X size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default InstallPWA;
