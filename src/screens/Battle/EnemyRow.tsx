import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { DamagePopupOverlay } from '@/components/molecules/DamagePopupOverlay';
import { ENEMY_ARCHETYPE_BY_ID } from '@/content';
import type { Unit } from '@/domain/combat';
import { colors, spacing, radius, typography } from '@/design';
import { CtIndicator } from './CtIndicator';
import { HpBar } from './HpBar';
import { StatusChips } from './StatusChips';

export function EnemyRow({
  enemy,
  isReady,
  isTarget,
  onSelect,
}: {
  enemy: Unit;
  isReady: boolean;
  isTarget: boolean;
  onSelect: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onSelect}
      activeOpacity={0.7}
      style={[
        styles.enemyRow,
        { borderColor: colors.dark.border.default, backgroundColor: colors.dark.background.secondary },
        isReady && { borderColor: colors.accent.amber, backgroundColor: '#2a2018' },
        isTarget && { borderColor: colors.accent.crimson, backgroundColor: '#2a1818', borderWidth: 1.5 },
      ]}
    >
      <DamagePopupOverlay unitId={enemy.id} />
      <View style={styles.enemyHeader}>
        <View style={styles.enemyNameBlock}>
          <Text style={[typography.style.bodySm, { color: colors.dark.text.primary, fontWeight: '600' }]}>
            {enemy.displayName}
          </Text>
          {enemy.archetypeId !== undefined && enemy.skillIds.length > 0 && (
            <Text style={[typography.style.bodyXs, { color: colors.dark.text.secondary, marginTop: 1 }]}>
              {ENEMY_ARCHETYPE_BY_ID.get(enemy.archetypeId)?.name ?? enemy.archetypeId}
            </Text>
          )}
        </View>
        <CtIndicator unit={enemy} isReady={isReady} />
      </View>
      <HpBar unit={enemy} color={isTarget ? colors.accent.crimson : colors.accent.crimson} />
      <StatusChips unit={enemy} maxVisible={2} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  enemyRow: {
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  enemyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  enemyNameBlock: { flexDirection: 'column', flex: 1 },
});
