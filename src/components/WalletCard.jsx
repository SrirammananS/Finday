import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Activity } from 'lucide-react';
import { useWalletChartData } from '../hooks/useWalletChartData';
import WalletMiniChart from './WalletMiniChart';
import { formatCurrency } from '../utils/formatUtils';
import { getAccountIcon } from '../utils/accountUtils';

const WalletCard = React.memo(({ account, transactions, compact = false, linkedCCPaymentTxnIds }) => {
    const chartData = useWalletChartData(transactions, account.id, 14, null, null, linkedCCPaymentTxnIds);
    const isCredit = account.type === 'credit';
    const limit = account.limit || 100000;
    const utilization = isCredit ? (Math.abs(account.balance) / limit) * 100 : 0;

    return (
        <motion.div whileHover={{ y: -4, transition: { duration: 0.2 } }} className={compact ? 'min-w-0' : 'flex-none'}>
        <Link
            to={`/accounts/${account.id}`}
            className={`relative block p-5 bg-card border-2 border-dashed border-card-border rounded-[2rem] no-underline hover:bg-canvas-elevated hover:border-primary/40 transition-all group flex flex-col justify-between overflow-hidden ${
                compact ? 'min-h-[13rem] w-full' : 'w-40 h-52'
            }`}
        >
            <div className="absolute top-0 right-0 p-3 opacity-[0.03] -rotate-12 translate-x-2 translate-y-[-10%] group-hover:scale-110 transition-transform pointer-events-none">
                <Activity size={80} />
            </div>

            <div className="flex justify-between items-start relative z-10">
                <div className="w-10 h-10 rounded-2xl bg-canvas-subtle border border-card-border flex items-center justify-center text-lg group-hover:border-primary/30 transition-all shadow-sm">
                    {getAccountIcon(account)}
                </div>
                <span className="text-xs font-black uppercase tracking-widest text-text-muted opacity-60 bg-canvas-subtle px-2 py-1 rounded-lg">
                    {account.type}
                </span>
            </div>

            <div className="relative z-10 flex-1 min-h-0 flex flex-col gap-2">
                <span className="text-xs font-black uppercase text-text-muted tracking-widest block truncate">
                    {account.name}
                </span>
                <p className={`text-xl font-black truncate tabular-nums leading-none ${(account.balance ?? 0) < 0 ? 'text-rose-500' : 'text-text-main'}`}>
                    {formatCurrency(account.balance ?? 0, { useAbs: false })}
                </p>

                {/* Mini chart - income/expense trend (unique chartId avoids SVG gradient id clash when multiple cards) */}
                <div className="flex-1 min-h-[56px] -mx-1">
                    <WalletMiniChart data={chartData} height={52} showTooltip={true} chartId={account.id} />
                </div>

                {isCredit && (
                    <div className="h-1.5 w-full bg-canvas-subtle rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full ${utilization > 70 ? 'bg-rose-500' : utilization > 40 ? 'bg-yellow-500' : 'bg-primary'} shadow-[0_0_8px_currentColor]`}
                            style={{ width: `${Math.min(utilization, 100)}%` }}
                        />
                    </div>
                )}
            </div>
        </Link>
        </motion.div>
    );
});

WalletCard.displayName = 'WalletCard';

export default WalletCard;
