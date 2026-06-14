/**
 * Design System — Color Tokens
 *
 * Three-mode palette:
 *   - dark (combat/dungeon/raid screens)
 *   - cyberpunk (hub, narrative, shop, gear, character, profile screens) — PRIMARY
 *   - parchment (DEPRECATED — legacy fantasy, being phased out)
 *
 * Neon accents drive the sci-fi cyberpunk aesthetic:
 *   neon-cyan: #00ffff   — primary accent, active elements, CT ready
 *   neon-magenta: #ff00ff — secondary accent, anomalies, void
 *   neon-green: #00ff88   — healing, success, active status
 *   neon-red: #ff4466     — damage, danger, enemy HP
 *   terminal-amber: #ffb000 — warnings, narrative, loot
 *
 * All colors are referenced by semantic token name, never by raw hex in components.
 *
 * Usage:
 *   import { colors } from 'src/design';
 *   backgroundColor: colors.cyberpunk.background.primary
 *
 * ThemeContext provides the current mode (dark | cyberpunk) automatically.
 */

// ─── Dark Mode (Combat, Dungeon, Boss screens) ──────────────────────────────
const dark = {
  background: {
    primary: '#0a0a1a',    // Battle screen background — unified with cyberpunk
    secondary: '#12122a',  // Card backgrounds on dark
    tertiary: '#1a1a3a',   // Elevated surfaces (modals, tooltips)
  },
  text: {
    primary: '#ffffff',    // Primary text on dark
    secondary: '#aabbcc',  // Secondary/muted text on dark
    dim: '#667788',        // Disabled/hint text on dark
  },
  border: {
    default: 'rgba(0,255,255,0.1)',    // Card borders on dark
    active: 'rgba(0,255,255,0.3)',     // Active/selected borders on dark
  },
} as const;

// ─── Cyberpunk Mode (Hub, Narrative, Shop, Gear, Character, Profile) ────────
const cyberpunk = {
  background: {
    primary: '#0a0a1a',              // Main screen background
    secondary: '#12122a',            // Card backgrounds
    tertiary: '#1a1a3a',             // Elevated surfaces
    surface: 'rgba(0,255,255,0.05)', // Subtle cyan-tinted surface
    overlay: 'rgba(0,0,0,0.7)',      // Modal overlay
  },
  text: {
    primary: '#ffffff',              // Primary text
    secondary: '#aabbcc',            // Secondary/muted text
    dim: '#667788',                  // Disabled/hint text
  },
  border: {
    default: 'rgba(0,255,255,0.1)',  // Card borders
    active: 'rgba(0,255,255,0.3)',   // Active/selected borders
    glow: 'rgba(0,255,255,0.5)',     // Glowing borders (rare items, CT pulse)
  },
} as const;

// ─── Parchment Mode (DEPRECATED — legacy fantasy, retained for reference) ───
/** @deprecated Use `cyberpunk` mode instead. Retained until all screens are migrated. */
const parchment = {
  background: {
    primary: '#f5f0e8',
    secondary: '#fefcf7',
    tertiary: '#ede4d3',
  },
  text: {
    primary: '#2b1f10',
    secondary: '#6b5d4a',
    dim: '#a89880',
  },
  border: {
    default: '#d8cdbb',
    active: '#8b6914',
  },
} as const;

// ─── Neon Accent Colors (sci-fi cyberpunk) ───────────────────────────────────
const neon = {
  cyan: '#00ffff',        // Primary accent — active elements, CT ready, selected
  magenta: '#ff00ff',     // Secondary accent — anomalies, void, ultimate skills
  green: '#00ff88',       // Healing, success, active status, HP
  red: '#ff4466',         // Damage, danger, enemy HP, destructive actions
  amber: '#ffb000',       // Warnings, narrative, loot, crit damage
  white: '#e0e8ff',       // Cold white — text highlights
} as const;

// ─── Accent & Feedback Colors (mode-independent, legacy + sci-fi hybrid) ─────
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

// ─── Gear Rarity Colors ──────────────────────────────────────────────────────
const rarity = {
  common:    { bg: 'rgba(136,153,153,0.1)', border: '#889999', text: '#889999' },
  rare:      { bg: 'rgba(68,136,255,0.1)', border: '#4488ff', text: '#4488ff' },
  epic:      { bg: 'rgba(204,68,255,0.1)', border: '#cc44ff', text: '#cc44ff' },
  legendary: { bg: 'rgba(255,170,0,0.1)',  border: '#ffaa00', text: '#ffaa00' },
  mythic:    { bg: 'rgba(255,68,102,0.1)', border: '#ff4466', text: '#ff4466' },
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
    bg: neon.cyan,
    border: 'rgba(0,255,255,0.5)',
    text: '#0a0a1a',
    disabledBg: 'rgba(0,255,255,0.1)',
    disabledBorder: 'rgba(0,255,255,0.15)',
    disabledText: '#667788',
  },
  secondary: {
    bg: 'transparent',
    border: 'rgba(0,255,255,0.3)',
    text: neon.cyan,
  },
  destructive: {
    bg: neon.red,
    border: 'rgba(255,68,102,0.5)',
    text: '#ffffff',
    disabledBg: 'rgba(255,68,102,0.1)',
    disabledBorder: 'rgba(255,68,102,0.15)',
    disabledText: '#667788',
  },
} as const;

// ─── Damage Popup Colors ─────────────────────────────────────────────────────
const damagePopup = {
  damage: neon.red,
  heal: neon.green,
  crit: neon.amber,
  mana: '#4488ff',
  shield: neon.cyan,
} as const;

// ─── Tab Bar ─────────────────────────────────────────────────────────────────
const tabBar = {
  background: cyberpunk.background.secondary,
  active: neon.cyan,
  inactive: '#667788',
  border: 'rgba(0,255,255,0.1)',
} as const;

// ─── ColorMode Type ──────────────────────────────────────────────────────────
export type ColorMode = 'dark' | 'cyberpunk' | 'parchment';

// ─── Export ──────────────────────────────────────────────────────────────────
export const colors = {
  dark,
  cyberpunk,
  /** @deprecated Use `cyberpunk` mode instead. */
  parchment,
  neon,
  accent,
  rarity,
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
