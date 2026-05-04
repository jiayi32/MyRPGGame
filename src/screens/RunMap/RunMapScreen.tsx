import { useRef } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '@/navigation/AppNavigator';
import { useRunStore } from '@/stores';
import { CLASS_BY_ID } from '@/content';
import type { ClassId } from '@/content/types';

type Props = NativeStackScreenProps<HomeStackParamList, 'RunMap'>;

const TOTAL_STAGES = 30;

type StageMarker = 'normal' | 'mini_boss' | 'gate' | 'counter';

const STAGE_MARKERS: Record<number, StageMarker> = {
  5: 'mini_boss',
  10: 'gate',
  20: 'gate',
  30: 'counter',
};

const MARKER_LABEL: Record<StageMarker, string> = {
  normal: '',
  mini_boss: 'Mini-Boss',
  gate: 'Checkpoint',
  counter: 'Counter Boss',
};

const MARKER_COLORS: Record<StageMarker, { bg: string; border: string; text: string }> = {
  normal: { bg: '#fffdf8', border: '#d8cdbb', text: '#4a3a28' },
  mini_boss: { bg: '#fff0e0', border: '#c06020', text: '#7a3000' },
  gate: { bg: '#e8f4e8', border: '#4a9a5a', text: '#1a5a2a' },
  counter: { bg: '#ffe8e8', border: '#c02020', text: '#7a0000' },
};

const CURRENT_COLORS = { bg: '#e8f0ff', border: '#2a5ab0', text: '#1a3a8a' };
const DONE_COLORS = { bg: '#f0f0f0', border: '#c0c0c0', text: '#888' };

function StageNode({
  stageNum,
  currentStage,
}: {
  stageNum: number;
  currentStage: number;
}) {
  const marker = STAGE_MARKERS[stageNum] ?? 'normal';
  const isCurrent = stageNum === currentStage;
  const isDone = stageNum < currentStage;

  const colors = isCurrent
    ? CURRENT_COLORS
    : isDone
      ? DONE_COLORS
      : MARKER_COLORS[marker];

  return (
    <View style={[styles.node, { backgroundColor: colors.bg, borderColor: colors.border }]}>
      <View style={styles.nodeLeft}>
        <Text style={[styles.stageNum, { color: colors.text }]}>{stageNum}</Text>
        {isDone && <Text style={styles.doneCheck}> ✓</Text>}
        {isCurrent && <Text style={[styles.currentDot, { color: colors.text }]}> ●</Text>}
      </View>
      <View style={styles.nodeRight}>
        {marker !== 'normal' && (
          <View style={[styles.markerTag, { backgroundColor: colors.border }]}>
            <Text style={styles.markerTagText}>{MARKER_LABEL[marker]}</Text>
          </View>
        )}
        {isCurrent && (
          <View style={styles.currentTag}>
            <Text style={styles.currentTagText}>Current</Text>
          </View>
        )}
      </View>
    </View>
  );
}

export function RunMapScreen({ navigation }: Props) {
  const stage = useRunStore((state) => state.stage);
  const activeClassId = useRunStore((state) => state.activeClassId);
  const vaultStreak = useRunStore((state) => state.vaultStreak);
  const currentStage = stage ?? 1;

  const stages = Array.from({ length: TOTAL_STAGES }, (_, i) => i + 1);

  const completedCount = Math.max(0, currentStage - 1);
  const remaining = TOTAL_STAGES - completedCount;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Run Map</Text>
        <Text style={styles.subtitle}>
          Stage {currentStage} of {TOTAL_STAGES}  ·  {completedCount} completed  ·  {remaining} remaining
        </Text>
        {activeClassId !== null && (
          <Text style={styles.classLabel}>{CLASS_BY_ID.get(activeClassId as ClassId)?.name ?? activeClassId}</Text>
        )}
        {vaultStreak > 0 && (
          <Text style={styles.vaultStreakLabel}>⚠ Vault streak: {vaultStreak} stage{vaultStreak > 1 ? 's' : ''} at risk
          </Text>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.stageList}>
        {stages.map((n) => (
          <StageNode key={n} stageNum={n} currentStage={currentStage} />
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f4ef' },
  header: {
    padding: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#d8cdbb',
    gap: 4,
  },
  title: { fontSize: 22, fontWeight: '700', color: '#2b1f10' },
  subtitle: { fontSize: 13, color: '#5d4d35' },
  classLabel: { fontSize: 12, color: '#7b684a', fontStyle: 'italic' },
  vaultStreakLabel: { fontSize: 12, color: '#8b5a00', fontWeight: '600' },
  stageList: { paddingHorizontal: 16, paddingVertical: 12, gap: 6 },
  node: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1.5,
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 8,
  },
  nodeLeft: { flexDirection: 'row', alignItems: 'center', width: 52 },
  nodeRight: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  stageNum: { fontSize: 14, fontWeight: '700', minWidth: 24 },
  doneCheck: { fontSize: 13, color: '#5a9a6a' },
  currentDot: { fontSize: 13 },
  markerTag: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  markerTagText: { fontSize: 10, color: '#fff', fontWeight: '600' },
  currentTag: {
    borderRadius: 4,
    backgroundColor: '#2a5ab0',
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  currentTagText: { fontSize: 10, color: '#fff', fontWeight: '700' },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#d8cdbb',
    backgroundColor: '#fffdf8',
  },
  backBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d8cdbb',
    backgroundColor: '#fffdf8',
  },
  backBtnText: { fontSize: 14, color: '#4a3a28', fontWeight: '600' },
});
