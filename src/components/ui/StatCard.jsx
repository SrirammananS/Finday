import React from 'react';
import { motion } from 'framer-motion';

/**
 * Reusable stat card for metrics display across Dashboard, Insights, Accounts, etc.
 * Feature-rich yet minimal - clear hierarchy, semantic colors, accessible.
 */
const StatCard = ({
  label,
  value,
  subtext,
  icon: Icon,
  variant = 'default', // default | income | expense | neutral | primary
  className = '',
  onClick,
  children,
}) => {
  const variants = {
    default: 'bg-card border-card-border',
    income: 'bg-emerald-500/5 border-emerald-500/20',
    expense: 'bg-rose-500/5 border-rose-500/20',
    neutral: 'bg-canvas-subtle/50 border-card-border',
    primary: 'bg-primary/5 border-primary/20',
  };

  const iconColors = {
    default: 'text-text-muted',
    income: 'text-emerald-500',
    expense: 'text-rose-500',
    neutral: 'text-text-muted',
    primary: 'text-primary',
  };

  const valueColors = {
    default: 'text-text-main',
    income: 'text-emerald-400',
    expense: 'text-rose-400',
    neutral: 'text-text-main',
    primary: 'text-primary',
  };

  const Wrapper = onClick ? motion.button : motion.div;
  const wrapperProps = onClick
    ? { whileTap: { scale: 0.98 }, onClick, className: 'text-left w-full' }
    : {};

  return (
    <Wrapper
      {...wrapperProps}
      className={`p-4 md:p-6 rounded-2xl border transition-all hover:border-primary/20 ${variants[variant]} ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted block mb-1">
            {label}
          </span>
          <p className={`text-lg md:text-xl font-black tabular-nums leading-tight truncate ${valueColors[variant]}`}>
            {value}
          </p>
          {subtext && (
            <p className="text-[10px] font-semibold text-text-muted/70 mt-1 truncate">{subtext}</p>
          )}
        </div>
        {Icon && (
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconColors[variant]}`}
          >
            <Icon size={20} strokeWidth={2} />
          </div>
        )}
      </div>
      {children}
    </Wrapper>
  );
};

export default StatCard;
