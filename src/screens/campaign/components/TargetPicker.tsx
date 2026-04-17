/**
 * TargetPicker — Render a row of targetable units.
 *
 * Used by WaterfallCommandMenu after a target-dependent skill is selected.
 * Per COMBATSYSTEM.md §13, this picker always renders even with a single
 * valid target — manual targeting is non-negotiable.
 *
 * Multi-target ready: pass `targets` of any length. v1 dispatches a single
 * unit ID per call.
 */

import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Colors, Spacing, BorderRadius } from '../../../styles/theme';
import type { QueueUnit } from '../../../services/gamification/CampaignTypes';

interface Props {
  prompt: string;
  targets: readonly QueueUnit[];
  onSelect: (unitId: string) => void;
  onCancel: () => void;
}

export default function TargetPicker({ prompt, targets, onSelect, onCancel }: Props) {
  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.prompt}>{prompt}</Text>
        <Pressable style={styles.cancelBtn} onPress={onCancel}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.targetRow}
      >
        {targets.length === 0 ? (
          <Text style={styles.emptyText}>No valid targets</Text>
        ) : (
          targets.map(t => {
            const hpPct = t.maxHp > 0 ? Math.max(0, Math.min(1, t.hp / t.maxHp)) : 0;
            return (
              <Pressable
                key={t.unitId}
                style={styles.targetCard}
                onPress={() => onSelect(t.unitId)}
              >
                <Text style={styles.targetName} numberOfLines={1}>{t.name}</Text>
                <View style={styles.hpBarBg}>
                  <View
                    style={[
                      styles.hpBarFill,
                      { width: `${hpPct * 100}%` },
                      hpPct > 0.5 ? styles.hpHigh : hpPct > 0.25 ? styles.hpMid : styles.hpLow,
                    ]}
                  />
                </View>
                <Text style={styles.targetHp}>{t.hp}/{t.maxHp}</Text>
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,215,0,0.4)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  prompt: {
    color: '#FFD700',
    fontSize: 13,
    fontWeight: '700',
  },
  cancelBtn: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  cancelText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  targetRow: {
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xs,
    alignItems: 'center',
  },
  targetCard: {
    minWidth: 90,
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.6)',
    alignItems: 'center',
  },
  targetName: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
    textTransform: 'capitalize',
  },
  hpBarBg: {
    width: 70,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  hpBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  hpHigh: { backgroundColor: '#4CAF50' },
  hpMid: { backgroundColor: '#FF9800' },
  hpLow: { backgroundColor: '#F44336' },
  targetHp: {
    color: '#ccc',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  emptyText: {
    color: '#aaa',
    fontSize: 12,
    fontStyle: 'italic',
    paddingHorizontal: Spacing.md,
  },
});
