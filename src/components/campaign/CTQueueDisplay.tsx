/**
 * CTQueueDisplay — Horizontal turn-order queue for CT-based combat.
 *
 * Shows unit thumbnails sorted by CT ascending (next-to-act first).
 * Each unit shows a mini sprite, name, HP bar, and CT badge.
 */

import React, { useMemo } from 'react';
import { View, ScrollView, Text, StyleSheet } from 'react-native';
import AnimatedProgressBar from '../AnimatedProgressBar';
import BattleUnitSprite from './BattleUnitSprite';
import { Colors, Spacing, BorderRadius } from '../../styles/theme';
import type { QueueUnit } from '../../services/gamification/CampaignTypes';

interface CTQueueDisplayProps {
  units: QueueUnit[];
  activeUnitId: string | null;
}

export default function CTQueueDisplay({ units, activeUnitId }: CTQueueDisplayProps) {
  const sorted = useMemo(() => {
    return [...units]
      .filter(u => !u.isKO)
      .sort((a, b) => a.ct - b.ct);
  }, [units]);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scrollView}
      contentContainerStyle={styles.container}
    >
      {sorted.map((unit) => {
        const isActive = unit.unitId === activeUnitId;
        const isPlayer = unit.unitType === 'player';
        const hpPct = unit.maxHp > 0 ? unit.hp / unit.maxHp : 0;
        return (
          <View
            key={unit.unitId}
            style={[
              styles.item,
              isActive && styles.activeItem,
              { borderColor: isPlayer ? '#4A90D9' : '#D94A4A' },
            ]}
          >
            <View style={styles.spriteWrap}>
              <BattleUnitSprite
                unit={unit}
                animState="idle"
                displayWidth={24}
                displayHeight={24}
                flipped={!isPlayer}
              />
            </View>
            <Text style={styles.name} numberOfLines={1}>{unit.name}</Text>
            <AnimatedProgressBar
              value={unit.hp}
              total={unit.maxHp}
              height={3}
              color={hpPct > 0.5 ? '#4CAF50' : hpPct > 0.25 ? '#FF9800' : '#F44336'}
              showStats={false}
              animated={false}
            />
            <Text style={styles.ctBadge}>{unit.ct}</Text>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    maxHeight: 72,
  },
  container: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    gap: Spacing.xs,
  },
  item: {
    width: 48,
    alignItems: 'center',
    paddingVertical: 2,
    paddingHorizontal: 2,
    borderRadius: BorderRadius.sm,
    borderWidth: 1.5,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  activeItem: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 2,
  },
  spriteWrap: {
    width: 24,
    height: 24,
    overflow: 'hidden',
  },
  name: {
    color: '#fff',
    fontSize: 8,
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
  },
  ctBadge: {
    color: '#FFD700',
    fontSize: 9,
    fontWeight: '700',
    marginTop: 1,
  },
});
