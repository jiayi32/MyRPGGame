/**
 * Design System — Icon Registry
 *
 * SVG-based icon system replacing emoji tab icons.
 * All icons are 24×24dp viewBox, stroke-based, designed for 1.5px stroke width.
 *
 * In v1, icons render as simple geometric SVGs. Future: load from asset files.
 * This file provides a lookup map: IconName → React component.
 *
 * Usage:
 *   import { Icon } from 'src/components/atoms/Icon';
 *   <Icon name="sword" size={24} color={colors.accent.gold} />
 */

import React from 'react';
import Svg, { Path, Circle, Rect, Line, Polygon, type SvgProps } from 'react-native-svg';
import { colors } from '../../design';

// ─── Icon Names ──────────────────────────────────────────────────────────────
export type IconName =
  // Tab bar
  | 'castle' | 'coin-sack' | 'shield' | 'crest'
  // Actions
  | 'sword' | 'close' | 'back' | 'settings' | 'info' | 'lock' | 'check'
  // Room types
  | 'battle' | 'elite' | 'event' | 'treasure' | 'rest' | 'merchant' | 'anomaly'
  | 'mini-boss' | 'gate-boss' | 'counter-boss'
  // Skill tags
  | 'burst' | 'sustain' | 'control' | 'ct-manipulation' | 'defense-break' | 'execute'
  // Elements
  | 'fire' | 'frost' | 'shadow' | 'light' | 'physical' | 'arcane'
  // Status
  | 'heart' | 'mana' | 'shield-icon' | 'skull' | 'clock'
  // Resources
  | 'gold' | 'cell';

// ─── Icon Props ──────────────────────────────────────────────────────────────
interface IconProps extends Omit<SvgProps, 'width' | 'height' | 'viewBox'> {
  name: IconName;
  size?: number;
  color?: string;
}

// ─── Individual Icon Components ──────────────────────────────────────────────

function CastleIcon({ size = 24, color = colors.accent.gold, ...props }: SvgProps & { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      <Path d="M3 21h18" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <Path d="M5 21V9l7-5 7 5v12" stroke={color} strokeWidth={1.5} strokeLinejoin="round" />
      <Rect x="9" y="14" width="6" height="7" stroke={color} strokeWidth={1.5} />
      <Path d="M9 10h2M13 10h2" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  );
}

function CoinSackIcon({ size = 24, color = colors.accent.gold, ...props }: SvgProps & { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      <Circle cx="12" cy="12" r="4" stroke={color} strokeWidth={1.5} />
      <Path d="M12 8V6M12 18v-2" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <Path d="M9 8c-3 0-5 2-5 4s2 4 5 4" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <Path d="M15 8c3 0 5 2 5 4s-2 4-5 4" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  );
}

