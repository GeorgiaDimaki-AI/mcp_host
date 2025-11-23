/**
 * ThemeToggle Component
 *
 * Three-state theme toggle: light / system / dark
 * Features:
 * - Icon-based UI (sun / monitor / moon)
 * - Keyboard accessible
 * - Tooltip with current theme info
 * - Smooth transitions
 * - Uses semantic color tokens for theme support
 */

import React, { useState } from 'react';
import { useTheme, ThemeMode } from '../../contexts/ThemeContext';

export function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [showTooltip, setShowTooltip] = useState(false);

  const themes: { mode: ThemeMode; icon: React.ReactNode; label: string }[] = [
    {
      mode: 'light',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 3v1m0 16v1m9-9h-1m-16 0H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
      ),
      label: 'Light',
    },
    {
      mode: 'system',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
      ),
      label: 'System',
    },
    {
      mode: 'dark',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
          />
        </svg>
      ),
      label: 'Dark',
    },
  ];

  const currentThemeIndex = themes.findIndex((t) => t.mode === theme);
  const nextTheme = themes[(currentThemeIndex + 1) % themes.length];

  const handleToggleTheme = () => {
    setTheme(nextTheme.mode);
  };

  const getTooltipText = () => {
    if (theme === 'system') {
      return `System (${resolvedTheme})`;
    }
    return themes[currentThemeIndex].label;
  };

  return (
    <div className="relative">
      <button
        onClick={handleToggleTheme}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onFocus={() => setShowTooltip(true)}
        onBlur={() => setShowTooltip(false)}
        className="p-2 rounded-lg bg-background-secondary text-text-secondary
                   hover:bg-surface-hover transition-all duration-200
                   focus:outline-none focus:ring-2 focus:ring-primary-500
                   focus:ring-offset-2 focus:ring-offset-background-primary
                   border border-border active:scale-95"
        title={`Current theme: ${getTooltipText()}. Click to switch to ${nextTheme.label}`}
        aria-label={`Theme selector. Current: ${getTooltipText()}. Click to cycle through themes.`}
      >
        {themes[currentThemeIndex].icon}
      </button>

      {/* Tooltip */}
      {showTooltip && (
        <div
          className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2
                     px-3 py-1.5 bg-background-secondary border border-border
                     text-text-primary text-sm rounded-md shadow-lg
                     whitespace-nowrap pointer-events-none z-50"
          role="tooltip"
        >
          {getTooltipText()}
          <div
            className="absolute top-full left-1/2 -translate-x-1/2
                       border-4 border-transparent border-t-background-secondary"
          />
        </div>
      )}
    </div>
  );
}
