import { useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '@/navigation/AppNavigator';
import { RUN_PASSIVES, RUN_PASSIVE_BY_ID } from '@/content';
import type { RunPassiveDef, RunPassiveId } from '@/content/types';
import { useRunStore } from '@/stores';
import { PrimaryButton } from '@/components/atoms/PrimaryButton';

type Props = NativeStackScreenProps<HomeStackParamList, 'PassiveDraft'>;

function pickWeightedRandom<T>(items: readonly T[], count: number, seed: number): T[] {
  if (items.length <= count) return [...items];
  const result: T[] = [];
  const remaining = [...items];
  let s = seed;
  for (let i = 0; i < count && remaining.length > 0; i += 1) {
    s = (s * 16807 + 0) % 0x7fffffff;
    const idx = s % remaining.length;
    const picked = remaining[idx];
    if (picked !== undefined) {
      result.push(picked);
      remaining.splice(idx, 1);
    }
  }
  return result;
}

export function PassiveDraftScreen({ navigation }: Props) {
  const stage = useRunStore((state) => state.stage);
  const seed = useRunStore((state) => state.seed);
  const currentPassiveIds = useRunStore((state) => state.runPassiveIds);
  const selectPassive = useRunStore((state) => state.selectPassive);

  const [selectedId, setSelectedId] = useState<RunPassiveId | null>(null);

  const availablePassives = useMemo(() => {
    const alreadyPicked = new Set(currentPassiveIds);
    return RUN_PASSIVES.filter((p) => !alreadyPicked.has(p.id));
  }, [currentPassiveIds]);

  const draftOptions = useMemo(() => {
    const salt = (stage ?? 1) * 7919 + (seed ?? 0);
    return pickWeightedRandom(availablePassives, 3, salt);
  }, [availablePassives, seed, stage]);

  const stageLabel = stage !== null ? `Stage ${stage}` : '';

  const handleConfirm = () => {
    if (selectedId === null) return;
    selectPassive(selectedId);
    const nextStage = (stage ?? 0) + 1;
    if (nextStage % 5 === 0 && nextStage <= 25) {
      navigation.replace('SkillDraft');
    } else {
      navigation.replace('RunMap');
    }
  };

  if (draftOptions.length === 0) {
    // No more passives to draft — skip directly to Run Map.
    navigation.replace('RunMap');
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Passive Draft</Text>
      <Text style={styles.subtitle}>
        {stageLabel} — Choose a permanent run modifier
      </Text>

      <FlatList
        data={draftOptions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }: { item: RunPassiveDef }) => {
          const selected = selectedId === item.id;
          return (
            <Pressable
              onPress={() => setSelectedId(item.id)}
              style={[styles.card, selected && styles.cardSelected]}
            >
              <Text style={styles.cardName}>{item.name}</Text>
              <Text style={styles.cardEffect}>{item.effectLabel}</Text>
              <Text style={styles.cardDescription}>{item.description}</Text>
            </Pressable>
          );
        }}
      />

      <View style={styles.footer}>
        <PrimaryButton
          title="Confirm Pick"
          onPress={handleConfirm}
          disabled={selectedId === null}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f4ef' },
  title: { fontSize: 22, fontWeight: '700', color: '#2b1f10', padding: 20, paddingBottom: 4 },
  subtitle: { fontSize: 13, color: '#5d4d35', paddingHorizontal: 20, marginBottom: 8 },
  list: { paddingHorizontal: 16, paddingBottom: 16, gap: 10 },
  card: {
    borderWidth: 1.5,
    borderColor: '#d8cdbb',
    borderRadius: 12,
    padding: 14,
    backgroundColor: '#fffdf8',
    gap: 4,
  },
  cardSelected: {
    borderColor: '#2d5ca8',
    backgroundColor: '#eaf0ff',
  },
  cardName: { fontSize: 15, fontWeight: '700', color: '#1e3a5f' },
  cardEffect: { fontSize: 13, fontWeight: '600', color: '#4a7a3a' },
  cardDescription: { fontSize: 12, color: '#5d4d35', lineHeight: 17 },
  footer: { padding: 20, borderTopWidth: 1, borderTopColor: '#d8cdbb', backgroundColor: '#fffdf8' },
});
