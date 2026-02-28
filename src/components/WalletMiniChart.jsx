import React from 'react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    ResponsiveContainer,
    Tooltip,
} from 'recharts';

/**
 * Custom tooltip for Recharts - declared outside render to avoid react-hooks/static-components.
 */
const CustomTooltip = ({ active, payload, showTooltip }) => {
    if (!active || !payload?.length || !showTooltip) return null;
    const p = payload[0]?.payload;
    if (!p) return null;
    return (
        <div className="px-3 py-2 rounded-xl bg-black/80 backdrop-blur-sm border border-white/10 text-[10px] font-bold">
            <div className="text-emerald-400">In: ₹{(p.income || 0).toLocaleString()}</div>
            <div className="text-rose-400">Out: ₹{(p.expense || 0).toLocaleString()}</div>
        </div>
    );
};

/**
 * Compact sparkline-style chart for wallet cards.
 * Shows income (green) and expense (red) trend over the last N days.
 * Handles empty states and zero data gracefully.
 */
const WalletMiniChart = ({ data, height = 56, showTooltip = true }) => {
    const hasData = data?.some((d) => d.income > 0 || d.expense > 0);
    const maxVal = data?.reduce(
        (max, d) => Math.max(max, d.income, d.expense),
        1
    );

    if (!data || data.length === 0) {
        return (
            <div
                className="w-full rounded-lg bg-canvas-subtle/50 flex items-center justify-center text-[9px] font-bold text-text-muted"
                style={{ height }}
            >
                No activity
            </div>
        );
    }

    return (
        <div className="w-full" style={{ height }}>
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                    data={data}
                    margin={{ top: 4, right: 4, left: 4, bottom: 0 }}
                >
                    <defs>
                        <linearGradient id="miniIn" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                            <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="miniOut" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.4} />
                            <stop offset="100%" stopColor="#f43f5e" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 8, fill: 'rgba(255,255,255,0.3)' }}
                    />
                    <YAxis
                        hide
                        domain={[0, hasData ? maxVal * 1.1 : 1]}
                    />
                    {showTooltip && (
                        <Tooltip
                            content={<CustomTooltip showTooltip={showTooltip} />}
                            cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }}
                        />
                    )}
                    <Area
                        type="monotone"
                        dataKey="income"
                        stroke="#10b981"
                        strokeWidth={1.5}
                        fill="url(#miniIn)"
                    />
                    <Area
                        type="monotone"
                        dataKey="expense"
                        stroke="#f43f5e"
                        strokeWidth={1.5}
                        fill="url(#miniOut)"
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
};

export default React.memo(WalletMiniChart);
