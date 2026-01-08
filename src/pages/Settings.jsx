import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { usePWA } from '../hooks/usePWA';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const Settings = () => {
    const { config, isConnected, connect, disconnect, lastSyncTime, isLoading } = useFinance();
    const { supportsPWA, installPWA, isInstalled } = usePWA();

    const [clientId, setClientId] = useState(config.clientId || '');
    const [spreadsheetId, setSpreadsheetId] = useState(config.spreadsheetId || '');
    const [isConnecting, setIsConnecting] = useState(false);
    const [connectionError, setConnectionError] = useState('');

    if (isLoading) return <div className="p-10 text-center uppercase tracking-widest opacity-20 text-[10px]">Accessing.System.Config...</div>;

    const handleConnect = async (e) => {
        e.preventDefault();
        if (!clientId || !spreadsheetId) return;
        setIsConnecting(true);
        setConnectionError('');
        try {
            const success = await connect(clientId, spreadsheetId);
            if (!success) setConnectionError('Handshake_Denied: Check credentials');
        } catch (err) {
            setConnectionError(err.message || 'Signal_Lost: Socket error');
        } finally {
            setIsConnecting(false);
        }
    };

    const handleClearData = () => {
        if (confirm('⚠️ CRITICAL: Execute purge of all local neural cache?')) {
            localStorage.clear();
            window.location.reload();
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="px-4 py-12 md:px-6 md:py-20 max-w-4xl mx-auto min-h-screen pb-40"
        >
            <header className="mb-12 md:mb-20">
                <h2 className="text-[10px] font-black uppercase tracking-[0.5em] text-white/30 mb-2">System.Variables</h2>
                <h1 className="text-5xl md:text-8xl font-black tracking-tighter leading-none text-kinetic">Kernel<span className="text-toxic-lime">.</span></h1>
            </header>

            {/* Cloud Status */}
            <div className={`genz-card p-6 md:p-10 mb-8 md:mb-12 flex items-center justify-between group ${isConnected ? 'border-toxic-lime/30' : 'border-white/5'}`}>
                <div className="flex items-center gap-4 md:gap-8">
                    <div className={`w-12 h-12 md:w-20 md:h-20 rounded-2xl md:rounded-[1.5rem] flex items-center justify-center text-2xl md:text-4xl transition-all duration-700 ${isConnected ? 'bg-toxic-lime text-black' : 'bg-white/5 text-white/20 animate-pulse'}`}>
                        {isConnected ? '⚡' : '📡'}
                    </div>
                    <div>
                        <h3 className={`text-xl md:text-3xl font-black tracking-tight ${isConnected ? 'text-white' : 'text-white/40'}`}>
                            {isConnected ? 'Cloud_Live' : 'Signal_Offline'}
                        </h3>
                        {lastSyncTime && (
                            <p className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] text-white/20 mt-1">
                                {new Date(lastSyncTime).toLocaleTimeString()}
                            </p>
                        )}
                    </div>
                </div>
                {isConnected && (
                    <button onClick={disconnect} className="w-10 h-10 md:w-16 md:h-16 rounded-full border border-white/10 flex items-center justify-center text-lg md:text-2xl hover:bg-rose-500 hover:text-white transition-all">✕</button>
                )}
            </div>

            {/* Setup Form */}
            {!isConnected && (
                <section className="mb-12 md:mb-20">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/30 mb-6 ml-2 md:ml-4">Protocol_Handshake</h3>
                    <div className="genz-card p-8 md:p-12">
                        <form onSubmit={handleConnect} className="space-y-6 md:space-y-10">
                            <div className="space-y-2 md:space-y-4">
                                <label className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-white/20 ml-4 md:ml-6">OAuth_Interface_ID</label>
                                <input
                                    type="password"
                                    value={clientId}
                                    onChange={e => setClientId(e.target.value)}
                                    placeholder="client_id"
                                    className="w-full bg-black/40 border border-white/5 p-5 md:p-8 rounded-2xl md:rounded-[2rem] font-black text-xs outline-none focus:border-toxic-lime transition-all"
                                    required
                                />
                            </div>
                            <div className="space-y-2 md:space-y-4">
                                <label className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-white/20 ml-4 md:ml-6">Spreadsheet_ID</label>
                                <input
                                    type="text"
                                    value={spreadsheetId}
                                    onChange={e => setSpreadsheetId(e.target.value)}
                                    placeholder="sheet_id"
                                    className="w-full bg-black/40 border border-white/5 p-5 md:p-8 rounded-2xl md:rounded-[2rem] font-black text-xs outline-none focus:border-toxic-lime transition-all"
                                    required
                                />
                            </div>
                            {connectionError && (
                                <div className="p-4 md:p-6 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-[8px] md:text-[10px] font-black uppercase tracking-widest text-center">
                                    Error: {connectionError}
                                </div>
                            )}
                            <button type="submit" className="genz-btn genz-btn-primary w-full py-6 md:py-8 text-lg" disabled={isConnecting}>
                                {isConnecting ? 'SYNCING...' : 'INITIATE_HANDSHAKE'}
                            </button>
                        </form>
                    </div>
                </section>
            )}

            {/* Global Kernel Settings */}
            <div className="grid grid-cols-2 gap-4 md:gap-6 mb-12 md:mb-20">
                <Link to="/categories" className="genz-card p-6 md:p-8 flex flex-col justify-between group no-underline transition-all">
                    <span className="text-3xl md:text-4xl">🏷️</span>
                    <div className="mt-4 md:mt-8">
                        <p className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-1">Architecture</p>
                        <p className="text-base md:text-xl font-black text-white group-hover:text-toxic-lime transition-colors">Taxonomy</p>
                    </div>
                </Link>
                <div className="genz-card p-6 md:p-8 flex flex-col justify-between group transition-all">
                    <span className="text-3xl md:text-4xl">{isInstalled ? '📱' : '🚀'}</span>
                    <div className="mt-4 md:mt-8">
                        <p className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-1">Deployment</p>
                        <p className="text-base md:text-xl font-black text-white">{isInstalled ? 'Standalone' : 'Browser'}</p>
                    </div>
                    {!isInstalled && supportsPWA && (
                        <button onClick={installPWA} className="mt-4 text-[9px] font-black text-toxic-lime uppercase tracking-widest border border-toxic-lime/20 py-2 rounded-full">Boostrap_PWA</button>
                    )}
                </div>
            </div>

            {/* Destruction Zone */}
            <div className="genz-card p-8 md:p-12 border-rose-500/20 bg-rose-500/5 text-center">
                <h3 className="text-lg md:text-xl font-black text-rose-500 mb-3 md:mb-4 uppercase tracking-tighter">Vaporize_Kernel</h3>
                <p className="text-[9px] md:text-[10px] font-black text-white/20 uppercase tracking-[0.2em] mb-8 md:mb-10 max-w-[280px] md:max-w-sm mx-auto leading-loose">
                    This will erase all local fingerprints.
                    The cloud persists, but the link will be severed.
                </p>
                <button onClick={handleClearData} className="w-full py-5 md:py-6 rounded-full border border-rose-500/20 text-rose-500 text-[10px] font-black uppercase tracking-[0.4em] hover:bg-rose-500 hover:text-white transition-all">
                    Execute_Purge
                </button>
            </div>

            <p className="text-[8px] font-black uppercase tracking-[0.8em] text-white/5 text-center mt-20">Antigravity.OS.CORE.v1.7.0</p>
        </motion.div>
    );
};

export default Settings;
