/**
 * Design System — RoomNodeCard Atom
 *
 * Clickable room node for the Run Map graph visualization.
 * Displays room type sigil (via Icon), condition chips, and selection state.
 *
 * Extracted from RunMapScreen inline component.
 * Uses Card variant="room" + Icon for sigils + design room color tokens.
 */

import React from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { Card } from './Card';
import { Icon, type IconName } from './Icon';
import { ThemeText } from './ThemeText';
import { colors, spacing, radius } from '../../design';
import type { StageRoomType } from '@/domain/run/types';

// ─── Room Type → Color Token Mapping ─────────────────────────────────────────
// Domain uses snake_case; design tokens use camelCase
const ROOM_COLOR_KEY: Record<StageRoomType, keyof typeof colors.roomType> = {
  normal: 'normal',
  elite: 'elite',
  event: 'event',
  treasure: 'treasure',
  rest: 'rest',
  merchant: 'merchant',
  anomaly: 'anomaly',
  mini_boss: 'miniBoss',
  gate: 'gateBoss',
  counter: 'counterBoss',
};

// ─── Room Type → Icon Mapping ────────────────────────────────────────────────
const ROOM_ICON_MAP: Record<StageRoomType, IconName> = {
  normal: 'battle',
  elite: 'elite',
  event: 'event',
  treasure: 'treasure',
  rest: 'rest',
  merchant: 'merchant',
  anomaly: 'anomaly',
  mini_boss: 'mini-boss',
  gate: 'gate-boss',
  counter: 'counter-boss',
};

// ─── Props ───────────────────────────────────────────────────────────────────
export interface RoomNodeCardProps {
  roomType: StageRoomType;
  isAvailable: boolean;
  isSelected: boolean;
  isCompleted: boolean;
  conditionLabel: string | undefined;
  onPress: () => void;
}

// ─── Component ───────────────────────────────────────────────────────────────
export function RoomNodeCard({
  roomType,
  isAvailable,
  isSelected,
  isCompleted,
  conditionLabel,
  onPress,
}: RoomNodeCardProps) {
  const roomColors = colors.roomType[ROOM_COLOR_KEY[roomType]];
  const iconName = ROOM_ICON_MAP[roomType] ?? 'battle';

  const nodeContent = (
    <View
      style={[
        styles.node,
        {
          backgroundColor: roomColors.bg,
          borderColor: isSelected ? colors.accent.gold : roomColors.border,
          borderWidth: isSelected ? 2.5 : 1.5,
          opacity: isCompleted && !isSelected ? 0.45 : 1,
        },
        isAvailable && styles.nodeAvailable,
      ]}
    >
      {/* Room sigil icon */}
      <Icon name={iconName} size={20} color={roomColors.text} />

      {/* Condition chip (elite/boss nodes) */}
      {conditionLabel !== undefined && conditionLabel.length > 0 && (
        <View style={[styles.conditionChip, { backgroundColor: roomColors.border }]}>
          <ThemeText
            textRole="label"
            size="xs"
            color="#ffffff"
            numberOfLines={1}
            style={styles.conditionText}
          >
            {conditionLabel}
          </ThemeText>
        </View>
      )}

      {/* Selection indicator */}
      {isSelected && (
        <View style={[styles.pin, { backgroundColor: colors.accent.gold }]} />
      )}
    </View>
  );

  if (!isAvailable) {
    return nodeContent;
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityLabel={`${roomType} room${conditionLabel ? `, ${conditionLabel}` : ''}`}
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
    >
      {nodeContent}
    </TouchableOpacity>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  node: {
    width: 44,
    height: 44,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  nodeAvailable: {
    // Subtle glow / shadow via elevation
    shadowColor: colors.accent.sapphire,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  conditionChip: {
    position: 'absolute',
    top: -6,
    right: -6,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: radius.sm,
    maxWidth: 48,
  },
  conditionText: {
    fontSize: 7,
    letterSpacing: 0,
  },
  pin: {
    position: 'absolute',
    bottom: -4,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
