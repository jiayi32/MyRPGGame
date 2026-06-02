import { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '@/navigation/AppNavigator';
import {
  AUGMENTS_BY_TIER_AND_CATEGORY,
  AUGMENT_BY_ID,
  getTierWeightsForStage,
  getUnlockedTiers,
  type AugmentDef,
  type AugmentId,
  type AugmentCategory,
  type AugmentTier,
} from '@/content';
import { usePlayerStore, useRunStore } from '@/stores';
import { PrimaryButton } from '@/components/atoms/PrimaryButton';

type Props = NativeStackScreenProps<HomeStackParamList, 'AugmentDraft'>;

// ---------------------------------------------------------------------------
// Seeded weighted pick helpers
// ---------------------------------------------------------------------------

/** Weighted random pick using a simple LCG seeded with salt. */
const pickWeightedIndex = (weights: readonly number[], seed: number): number => {
  const total = weights.reduce((sum, w) => sum + w, 0);
  if (total <= 0) return 0;
  const s = ((seed * 16807 + 0) % 0x7fffffff);
  let r = (s / 0x7fffffff) * total;
  for (let i = 0; i < weights.length; i += 1) {
    const w = weights[i] ?? 0;
    r -= w;
    if (r <= 0) return i;
  }
  return weights.length - 1;
};

/** Pick one random element from each sub-array using seeded hash. */
const pickOnePerCategory = <T,>(
  pools: readonly (readonly T[])[],
  seed: number,
): (T | null)[] => {
  let s = seed;
  return pools.map((pool) => {
    if (pool.length === 0) return null;
    s = ((s * 16807 + 0) % 0x7fffffff);
    const idx = s % pool.length;
    return pool[idx] ?? null;
  });
};

// ---------------------------------------------------------------------------
// Visual helpers
// ---------------------------------------------------------------------------

const CATEGORY_LABELS: Record<AugmentCategory, string> = {
  neutral: 'Neutral',
  positive: 'Positive',
  sacrificial: 'Sacrificial',
};

const CATEGORY_COLORS: Record<AugmentCategory, { bg: string; border: string; text: string }> = {
  neutral: { bg: '#f5f5f5', border: '#9e9e9e', text: '#555555' },
  positive: { bg: '#e8f5e9', border: '#4a7a3a', text: '#2e5d24' },
  sacrificial: { bg: '#fdecea', border: '#c0392b', text: '#8b1a12' },
};

const TIER_LABELS: Record<AugmentTier, string> = {
  bronze: 'Bronze',
  silver: 'Silver',
  gold: 'Gold',
  prismatic: 'Prismatic',
};

const TIER_COLORS: Record<AugmentTier, { bg: string; text: string }> = {
  bronze: { bg: '#fdf2e0', text: '#8b6914' },
  silver: { bg: '#eceff1', text: '#546e7a' },
  gold: { bg: '#fff8e1', text: '#b8860b' },
  prismatic: { bg: '#f3e5f5', text: '#7b1fa2' },
};

const TIER_ORDER: readonly AugmentTier[] = ['bronze', 'silver', 'gold', 'prismatic'];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AugmentDraftScreen({ navigation }: Props) {
  const stage = useRunStore((state) => state.stage);
  const seed = useRunStore((state) => state.seed);
  const currentAugmentIds = useRunStore((state) => state.augmentIds);
  const augmentsPicked = usePlayerStore((state) => state.augmentsPicked);
  const selectAugment = useRunStore((state) => state.selectAugment);
  const incrementAugmentsPicked = usePlayerStore((state) => state.incrementAugmentsPicked);

  const [selectedId, setSelectedId] = useState<AugmentId | null>(null);

  const currentPickedSet = useMemo(() => new Set(currentAugmentIds), [currentAugmentIds]);

  const draftOptions = useMemo(() => {
    if (seed === null || stage === null) return [];

    const unlockedTiers = getUnlockedTiers(augmentsPicked);
    if (unlockedTiers.length === 0) return [];

    // 1. Select a tier via stage-weighted random pick
    const tierWeights = getTierWeightsForStage(stage);
    const tierWeightList = TIER_ORDER.map((t) =>
      unlockedTiers.includes(t) ? (tierWeights[t] ?? 0) : 0,
    );
    const tierSalt = stage * 7919 + seed;
    const tierIdx = pickWeightedIndex(tierWeightList, tierSalt);
    const selectedTier: AugmentTier = TIER_ORDER[tierIdx] ?? unlockedTiers[0] ?? 'bronze';

    // 2. From the selected tier, get the three category pools
    const byCategory = AUGMENTS_BY_TIER_AND_CATEGORY[selectedTier];
    const categories: AugmentCategory[] = ['neutral', 'positive', 'sacrificial'];

    const pools = categories.map((cat) =>
      byCategory[cat].filter((a: AugmentDef) => !currentPickedSet.has(a.id)),
    );

    // 3. Pick one from each category
    const salt2 = stage * 131 + seed * 3;
    const picked = pickOnePerCategory(pools, salt2);

    // 4. Build the option list (null items mean category exhausted)
    const options: AugmentDef[] = [];
    for (const item of picked) {
      if (item !== null) options.push(item);
    }

    return options;
  }, [seed, stage, augmentsPicked, currentPickedSet]);

  const stageLabel = stage !== null ? `Stage ${stage}` : '';

  const handleConfirm = () => {
    if (selectedId === null) return;
    selectAugment(selectedId);
    incrementAugmentsPicked();
    const nextStage = (stage ?? 0) + 1;
    // Augment→SkillDraft chain: stage 20 is both augment (stage in 4,8,...,28) and skill draft (stage%5==0)
    if (nextStage % 5 === 0 && nextStage <= 25) {
      navigation.replace('SkillDraft');
    } else {
      navigation.replace('RunMap');
    }
  };

  useEffect(() => {
    if (draftOptions.length === 0) {
      const nextStage = (stage ?? 0) + 1;
      if (nextStage % 5 === 0 && nextStage <= 25) {
        navigation.replace('SkillDraft');
      } else {
        navigation.replace('RunMap');
      }
    }
  }, [draftOptions.length, navigation, stage]);

  if (draftOptions.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Augment Draft</Text>
      <Text style={styles.subtitle}>
        {stageLabel} — Choose an augment for this run
      </Text>

      <FlatList
        data={draftOptions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }: { item: AugmentDef }) => {
          const selected = selectedId === item.id;
          const catColors = CATEGORY_COLORS[item.category];
          const tierColors = TIER_COLORS[item.tier];
          return (
            <Pressable
              onPress={() => setSelectedId(item.id)}
              style={[
                styles.card,
                selected && styles.cardSelected,
                { borderColor: selected ? catColors.border : '#d8cdbb' },
              ]}
            >
              <View style={styles.cardHeader}>
                <View style={[styles.categoryBadge, { backgroundColor: catColors.bg, borderColor: catColors.border }]}>
                  <Text style={[styles.categoryBadgeText, { color: catColors.text }]}>
                    {CATEGORY_LABELS[item.category]}
                  </Text>
                </View>
                <View style={[styles.tierBadge, { backgroundColor: tierColors.bg }]}>
                  <Text style={[styles.tierBadgeText, { color: tierColors.text }]}>
                    {TIER_LABELS[item.tier]}
                  </Text>
                </View>
              </View>
              <Text style={styles.cardName}>{item.name}</Text>
              <Text style={styles.cardEffect}>{item.effectLabel}</Text>
              <Text style={styles.cardDescription} numberOfLines={3}>
                {item.description}
              </Text>
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
    gap: 6,
  },
  cardSelected: {
    backgroundColor: '#eaf0ff',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  categoryBadge: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tierBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  tierBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  cardName: { fontSize: 15, fontWeight: '700', color: '#1e3a5f' },
  cardEffect: { fontSize: 13, fontWeight: '600', color: '#4a7a3a' },
  cardDescription: { fontSize: 12, color: '#5d4d35', lineHeight: 17 },
  footer: { padding: 20, borderTopWidth: 1, borderTopColor: '#d8cdbb', backgroundColor: '#fffdf8' },
});
