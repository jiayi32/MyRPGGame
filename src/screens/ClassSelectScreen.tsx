import { useState } from 'react';
import {
  Button,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/AppNavigator';
import { CLASS_BY_ID } from '@/content';
import type { ClassData, ClassId } from '@/content/types';
import { usePlayerStore, useRunStore } from '@/stores';

type Props = NativeStackScreenProps<RootStackParamList, 'ClassSelect'>;

const TIER_LABELS: Record<number, string> = { 1: 'T1', 2: 'T2', 3: 'T3', 4: 'T4', 5: 'T5' };
const ROLE_COLORS: Record<string, string> = {
  DPS: '#8b2020',
  Tank: '#1a4a8b',
  Support: '#1a7a2a',
  Control: '#5a1a8b',
  Hybrid: '#7a5a10',
};

function ClassCard({
  classData,
  owned,
  selected,
  onPress,
}: {
  classData: ClassData;
  owned: boolean;
  selected: boolean;
  onPress: () => void;
}) {
  const roleColor = ROLE_COLORS[classData.role] ?? '#444';

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!owned}
      style={[
        styles.card,
        selected && styles.cardSelected,
        !owned && styles.cardLocked,
      ]}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.tierBadge, { backgroundColor: owned ? '#7a3b00' : '#aaa' }]}>
          <Text style={styles.tierText}>{TIER_LABELS[classData.tier] ?? `T${classData.tier}`}</Text>
        </View>
        <Text style={[styles.cardName, !owned && styles.lockedText]}>
          {classData.name}
          {!owned ? '  🔒' : ''}
        </Text>
        <View style={[styles.roleBadge, { borderColor: owned ? roleColor : '#bbb' }]}>
          <Text style={[styles.roleText, { color: owned ? roleColor : '#aaa' }]}>
            {classData.role}
          </Text>
        </View>
      </View>

      {owned ? (
        <Text style={styles.cardDesc} numberOfLines={2}>
          {classData.description}
        </Text>
      ) : (
        <Text style={styles.lockHint}>
          Unlock by completing a run with an evolution path to this class.
        </Text>
      )}

      {selected && owned && (
        <View style={styles.selectedBadge}>
          <Text style={styles.selectedText}>Selected</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

export function ClassSelectScreen({ navigation }: Props) {
  const ownedClassIds = usePlayerStore((state) => state.ownedClassIds);
  const startRun = useRunStore((state) => state.startRun);
  const runStatus = useRunStore((state) => state.status);

  const [selectedId, setSelectedId] = useState<ClassId | null>(
    ownedClassIds.length === 1 ? (ownedClassIds[0] as ClassId) : null,
  );

  // Show owned classes first, then immediate evolution targets (locked).
  const reachableLockedIds = new Set<string>();
  for (const id of ownedClassIds) {
    const c = CLASS_BY_ID.get(id as ClassId);
    if (c) {
      for (const targetId of c.evolutionTargetClassIds) {
        if (!ownedClassIds.includes(targetId)) {
          reachableLockedIds.add(targetId);
        }
      }
    }
  }

  const displayClasses: ClassData[] = [
    ...ownedClassIds
      .map((id) => CLASS_BY_ID.get(id as ClassId))
      .filter((c): c is ClassData => c !== undefined),
    ...[...reachableLockedIds]
      .map((id) => CLASS_BY_ID.get(id as ClassId))
      .filter((c): c is ClassData => c !== undefined),
  ];

  const isStarting = runStatus === 'starting_run';

  const handleBeginRun = async () => {
    if (selectedId === null) return;
    try {
      await startRun(selectedId);
      navigation.replace('Battle');
    } catch {
      // Error surfaced by runStore.
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Choose Your Class</Text>
      <Text style={styles.subtitle}>Select a class to begin the run.</Text>

      <FlatList
        data={displayClasses}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <ClassCard
            classData={item}
            owned={ownedClassIds.includes(item.id)}
            selected={selectedId === item.id}
            onPress={() => setSelectedId(item.id as ClassId)}
          />
        )}
      />

      <View style={styles.footer}>
        <Button
          title={isStarting ? 'Starting…' : 'Begin Run'}
          onPress={() => {
            handleBeginRun().catch(() => undefined);
          }}
          disabled={selectedId === null || isStarting}
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
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#d8cdbb',
    backgroundColor: '#fffdf8',
    padding: 14,
    gap: 6,
  },
  cardSelected: {
    borderColor: '#7a3b00',
    backgroundColor: '#fff8f0',
  },
  cardLocked: {
    opacity: 0.55,
    backgroundColor: '#f0ece4',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tierBadge: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  tierText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  cardName: { flex: 1, fontSize: 16, fontWeight: '600', color: '#2b1f10' },
  lockedText: { color: '#888' },
  roleBadge: {
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  roleText: { fontSize: 11, fontWeight: '600' },
  cardDesc: { fontSize: 13, color: '#5a4838', lineHeight: 18 },
  lockHint: { fontSize: 12, color: '#9e8870', fontStyle: 'italic' },
  selectedBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#7a3b00',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  selectedText: { fontSize: 11, color: '#fff', fontWeight: '600' },
  footer: { padding: 20, borderTopWidth: 1, borderTopColor: '#d8cdbb', backgroundColor: '#fffdf8' },
});
