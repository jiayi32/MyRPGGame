/**
 * StatusEffectBadges — tiny icon row showing a unit's active status effects.
 *
 * Pure presentational. Reads from `unit.statusEffects`; renders nothing when
 * the list is empty. Glyph is chosen from subtype, not name — this keeps v1
 * stable even as individual skills rename their effects.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { StatusEffect, StatusSubtype } from '../../../services/gamification/CampaignTypes';

interface Props {
  effects: readonly StatusEffect[];
}

const SUBTYPE_GLYPH: Record<StatusSubtype, string> = {
  poison: '☠',
  burn: '🔥',
  bleed: '🩸',
  regen: '✚',
  stun: '⚡',
  shield: '🛡',
  stat_buff: '▲',
  stat_debuff: '▼',
  generic: '✦',
};

const SUBTYPE_COLOR: Record<StatusSubtype, string> = {
  poison: 'rgba(120,200,80,0.9)',
  burn: 'rgba(230,90,40,0.9)',
  bleed: 'rgba(200,40,40,0.9)',
  regen: 'rgba(100,200,140,0.9)',
  stun: 'rgba(240,220,80,0.9)',
  shield: 'rgba(120,160,220,0.9)',
  stat_buff: 'rgba(100,180,240,0.9)',
  stat_debuff: 'rgba(180,90,180,0.9)',
  generic: 'rgba(180,180,180,0.9)',
};

export default function StatusEffectBadges({ effects }: Props) {
  if (!effects || effects.length === 0) return null;
  return (
    <View style={styles.row}>
      {effects.map(effect => (
        <View
          key={effect.id}
          style={[styles.badge, { backgroundColor: SUBTYPE_COLOR[effect.subtype] }]}
        >
          <Text style={styles.glyph}>{SUBTYPE_GLYPH[effect.subtype]}</Text>
          <Text style={styles.turns}>{effect.turnsRemaining}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 2,
    justifyContent: 'center',
    marginTop: 2,
  },
  badge: {
    minWidth: 18,
    height: 18,
    paddingHorizontal: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.4)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },
  glyph: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '700',
  },
  turns: {
    fontSize: 9,
    color: '#fff',
    fontWeight: '800',
  },
});
