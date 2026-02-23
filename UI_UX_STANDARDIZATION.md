# UI/UX Standardization Guide

## Overview
This document outlines the standardized UI/UX system for LAKSH Finance app, ensuring consistency across PWA and Android APK.

---

## 🎨 Theme System

### Storage Key
- **Standard Key**: `laksh_theme` (migrated from `finday_theme`)
- **Values**: `'dark'` | `'light'`
- **Default**: `'dark'`

### Theme Context
```javascript
// src/context/ThemeContext.jsx
const { theme, toggleTheme } = useTheme();
```

### Theme Application
- Theme is applied to `document.documentElement` via class (`dark` or `light`)
- Persisted in `localStorage` as `laksh_theme`
- Android APK injects theme preference on page load

---

## 📐 Typography System

### Font Families
- **Sans Serif**: `Urbanist` (body text)
- **Display**: `Space Grotesk`, `Syne` (headings)
- **Monospace**: `JetBrains Mono` (code/numbers)

### Font Size Scale (Standard Web Sizes)
| Size | Font Size | Usage |
|------|-----------|-------|
| `xs` | 12px (0.75rem) | Labels, badges |
| `sm` | 14px (0.875rem) | Secondary text |
| `base` | 16px (1rem) | Body text |
| `lg` | 18px (1.125rem) | Subheadings |
| `xl` | 20px (1.25rem) | Section titles |
| `2xl` | 24px (1.5rem) | Page titles |
| `3xl` | 30px (1.875rem) | Hero titles |
| `4xl` | 36px (2.25rem) | Display text |

### Line Heights
- **Tight**: `1.2` (headings)
- **Normal**: `1.5` (body text)
- **Relaxed**: `1.6` (paragraphs)
- **Loose**: `1.8` (long-form content)

### Letter Spacing
- **Tight**: `-0.04em` (large headings)
- **Normal**: `-0.02em` (headings)
- **Wide**: `0.05em` (uppercase labels)
- **Wider**: `0.1em` (buttons)
- **Widest**: `0.15em` (button text)

### Usage Examples
```jsx
// Headings (standard web sizes)
<h1 className="text-3xl font-black tracking-tight">Title</h1> {/* 30px */}
<h2 className="text-2xl font-extrabold tracking-normal">Section</h2> {/* 24px */}
<h3 className="text-xl font-bold">Subsection</h3> {/* 20px */}

// Body text
<p className="text-base leading-relaxed">Paragraph text</p> {/* 16px */}
<span className="text-sm text-text-muted">Secondary info</span> {/* 14px */}

// Labels
<span className="text-xs font-bold uppercase tracking-widest">Label</span> {/* 12px */}
```

---

## 🎨 Color System

### Dark Mode (Default)
```css
--primary: #CCFF00;              /* Neon lime */
--primary-foreground: #000000;
--canvas: #050505;              /* Deep black */
--card: rgba(20, 20, 22, 0.3);  /* Glass card */
--text-main: #F5F5F7;           /* Off-white */
--text-muted: rgba(245, 245, 247, 0.55);
```

### Light Mode
```css
--primary: #8B5CF6;             /* Electric violet */
--primary-foreground: #FFFFFF;
--canvas: #FDF4FF;              /* Soft pink */
--card: rgba(255, 240, 245, 0.95);
--text-main: #1F0936;           /* Dark purple */
--text-muted: #7C3AED;          /* Purple */
```

### Accent Colors
- **Violet**: `#8B5CF6`
- **Cyan**: `#06B6D4`
- **Rose**: `#F43F5E`
- **Amber**: `#F59E0B`
- **Emerald** (Income): `#10B981`
- **Rose** (Expense): `#F43F5E`

---

## 📦 Component Standards

### Cards
```jsx
<div className="modern-card p-6">
  {/* Content */}
</div>
```

**Properties**:
- Rounded: `1.5rem` (mobile), `2rem` (desktop)
- Border: `1px solid var(--card-border)`
- Backdrop blur: `20px saturate(180%)`
- Hover: Lift `-2px`, glow effect

