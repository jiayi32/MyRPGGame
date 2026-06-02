/**
 * Design System — Color Tokens
 *
 * Dual-mode palette supporting dark mode (combat/dungeon) and parchment mode (hub/narrative).
 * All colors are referenced by semantic token name, never by raw hex in components.
 *
 * Usage:
 *   import { colors } from 'src/design';
 *   backgroundColor: colors.dark.background.primary
 *
 * ThemeContext provides the current mode (dark | parchment) automatically.
 */

// ─── Dark Mode (Combat, Dungeon, Boss screens) ──────────────────────────────
const dark = {
  background: {
    primary: '#1a1410',    // Battle screen background
    secondary: '#231d16',  // Card backgrounds on dark
    tertiary: '#2d261e',   // Elevated surfaces (modals, tooltips)
  },
  text: {
    primary: '#f0e8d8',    // Primary text on dark
    secondary: '#b8a890',  // Secondary/muted text on dark
    dim: '#706858',        // Disabled/hint text on dark
  },
  border: {
    default: '#3d3628',    // Card borders on dark
    active: '#8b7355',     // Active/selected borders on dark
  },
} as const;

// ─── Parchment Mode (Hub, Narrative, Shop, Profile screens) ──────────────────
const parchment = {
  background: {
    primary: '#f5f0e8',    // Hub/main screen background
    secondary: '#fefcf7',  // Card backgrounds on parchment
    tertiary: '#ede4d3',   // Elevated surfaces on parchment
  },
  text: {
    primary: '#2b1f10',    // Primary text on parchment
    secondary: '#6b5d4a',  // Secondary/muted text on parchment
    dim: '#a89880',        // Disabled/hint text on parchment
  },
  border: {
    default: '#d8cdbb',    // Card borders on parchment
    active: '#8b6914',     // Active/selected borders on parchment
  },
} as const;

// ─── Accent & Feedback Colors (mode-independent) ─────────────────────────────
const accent = {
  gold: '#c8a040',        // Primary actions, rare items, CT ready pulse
  crimson: '#c04040',     // Damage, enemy HP, danger, destructive
  emerald: '#3a8a5a',     // Healing, player HP, buffs, success
  sapphire: '#4070c0',    // MP/mana, magic skills, shield, info
  amethyst: '#7040a0',    // Anomaly, corruption, void, ultimate skills
  amber: '#d08030',       // Crit damage, warnings, elite markers
  frost: '#60a0c0',       // Frost/ice skills, slow/control effects
  shadow: '#504060',      // Shadow/umbral skills, stealth
} as const;

// ─── Augment Tier Colors ─────────────────────────────────────────────────────
const augmentTier = {
  bronze: {
    bg: '#fdf2e0',
    text: '#8b6914',
    border: '#c8a040',
  },
  silver: {
    bg: '#eceff1',
    text: '#546e7a',
    border: '#90a4ae',
  },
  gold: {
    bg: '#fff8e1',
    text: '#b8860b',
    border: '#ffd54f',
  },
  prismatic: {
    bg: '#f3e5f5',
    text: '#7b1fa2',
    border: '#ce93d8',
  },
} as const;

// ─── Augment Category Colors ─────────────────────────────────────────────────
const augmentCategory = {
  neutral: {
    bg: '#f5f5f5',
    border: '#9e9e9e',
    text: '#555555',
  },
  positive: {
    bg: '#e8f5e9',
    border: '#4a7a3a',
    text: '#2e5d24',
  },
  sacrificial: {
    bg: '#fdecea',
    border: '#c0392b',
    text: '#8b1a12',
  },
} as const;

// ─── Room Type & Stage Colors ────────────────────────────────────────────────
const roomType = {
  normal:      { bg: '#f2f4f8', border: '#c2cad9', text: '#384860' },
  elite:       { bg: '#fee9df', border: '#d77b50', text: '#8b3516' },
  event:       { bg: '#efe8ff', border: '#8f79d6', text: '#48308e' },
  treasure:    { bg: '#fff2d6', border: '#d4a248', text: '#805407' },
  rest:        { bg: '#e9f7eb', border: '#65a974', text: '#1f6433' },
  merchant:    { bg: '#e4f4ff', border: '#4d91c4', text: '#165984' },
  anomaly:     { bg: '#f8e5ff', border: '#b76dd1', text: '#6d2e8f' },
  miniBoss:    { bg: '#ffe6dc', border: '#d1653a', text: '#8d2d10' },
  gateBoss:    { bg: '#e8f6ed', border: '#5ea577', text: '#215f39' },
  counterBoss: { bg: '#ffe4e4', border: '#c75d5d', text: '#7b1f1f' },
} as const;

// ─── Forecast Intent Colors (Battle CT Timeline) ─────────────────────────────
const intent = {
  player:  { bg: '#dff2e5', fg: '#1f5f3a' },
  burst:   { bg: '#fde3e3', fg: '#8b1a1a' },
  sustain: { bg: '#e4f2e7', fg: '#245b2f' },
  control: { bg: '#e3ecfb', fg: '#2b4f93' },
  summon:  { bg: '#efe4fb', fg: '#5d3a8f' },
  basic:   { bg: '#eceef5', fg: '#465078' },
  unknown: { bg: '#f1f2f7', fg: '#606a88' },
} as const;

// ─── Skill Slot Colors (SkillDraft) ──────────────────────────────────────────
const skillSlot = {
  lineage:  { bg: '#e8f0ff', border: '#7ea3cc', text: '#244d88' },
  synergy:  { bg: '#fff3d6', border: '#d4a248', text: '#805407' },
  wildcard: { bg: '#f8e5ff', border: '#b76dd1', text: '#6d2e8f' },
} as const;

// ─── Status Effect Colors ────────────────────────────────────────────────────
const statusEffect = {
  positive: { bg: '#e8f5e9', text: '#2e5d24' },
  negative: { bg: '#fdecea', text: '#8b1a12' },
  neutral:  { bg: '#e3ecfb', text: '#2b4f93' },
} as const;

// ─── Button Colors ───────────────────────────────────────────────────────────
const button = {
  primary: {
    bg: accent.gold,
    border: '#a08030',
    text: '#1a1410',
    disabledBg: '#e6e0d4',
    disabledBorder: '#c8c0b0',
    disabledText: '#8a8074',
  },
  secondary: {
    bg: 'transparent',
    border: accent.gold,
    text: accent.gold,
  },
  destructive: {
    bg: accent.crimson,
    border: '#7a3030',
    text: '#ffffff',
    disabledBg: '#e6e0d4',
    disabledBorder: '#c8c0b0',
    disabledText: '#8a8074',
  },
} as const;

// ─── Damage Popup Colors ─────────────────────────────────────────────────────
const damagePopup = {
  damage: '#c04040',
  heal: '#3a8a5a',
  crit: '#ff7030',
  mana: '#4070c0',
  shield: '#60a0c0',
} as const;

// ─── Tab Bar ─────────────────────────────────────────────────────────────────
const tabBar = {
  background: dark.background.secondary,
  active: accent.gold,
  inactive: '#706858',
  border: dark.border.default,
} as const;

// ─── Export ──────────────────────────────────────────────────────────────────
export const colors = {
  dark,
  parchment,
  accent,
  augmentTier,
  augmentCategory,
  roomType,
  intent,
  skillSlot,
  statusEffect,
  button,
  damagePopup,
  tabBar,
} as const;

export type ColorMode = 'dark' | 'parchment';
