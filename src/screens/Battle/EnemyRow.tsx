import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { DamagePopupOverlay } from '@/components/molecules/DamagePopupOverlay';
import { ENEMY_ARCHETYPE_BY_ID } from '@/content';
import type { Unit } from '@/domain/combat';
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
      style={[
        styles.enemyRow,
        isReady && styles.enemyRowReady,
        isTarget && styles.enemyRowTarget,
      ]}
    >
      <DamagePopupOverlay unitId={enemy.id} />
      <View style={styles.enemyHeader}>
        <View style={styles.enemyNameBlock}>
          <Text style={styles.enemyName}>{enemy.displayName}</Text>
          {enemy.archetypeId !== undefined && enemy.skillIds.length > 0 && (
            <Text style={styles.archetypeLabel}>
              {ENEMY_ARCHETYPE_BY_ID.get(enemy.archetypeId)?.name ?? enemy.archetypeId}
            </Text>
          )}
        </View>
        <CtIndicator unit={enemy} isReady={isReady} />
      </View>
      <HpBar unit={enemy} color={isTarget ? '#e04040' : '#7a3030'} />
      <StatusChips unit={enemy} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  enemyRow: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#dadde9',
    backgroundColor: '#fafbff',
    padding: 10,
    gap: 6,
  },
  enemyRowReady: { borderColor: '#c08020', backgroundColor: '#fffaf0' },
  enemyRowTarget: { borderColor: '#c04040', backgroundColor: '#fff5f5', borderWidth: 1.5 },
  enemyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  enemyNameBlock: { flexDirection: 'column', flex: 1 },
  enemyName: { fontSize: 14, fontWeight: '600', color: '#2a2e44' },
  archetypeLabel: { fontSize: 10, color: '#8892b0', marginTop: 1 },
});