function ShieldIcon({ size = 24, color = colors.accent.emerald, ...props }: SvgProps & { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      <Path d="M12 2L4 6v6c0 5.5 3.8 10.7 8 12 4.2-1.3 8-6.5 8-12V6l-8-4z" stroke={color} strokeWidth={1.5} strokeLinejoin="round" />
      <Path d="M9 12l2 2 4-4" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function CrestIcon({ size = 24, color = colors.accent.amethyst, ...props }: SvgProps & { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      <Polygon points="12,2 22,12 12,22 2,12" stroke={color} strokeWidth={1.5} strokeLinejoin="round" />
      <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth={1.5} />
    </Svg>
  );
}

function SwordIcon({ size = 24, color = colors.accent.crimson, ...props }: SvgProps & { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      <Path d="M14.5 17.5L16 19l4-4-1.5-1.5" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M8 8l-4 4 8 8 4-4" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <Line x1="18" y1="6" x2="6" y2="18" stroke={color} strokeWidth={1.5} />
      <Path d="M17.5 2.5L21 6" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  );
}

function CloseIcon({ size = 24, color = colors.dark.text.secondary, ...props }: SvgProps & { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      <Path d="M18 6L6 18M6 6l12 12" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  );
}

function BackIcon({ size = 24, color = colors.accent.gold, ...props }: SvgProps & { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      <Path d="M15 18l-6-6 6-6" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function LockIcon({ size = 24, color = colors.dark.text.dim, ...props }: SvgProps & { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      <Rect x="5" y="11" width="14" height="10" rx="2" stroke={color} strokeWidth={1.5} />
      <Path d="M8 11V7a4 4 0 018 0v4" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <Circle cx="12" cy="16" r="1" fill={color} />
    </Svg>
  );
}

function CheckIcon({ size = 24, color = colors.accent.emerald, ...props }: SvgProps & { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      <Path d="M5 13l4 4L19 7" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function HeartIcon({ size = 24, color = colors.accent.emerald, ...props }: SvgProps & { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      <Path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" stroke={color} strokeWidth={1.5} strokeLinejoin="round" />
    </Svg>
  );
}

function SkullIcon({ size = 24, color = colors.accent.crimson, ...props }: SvgProps & { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth={1.5} />
      <Circle cx="9" cy="10" r="1.5" fill={color} />
      <Circle cx="15" cy="10" r="1.5" fill={color} />
      <Path d="M8 15c0 2 1.8 3 4 3s4-1 4-3" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  );
}

function ClockIcon({ size = 24, color = colors.accent.gold, ...props }: SvgProps & { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth={1.5} />
      <Path d="M12 7v5l3 3" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function GoldIcon({ size = 24, color = colors.accent.gold, ...props }: SvgProps & { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth={1.5} />
      <Path d="M8 14l4-4 4 4M12 10v8" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function CellIcon({ size = 24, color = colors.accent.amethyst, ...props }: SvgProps & { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      <Polygon points="12,3 21,8 21,16 12,21 3,16 3,8" stroke={color} strokeWidth={1.5} strokeLinejoin="round" />
      <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth={1.5} />
    </Svg>
  );
}

// Simple geometric room icons
function RoomIcon({ color, shape }: { color: string; shape: 'circle' | 'diamond' | 'hexagon' | 'octagon' | 'pentagon' | 'triangle' }) {
  const size = 24;
  const cx = 12, cy = 12, r = 8;
  const pathMap: Record<string, string> = {
    circle: `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx - 0.01} ${cy - r}`,
    diamond: `M ${cx} ${cy - r} L ${cx + r} ${cy} L ${cx} ${cy + r} L ${cx - r} ${cy} Z`,
    hexagon: `M ${cx - r * 0.75} ${cy - r} L ${cx + r * 0.75} ${cy - r} L ${cx + r} ${cy} L ${cx + r * 0.75} ${cy + r} L ${cx - r * 0.75} ${cy + r} L ${cx - r} ${cy} Z`,
    octagon: `M ${cx - r * 0.6} ${cy - r} L ${cx + r * 0.6} ${cy - r} L ${cx + r} ${cy - r * 0.6} L ${cx + r} ${cy + r * 0.6} L ${cx + r * 0.6} ${cy + r} L ${cx - r * 0.6} ${cy + r} L ${cx - r} ${cy + r * 0.6} L ${cx - r} ${cy - r * 0.6} Z`,
    pentagon: `M ${cx} ${cy - r} L ${cx + r * 0.95} ${cy - r * 0.3} L ${cx + r * 0.6} ${cy + r} L ${cx - r * 0.6} ${cy + r} L ${cx - r * 0.95} ${cy - r * 0.3} Z`,
    triangle: `M ${cx} ${cy - r} L ${cx + r} ${cy + r * 0.7} L ${cx - r} ${cy + r * 0.7} Z`,
  };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d={pathMap[shape] ?? ''} stroke={color} strokeWidth={1.5} strokeLinejoin="round" />
    </Svg>
  );
}

// ─── Icon Map ────────────────────────────────────────────────────────────────
const iconMap: Record<IconName, React.FC<SvgProps & { size?: number }>> = {
  castle: CastleIcon,
  'coin-sack': CoinSackIcon,
  shield: ShieldIcon,
  crest: CrestIcon,
  sword: SwordIcon,
  close: CloseIcon,
  back: BackIcon,
  lock: LockIcon,
  check: CheckIcon,
  settings: ({ size = 24, color = colors.dark.text.secondary, ...props }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth={1.5} />
      <Path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" stroke={color} strokeWidth={1.5} />
    </Svg>
  ),
  info: ({ size = 24, color = colors.accent.sapphire, ...props }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth={1.5} />
      <Path d="M12 16v-4M12 8h.01" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  ),
  // Room icons
  battle: () => <RoomIcon color={colors.roomType.normal.border} shape="circle" />,
  elite: () => <RoomIcon color={colors.roomType.elite.border} shape="diamond" />,
  event: () => <RoomIcon color={colors.roomType.event.border} shape="hexagon" />,
  treasure: () => <RoomIcon color={colors.roomType.treasure.border} shape="octagon" />,
  rest: ({ size = 24, color = colors.roomType.rest.border, ...props }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      <Path d="M8 6v12M16 6v12M6 12h12" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  ),
  merchant: ({ size = 24, color = colors.roomType.merchant.border, ...props }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      <Path d="M3 10l3 11h12l3-11H3z" stroke={color} strokeWidth={1.5} strokeLinejoin="round" />
      <Path d="M8 10V7a4 4 0 118 0v3" stroke={color} strokeWidth={1.5} />
    </Svg>
  ),
  anomaly: () => <RoomIcon color={colors.roomType.anomaly.border} shape="triangle" />,
  'mini-boss': () => <RoomIcon color={colors.roomType.miniBoss.border} shape="pentagon" />,
  'gate-boss': ({ size = 24, color = colors.roomType.gateBoss.border, ...props }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      <Path d="M12 2l8 4v6c0 5.5-3.8 10.7-8 12-4.2-1.3-8-6.5-8-12V6l8-4z" stroke={color} strokeWidth={1.5} strokeLinejoin="round" />
    </Svg>
  ),
  'counter-boss': ({ size = 24, color = colors.roomType.counterBoss.border, ...props }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth={1.5} />
      <Path d="M9 9l6 6M15 9l-6 6" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  ),
  // Skill tags (simplified geometric)
  burst: ({ size = 24, color = colors.accent.amber, ...props }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      <Path d="M12 2l2 8h8l-6 5 2 8-6-5-6 5 2-8-6-5h8l2-8z" stroke={color} strokeWidth={1.5} strokeLinejoin="round" />
    </Svg>
  ),
  sustain: ({ size = 24, color = colors.accent.emerald, ...props }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      <Path d="M5 12a7 7 0 0114 0" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <Path d="M12 5v3M12 16v3" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <Path d="M7.5 8.5l2 2M14.5 13.5l2 2" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  ),
  control: ({ size = 24, color = colors.accent.sapphire, ...props }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      <Circle cx="8" cy="8" r="2" stroke={color} strokeWidth={1.5} />
      <Circle cx="16" cy="16" r="2" stroke={color} strokeWidth={1.5} />
      <Path d="M10 10l4 4" stroke={color} strokeWidth={1.5} />
    </Svg>
  ),
  'ct-manipulation': ({ size = 24, color = colors.accent.gold, ...props }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth={1.5} />
      <Path d="M12 7v5l3 3" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M16 3l2 2-2 2M8 21l-2-2 2-2" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  ),
  'defense-break': ({ size = 24, color = colors.accent.crimson, ...props }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      <Path d="M12 2L4 6v6c0 5.5 3.8 10.7 8 12 4.2-1.3 8-6.5 8-12V6l-8-4z" stroke={color} strokeWidth={1.5} strokeLinejoin="round" />
      <Path d="M8 8l8 8M16 8l-8 8" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  ),
  execute: ({ size = 24, color = colors.accent.crimson, ...props }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      <Path d="M18 6L6 18M6 6l12 12" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth={1.5} />
    </Svg>
  ),
  // Elements
  fire: ({ size = 24, color = colors.accent.amber, ...props }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      <Path d="M12 22c4-2 6-6 6-9 0-4-3-9-6-11-3 2-6 7-6 11 0 3 2 7 6 9z" stroke={color} strokeWidth={1.5} strokeLinejoin="round" />
    </Svg>
  ),
  frost: ({ size = 24, color = colors.accent.frost, ...props }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      <Polygon points="12,3 16,7 12,7 8,7" stroke={color} strokeWidth={1.5} strokeLinejoin="round" fill="none" />
      <Path d="M12 7v14" stroke={color} strokeWidth={1.5} />
    </Svg>
  ),
  shadow: ({ size = 24, color = colors.accent.shadow, ...props }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth={1.5} />
      <Circle cx="12" cy="12" r="9" fill={color} fillOpacity={0.3} />
    </Svg>
  ),
  light: ({ size = 24, color = colors.accent.gold, ...props }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      <Circle cx="12" cy="12" r="4" stroke={color} strokeWidth={1.5} />
      <Path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4l1.4-1.4M17 7l1.4-1.4" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  ),
  physical: ({ size = 24, color = colors.dark.text.primary, ...props }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      <Rect x="4" y="4" width="16" height="16" rx="2" stroke={color} strokeWidth={1.5} />
      <Path d="M12 8v8M8 12h8" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  ),
  arcane: ({ size = 24, color = colors.accent.amethyst, ...props }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      <Polygon points="12,2 18,7 18,17 12,22 6,17 6,7" stroke={color} strokeWidth={1.5} strokeLinejoin="round" />
      <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth={1.5} />
    </Svg>
  ),
  // Status
  heart: HeartIcon,
  mana: ({ size = 24, color = colors.accent.sapphire, ...props }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      <Path d="M12 2l3 7h7l-5.5 4 2 7L12 16l-6.5 4 2-7L2 9h7l3-7z" stroke={color} strokeWidth={1.5} strokeLinejoin="round" />
    </Svg>
  ),
  'shield-icon': ({ size = 24, color = colors.accent.sapphire, ...props }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      <Path d="M12 2L4 6v6c0 5.5 3.8 10.7 8 12 4.2-1.3 8-6.5 8-12V6l-8-4z" stroke={color} strokeWidth={1.5} strokeLinejoin="round" />
    </Svg>
  ),
  skull: SkullIcon,
  clock: ClockIcon,
  // Resources
  gold: GoldIcon,
  cell: CellIcon,
};

// ─── Public Icon Component ───────────────────────────────────────────────────
interface IconComponentProps {
  name: IconName;
  size?: number;
  color?: string;
}

export function Icon({ name, size = 24, color, ...props }: IconComponentProps & Omit<SvgProps, 'width' | 'height' | 'viewBox' | 'color'>) {
  const IconComponent = iconMap[name];
  if (!IconComponent) {
    console.warn(`Icon "${name}" not found in registry`);
    return null;
  }
  const resolvedColor: string = color ?? colors.dark.text.primary;
  return <IconComponent size={size} color={resolvedColor} />;
}
