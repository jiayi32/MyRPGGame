/**
 * BattleLog — Scrollable text log showing combat turn descriptions.
 *
 * Color-codes entries by action type: player (blue), enemy (red),
 * crit (gold), heal (green).
 */

import React, { useRef, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Spacing, BorderRadius } from '../../styles/theme';
import type { TurnRecord, QueueUnit } from '../../services/gamification/CampaignTypes';

interface BattleLogProps {
  turnHistory: TurnRecord[];
  units: QueueUnit[];
  maxHeight?: number;
}

export default function BattleLog({ turnHistory, units, maxHeight = 140 }: BattleLogProps) {
  const scrollRef = useRef<ScrollView>(null);

  const onContentSizeChange = useCallback(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, []);

  if (turnHistory.length === 0) return null;

  return (
    <View style={[styles.container, { maxHeight }]}>
      <ScrollView
        ref={scrollRef}
        onContentSizeChange={onContentSizeChange}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
      >
        {turnHistory.map((item, index) => {
          const actorUnit = units.find(u => u.unitId === item.actingUnitId);
          const isPlayer = actorUnit?.unitType === 'player';
          const isCrit = item.resultDescription?.includes('CRIT') || item.resultDescription?.includes('critical');
          const totalHeal = Object.values(item.healingDone || {}).reduce((a, b) => a + b, 0);
          const isHeal = totalHeal > 0
            || item.resultDescription?.includes('regen')
            || item.resultDescription?.includes('Regenerated')
            || item.resultDescription?.includes('heal')
            || item.resultDescription?.includes('Heal');

          let textColor = isPlayer ? '#7CB3FF' : '#FF7C7C';
          if (isCrit) textColor = '#FFD700';
          if (isHeal) textColor = '#66BB6A';

          return (
            <Text key={`turn-${item.turnNumber}-${item.skillId}-${index}`} style={[styles.logEntry, { color: textColor }]}>
              T{item.turnNumber}: {item.resultDescription}
            </Text>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  logEntry: {
    fontSize: 10,
    lineHeight: 14,
    fontFamily: 'monospace',
    marginBottom: 1,
  },
});
