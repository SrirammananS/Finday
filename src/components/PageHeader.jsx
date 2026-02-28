import React from 'react';

/**
 * Unified page header - consistent section badge, title, subtitle across all tabs.
 * Enforces typography scale: badge (10px), title (xl/2xl), subtitle (10px).
 */
const PageHeader = ({
  badge,
  title,
  subtitle,
  icon: Icon,
  iconBg = 'bg-primary/10',
  iconColor = 'text-primary',
  actions,
  className = '',
}) => {
  return (
    <header className={`page-header mb-8 md:mb-10 ${className}`}>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6">
        <div className="flex items-center gap-3">
          {Icon && (
            <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center border border-card-border ${iconBg} ${iconColor}`}>
              <Icon size={20} strokeWidth={2} />
            </div>
          )}
          <div>
            {badge && (
              <span className="page-badge block mb-1">{badge}</span>
            )}
            <h1 className="page-title">{title}</h1>
            {subtitle && (
              <p className="page-subtitle">{subtitle}</p>
            )}
          </div>
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>
    </header>
  );
};

export default PageHeader;
