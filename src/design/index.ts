/**
 * Design System — Barrel Export
 *
 * Import everything from one place:
 *   import { colors, typography, spacing, radius, touchTarget, ThemeProvider, useTheme } from 'src/design';
 */

export { colors } from './colors';
export type { ColorMode } from './colors';

export { typography } from './typography';

export { spacing, radius, touchTarget } from './spacing';

export { ThemeProvider, useTheme } from './ThemeContext';
