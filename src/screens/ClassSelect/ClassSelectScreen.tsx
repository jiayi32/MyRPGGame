import { useMemo, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '@/navigation/AppNavigator';
import { CLASS_BY_ID } from '@/content';
import type { ClassData, ClassId } from '@/content/types';
import { usePlayerStore, useRunStore } from '@/stores';
import { PrimaryButton } from '@/components/atoms/PrimaryButton';
import { ClassCard } from './ClassCard';

type Props = NativeStackScreenProps<HomeStackParamList, 'ClassSelect'>;

export function ClassSelectScreen({ navigation }: Props) {
  const ownedClassIds = usePlayerStore((state) => state.ownedClassIds);
  const startRun = useRunStore((state) => state.startRun);
  const runStatus = useRunStore((state) => state.status);

  const [selectedId, setSelectedId] = useState<ClassId | null>(
    ownedClassIds.length === 1 ? (ownedClassIds[0] as ClassId) : null,
  );

  // Build a map from class ID → display name of the class that evolves into it.
  const unlocksFromMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of CLASS_BY_ID.values()) {
      for (const targetId of c.evolutionTargetClassIds) {
        if (!map.has(targetId)) map.set(targetId, c.name);
      }
    }
    return map;
  }, []);

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
            unlocksFromName={unlocksFromMap.get(item.id)}
            onPress={() => setSelectedId(item.id as ClassId)}
          />
        )}
      />

      <View style={styles.footer}>
        <PrimaryButton
          title="Begin Run"
          onPress={() => {
            handleBeginRun().catch(() => undefined);
          }}
          disabled={selectedId === null || isStarting}
          busy={isStarting}
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
  footer: { padding: 20, borderTopWidth: 1, borderTopColor: '#d8cdbb', backgroundColor: '#fffdf8' },
});
