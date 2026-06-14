import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '@/navigation/AppNavigator';
import { RISK_CONTRACTS } from '@/content';
import type { RiskContractId } from '@/content/types';
import { useRunStore } from '@/stores';
import { PrimaryButton } from '@/components/atoms/PrimaryButton';
import type { RiskContractDef } from '@/content/types/riskContract';

type Props = NativeStackScreenProps<HomeStackParamList, 'RiskContractSelect'>;

/**
 * Simple seeded pseudo-random shuffle for deterministic picks.
 * Uses mulberry32 variant so the 3 offered contracts stay stable during the screen session.
 */
function seededShuffle<T>(items: readonly T[], seed: number): T[] {
  const arr = [...items];
  let s = seed | 0;
  for (let i = arr.length - 1; i > 0; i -= 1) {
    s = Math.imul(s ^ (s >>> 16), 2246822507);
    s = Math.imul(s ^ (s >>> 13), 3266489909);
    const j = ((s ^ (s >>> 16)) >>> 0) % (i + 1);
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr;
}

const MAX_SELECTION = 2;
const OFFER_COUNT = 3;

export function RiskContractSelectScreen({ navigation, route }: Props) {
  const { classId } = route.params;
  const startRun = useRunStore((state) => state.startRun);
  const runStatus = useRunStore((state) => state.status);
  const [selectedIds, setSelectedIds] = useState<RiskContractId[]>([]);
  const [isStarting, setIsStarting] = useState(false);

  // Deterministic but variable seeded shuffle — different per run.
  const offeredContracts = useMemo<RiskContractDef[]>(() => {
    const seed = Date.now();
    return seededShuffle(RISK_CONTRACTS, seed).slice(0, OFFER_COUNT);
  }, []);

  const toggleContract = useCallback(
    (id: RiskContractId) => {
      setSelectedIds((prev) => {
        if (prev.includes(id)) return prev.filter((x) => x !== id);
        if (prev.length >= MAX_SELECTION) return prev;
        return [...prev, id];
      });
    },
    [],
  );

  const handleBeginRun = useCallback(async () => {
    setIsStarting(true);
    try {
      await startRun(classId, { selectedRiskContractIds: selectedIds });
      navigation.replace('RunMap');
    } catch {
      // Error surfaced by runStore / toast.
    } finally {
      setIsStarting(false);
    }
  }, [classId, selectedIds, startRun, navigation]);

  const busy = isStarting || runStatus === 'starting_run';

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Risk Contracts</Text>
      <Text style={styles.subtitle}>
        Challenge yourself with optional risk contracts for a higher score bonus.
        {'\n'}Select up to {MAX_SELECTION}.
      </Text>

      <FlatList
        data={offeredContracts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        scrollEnabled={false}
        renderItem={({ item }) => {
          const selected = selectedIds.includes(item.id);
          return (
            <Pressable
              onPress={() => toggleContract(item.id)}
              style={[styles.card, selected && styles.cardSelected]}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardName}>{item.name}</Text>
                <Text style={styles.cardReward}>{item.rewardBonusLabel}</Text>
              </View>
              <Text style={styles.cardDescription}>{item.description}</Text>
              <View style={styles.tagRow}>
                {item.tags.map((tag) => (
                  <View key={tag} style={styles.tag}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            </Pressable>
          );
        }}
      />

      <View style={styles.footer}>
        {selectedIds.length > 0 ? (
          <Text style={styles.selectionHint}>
            {selectedIds.length}/{MAX_SELECTION} contracts selected
          </Text>
        ) : (
          <Text style={styles.selectionHint}>None selected — you can skip</Text>
        )}
        <PrimaryButton
          title="Begin Run"
          onPress={() => {
            handleBeginRun().catch(() => undefined);
          }}
          disabled={busy}
          busy={busy}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a1a' },
  title: { fontSize: 22, fontWeight: '700', color: '#ffffff', padding: 20, paddingBottom: 4 },
  subtitle: { fontSize: 13, color: '#aabbcc', paddingHorizontal: 20, marginBottom: 8, lineHeight: 18 },
  list: { paddingHorizontal: 16, paddingBottom: 16, gap: 10 },
  card: {
    borderWidth: 1,
    borderColor: 'rgba(0,255,255,0.1)',
    borderRadius: 12,
    padding: 14,
    backgroundColor: 'rgba(255,255,255,0.03)',
    gap: 6,
  },
  cardSelected: {
    borderColor: '#ffb000',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  cardName: { flex: 1, fontSize: 15, fontWeight: '700', color: '#ffffff' },
  cardReward: { fontSize: 12, fontWeight: '700', color: '#ffb000' },
  cardDescription: { fontSize: 12.5, color: '#aabbcc', lineHeight: 17 },
  tagRow: { flexDirection: 'row', gap: 6, marginTop: 2 },
  tag: {
    backgroundColor: 'rgba(0,255,255,0.08)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  tagText: { fontSize: 10, fontWeight: '600', color: '#aabbcc' },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    gap: 10,
  },
  selectionHint: { fontSize: 12, color: '#aabbcc', textAlign: 'center' },
});