### Buttons
```jsx
// Primary
<button className="modern-btn modern-btn-primary">
  Action
</button>

// Ghost
<button className="modern-btn modern-btn-ghost">
  Secondary
</button>

// Neon
<button className="modern-btn modern-btn-neon">
  Accent
</button>
```

**Properties**:
- Font size: `0.875rem` (14px - standard web button size)
- Padding: `px-5 md:px-6 py-3.5 md:py-4`
- Border radius: `rounded-full`
- Tracking: `0.15em`
- Uppercase

### Inputs
```jsx
<input className="input-modern" />
```

**Properties**:
- Background: `var(--canvas-subtle)`
- Border: `1px solid var(--card-border)`
- Padding: `py-3 px-4`
- Border radius: `rounded-xl`
- Focus: Primary glow

---

## 📏 Spacing System

### Standard Spacing
- **xs**: `0.25rem` (4px)
- **sm**: `0.5rem` (8px)
- **md**: `1rem` (16px)
- **lg**: `1.5rem` (24px)
- **xl**: `2rem` (32px)
- **2xl**: `3rem` (48px)
- **3xl**: `4rem` (64px)

### Component Spacing
- **Card padding**: `p-6 md:p-8`
- **Section margin**: `mb-12`
- **Gap between items**: `gap-4` to `gap-6`

---

## 🎭 Animation Standards

### Transitions
- **Spring**: `cubic-bezier(0.23, 1, 0.32, 1)`
- **Smooth**: `cubic-bezier(0.4, 0, 0.2, 1)`
- **Bounce**: `cubic-bezier(0.68, -0.55, 0.265, 1.55)`

### Durations
- **Fast**: `0.15s` (press)
- **Normal**: `0.3s` (hover)
- **Slow**: `0.5s` (card transitions)

### Hover Effects
- **Lift**: `translateY(-2px)` to `translateY(-4px)`
- **Scale**: `scale(1.05)` to `scale(1.1)`
- **Glow**: Primary color shadow

---

## 📱 Responsive Breakpoints

### Font Sizes
- **Base font**: `16px` (standard web size, consistent across all devices)
- **No responsive scaling** - uses fixed standard web sizes for consistency

### Spacing & Layout
- **Mobile**: `p-6`, `rounded-1.5rem`
- **Tablet**: `p-7`, `rounded-1.75rem`  
- **Desktop**: `p-8`, `rounded-2rem`

---

## ✅ Checklist for Components

When creating/updating components, ensure:

- [ ] Uses standardized font sizes (`text-xs` to `text-4xl`)
- [ ] Uses theme-aware colors (`text-text-main`, `bg-card`)
- [ ] Responsive spacing (`p-6 md:p-8`)
- [ ] Consistent border radius (`rounded-xl`, `rounded-2xl`)
- [ ] Proper line heights (`leading-tight`, `leading-relaxed`)
- [ ] Theme toggle works (dark/light)
- [ ] Hover states defined
- [ ] Accessible contrast ratios
- [ ] Mobile-first responsive design

---

## 🔧 Android APK Integration

### Theme Injection
The Android APK automatically injects theme preference on page load:

```kotlin
private fun injectThemePreference() {
    val theme = getSharedPreferences("laksh_prefs", MODE_PRIVATE)
        .getString("theme", "dark") ?: "dark"
    // Injects to WebView
}
```

### Font Rendering
- WebView respects CSS font sizes
- System font fallback for unsupported fonts
- Smooth font rendering enabled

---

## 📚 Resources

- **Typography CSS**: `src/styles/typography.css`
- **Main Styles**: `src/index.css`
- **Theme Context**: `src/context/ThemeContext.jsx`
- **Component Examples**: See `src/components/` and `src/pages/`

---

## 🎯 Best Practices

1. **Always use CSS variables** for colors (`var(--primary)`, `var(--text-main)`)
2. **Use clamp()** for responsive font sizes
3. **Test both themes** (dark and light)
4. **Mobile-first** approach
5. **Consistent spacing** using Tailwind utilities
6. **Accessible contrast** (WCAG AA minimum)
7. **Smooth animations** with proper easing
8. **Glassmorphism** for cards (backdrop blur)

---

## 📅 Last Updated
$(date)
