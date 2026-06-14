/**
 * Design System — Theme Context
 *
 * Provides the current visual mode (dark | cyberpunk) to all components.
 * Components consume color tokens via `useTheme()` and automatically
 * adjust to the current mode.
 *
 * Mode selection:
 *   - Battle, dungeon, raid, boss screens → 'dark'
 *   - Hub, narrative, shop, gear, character, profile screens → 'cyberpunk'
 *   - Draft, reward screens → 'dark' (high-focus moments)
 *
 * Usage:
 *   const { mode, colors } = useTheme();
 *   backgroundColor: colors.background.primary
 */

import React, { createContext, useContext, useMemo, type ReactNode } from 'react';
import { colors as colorTokens, type ColorMode } from './colors';

// ─── Context Type ────────────────────────────────────────────────────────────
interface ThemeContextValue {
  /** Current visual mode */
  mode: ColorMode;
  /** Color tokens for the current mode */
  colors: typeof colorTokens.dark | typeof colorTokens.parchment;
  /** Full color token set (for mode-independent tokens like accent) */
  allColors: typeof colorTokens;
  /** Whether currently in dark mode */
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

// ─── Provider ────────────────────────────────────────────────────────────────
interface ThemeProviderProps {
  mode: ColorMode;
  children: ReactNode;
}

export function ThemeProvider({ mode, children }: ThemeProviderProps) {
  const value = useMemo<ThemeContextValue>(() => {
    const modeColors = mode === 'dark' ? colorTokens.dark : mode === 'cyberpunk' ? colorTokens.cyberpunk : colorTokens.parchment;
    return {
      mode,
      colors: modeColors,
      allColors: colorTokens,
      isDark: mode === 'dark' || mode === 'cyberpunk',
    };
  }, [mode]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

// ─── Hook ────────────────────────────────────────────────────────────────────
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    // Fallback to cyberpunk if no provider (new default for all screens)
    return {
      mode: 'cyberpunk',
      colors: colorTokens.cyberpunk,
      allColors: colorTokens,
      isDark: true,
    };
  }
  return ctx;
}

// Re-export ColorMode for convenience
export type { ColorMode };
