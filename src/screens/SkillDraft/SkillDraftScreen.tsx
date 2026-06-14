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
import { CLASS_BY_ID, SKILL_BY_ID } from '@/content';
import type { SkillId } from '@/content/types';
import { isSpecified } from '@/content';
import { useRunStore } from '@/stores';
import { useGearInventory } from '@/hooks/useGearInventory';
import { buildDraftPool, type SkillDraftOption } from '@/domain/run/skillDraft';
import { PrimaryButton } from '@/components/atoms/PrimaryButton';

type Props = NativeStackScreenProps<HomeStackParamList, 'SkillDraft'>;

const SLOT_LABELS: Record<SkillDraftOption['slotType'], string> = {
  lineage: 'Lineage',
  synergy: 'Synergy',
  wildcard: 'Wildcard',
};

const SLOT_COLORS: Record<SkillDraftOption['slotType'], { bg: string; border: string; text: string }> = {
  lineage: { bg: '#e8f0ff', border: '#7ea3cc', text: '#244d88' },
  synergy: { bg: '#fff3d6', border: '#d4a248', text: '#805407' },
  wildcard: { bg: '#f8e5ff', border: '#b76dd1', text: '#6d2e8f' },
};

export function SkillDraftScreen({ navigation }: Props) {
  const stage = useRunStore((state) => state.stage);
  const seed = useRunStore((state) => state.seed);
  const activeClassId = useRunStore((state) => state.activeClassId);
  const runPassiveIds = useRunStore((state) => state.runPassiveIds);
  const draftedSkillIds = useRunStore((state) => state.draftedSkillIds);
  const selectDraftedSkill = useRunStore((state) => state.selectDraftedSkill);
  const { equippedBySlot } = useGearInventory();
  const equippedTemplateIds = useMemo(
    () => Object.values(equippedBySlot).map((i) => i.templateId),
    [equippedBySlot],
  );

  const [selectedSkillId, setSelectedSkillId] = useState<SkillId | null>(null);

  const draftOptions = useMemo(() => {
    if (seed === null || stage === null || activeClassId === null) return [];
    return buildDraftPool(
      seed,
      stage,
      activeClassId,
      equippedTemplateIds,
      runPassiveIds,
      draftedSkillIds,
    );
  }, [seed, stage, activeClassId, equippedTemplateIds, runPassiveIds, draftedSkillIds]);

  const stageLabel = stage !== null ? `Stage ${stage}` : '';

  const handleConfirm = () => {
    if (selectedSkillId === null) return;
    selectDraftedSkill(selectedSkillId);
    navigation.replace('RunMap');
  };

  useEffect(() => {
    if (draftOptions.length === 0) {
      navigation.replace('RunMap');
    }
  }, [draftOptions.length, navigation]);

  if (draftOptions.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Skill Draft</Text>
      <Text style={styles.subtitle}>
        {stageLabel} — Pick a temporary skill for this run
      </Text>

      <FlatList
        data={draftOptions}
        keyExtractor={(item) => item.skillId}
        contentContainerStyle={styles.list}
        renderItem={({ item }: { item: SkillDraftOption }) => {
          const selected = selectedSkillId === item.skillId;
          const skill = SKILL_BY_ID.get(item.skillId);
          const colors = SLOT_COLORS[item.slotType];
          return (
            <Pressable
              onPress={() => setSelectedSkillId(item.skillId)}
              style={[styles.card, selected && styles.cardSelected]}
            >
              <View style={[styles.slotBadge, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                <Text style={[styles.slotBadgeText, { color: colors.text }]}>
                  {SLOT_LABELS[item.slotType]}
                </Text>
              </View>
              <Text style={styles.cardName}>{item.name}</Text>
              <Text style={styles.cardDescription} numberOfLines={3}>
                {skill?.description ?? item.description}
              </Text>
              {skill !== undefined && skill.resource.type !== 'none' && (
                <Text style={styles.cardCost}>
                  {skill.resource.type} {isSpecified(skill.resource.cost) ? skill.resource.cost : '?'} · CT {isSpecified(skill.ctCost) ? skill.ctCost : '?'}
                </Text>
              )}
            </Pressable>
          );
        }}
      />

      <View style={styles.footer}>
        <PrimaryButton
          title="Confirm Pick"
          onPress={handleConfirm}
          disabled={selectedSkillId === null}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a1a' },
  title: { fontSize: 22, fontWeight: '700', color: '#ffffff', padding: 20, paddingBottom: 4 },
  subtitle: { fontSize: 13, color: '#aabbcc', paddingHorizontal: 20, marginBottom: 8 },
  list: { paddingHorizontal: 16, paddingBottom: 16, gap: 10 },
  card: {
    borderWidth: 1.5,
    borderColor: 'rgba(0,255,255,0.1)',
    borderRadius: 12,
    padding: 14,
    backgroundColor: 'rgba(255,255,255,0.03)',
    gap: 4,
  },
  cardSelected: {
    borderColor: '#2d5ca8',
    backgroundColor: '#eaf0ff',
  },
  slotBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    marginBottom: 4,
  },
  slotBadgeText: { fontSize: 10, fontWeight: '700' },
  cardName: { fontSize: 15, fontWeight: '700', color: '#1e3a5f' },
  cardDescription: { fontSize: 12, color: '#aabbcc', lineHeight: 17 },
  cardCost: { fontSize: 11, color: '#8b6f3a', fontWeight: '600', marginTop: 2 },
  footer: { padding: 20, borderTopWidth: 1, borderTopColor: 'rgba(0,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.03)' },
});
