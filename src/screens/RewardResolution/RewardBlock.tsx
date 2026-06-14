import { StyleSheet, Text, View } from 'react-native';
import { lookupGearTemplate } from '@/content/gear';
import type { RewardBundle } from '@/features/run/types';
import { RewardRow } from './RewardRow';

export function RewardBlock({
  title,
  rewards,
  tint,
  runOngoing,
}: {
  title: string;
  rewards: RewardBundle;
  tint: string;
  runOngoing?: boolean;
}) {
  const hasAny =
    rewards.credits > 0 ||
    rewards.quantumCores > 0 ||
    rewards.dataCacheMinor > 0 ||
    rewards.dataCacheStandard > 0 ||
    rewards.dataCacheGrand > 0 ||
    rewards.gearIds.length > 0;

  return (
    <View style={[styles.rewardBlock, { borderLeftColor: tint }]}>
      <Text style={[styles.rewardBlockTitle, { color: tint }]}>{title}</Text>
      {hasAny ? (
        <>
          <RewardRow label="Credits" value={rewards.credits} />
          <RewardRow label="Quantum Cores" value={rewards.quantumCores} />
          <RewardRow label="Data Cache (Minor)" value={rewards.dataCacheMinor} />
          <RewardRow label="Data Cache (Standard)" value={rewards.dataCacheStandard} />
          <RewardRow label="Data Cache (Grand)" value={rewards.dataCacheGrand} />
          {rewards.gearIds.map((id, index) => {
            const resolved = lookupGearTemplate(id);
            const name = resolved?.name ?? id;
            const rarity = resolved?.rarity;
            return (
              <Text key={`gear-${index}`} style={styles.gearItem}>
                {name}{rarity !== undefined ? ` · ${rarity}` : ''}
              </Text>
            );
          })}
          {runOngoing === true && rewards.gearIds.length > 0 && (
            <Text style={styles.gearAtRisk}>
              Gear is at risk — flee or defeat forfeits all vaulted gear. Vault now to keep it safe.
            </Text>
          )}
        </>
      ) : (
        <Text style={styles.emptyReward}>—</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  rewardBlock: {
    borderLeftWidth: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,255,255,0.15)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 14,
    paddingLeft: 12,
    gap: 4,
  },
  rewardBlockTitle: { fontSize: 13, fontWeight: '700', marginBottom: 4 },
  gearItem: { fontSize: 12, color: '#5a7a4a' },
  gearAtRisk: { fontSize: 11, color: '#8b4000', fontWeight: '600', marginTop: 4 },
  emptyReward: { fontSize: 13, color: '#8aaa9a' },
});
