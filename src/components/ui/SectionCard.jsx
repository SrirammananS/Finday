import React from 'react';
import { motion } from 'framer-motion';

/**
 * Unified section wrapper - consistent padding, border, spacing.
 * Use for Cash Flow, Recent Activity, Financial Insights, etc.
 */
const SectionCard = ({
  title,
  subtitle,
  action,
  children,
  className = '',
  noPadding = false,
}) => {
  return (
    <section className={`rounded-2xl border border-card-border bg-card/60 backdrop-blur-sm overflow-hidden ${className}`}>
      {(title || action) && (
        <div className="flex items-end justify-between gap-4 px-4 md:px-6 py-4 border-b border-card-border/50">
          <div>
            {title && (
              <h3 className="section-label flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
          {action}
        </div>
      )}
      <div className={noPadding ? '' : 'p-4 md:p-6'}>{children}</div>
    </section>
  );
};

export default SectionCard;
