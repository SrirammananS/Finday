import React, { useState } from 'react';

/** Shared emoji grid for account/category icons. value/onChange for controlled use; optional defaultByType for account type. */
const EMOJI_PRESETS = [
  '🏦', '💳', '💵', '💰', '💎', '📦', '🛒', '🍽️', '🚗', '⛽', '🏠', '📱', '🎬', '✈️', '🏥', '📚', '🎁', '💸', '🔒', '⭐', '🏷️', '📊', '💼', '🌐', '🛍️', '☕', '🧾', '📈', '💹', '🏛️',
];

export default function IconPicker({ value, onChange, label = 'Icon', defaultByType }) {
  const [custom, setCustom] = useState('');
  const displayValue = value || defaultByType || '📦';

  return (
    <div className="space-y-2">
      {label && (
        <label className="text-[10px] font-black uppercase tracking-[0.3em] text-text-muted block">{label}</label>
      )}
      <div className="flex flex-wrap gap-2">
        {EMOJI_PRESETS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => onChange(emoji)}
            className={`w-10 h-10 rounded-xl border text-xl flex items-center justify-center transition-all ${
              displayValue === emoji
                ? 'bg-primary border-primary text-primary-foreground'
                : 'bg-canvas-subtle border-card-border hover:border-primary/50'
            }`}
          >
            {emoji}
          </button>
        ))}
        <div className="flex items-center gap-1">
          <input
            type="text"
            placeholder="Custom"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            onBlur={() => { if (custom.trim()) { onChange(custom.trim()); setCustom(''); } }}
            className="w-14 h-10 rounded-xl border border-card-border bg-canvas-subtle px-2 text-center text-lg outline-none focus:border-primary"
            maxLength={4}
          />
        </div>
      </div>
      {displayValue && (
        <p className="text-xs text-text-muted">Selected: <span className="text-2xl">{displayValue}</span></p>
      )}
    </div>
  );
}
