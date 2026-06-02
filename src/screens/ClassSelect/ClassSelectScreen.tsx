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
import { getUnlockHint } from '@/domain/run/progression';
import { usePlayerStore, useRunStore } from '@/stores';
import { PrimaryButton } from '@/components/atoms/PrimaryButton';
import { ClassCard } from './ClassCard';

type Props = NativeStackScreenProps<HomeStackParamList, 'ClassSelect'>;

export function ClassSelectScreen({ navigation }: Props) {
  const ownedClassIds = usePlayerStore((state) => state.ownedClassIds);
  const runStatus = useRunStore((state) => state.status);

  const [selectedId, setSelectedId] = useState<ClassId | null>(
    ownedClassIds.length === 1 ? (ownedClassIds[0] as ClassId) : null,
  );

  const ownedSet = useMemo(() => new Set(ownedClassIds), [ownedClassIds]);

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

  // Collect locked classes the player can see:
  // - All Tier 1 classes they don't own (other starting options)
  // - Immediate evolution targets of owned classes
  const lockedIds = useMemo(() => {
    const ids = new Set<string>();
    // T1 classes the player doesn't own yet — they should know these exist.
    for (const c of CLASS_BY_ID.values()) {
      if (c.tier === 1 && !ownedSet.has(c.id)) {
        ids.add(c.id);
      }
    }
    // Immediate evolution targets of owned classes.
    for (const id of ownedClassIds) {
      const c = CLASS_BY_ID.get(id as ClassId);
      if (c) {
        for (const targetId of c.evolutionTargetClassIds) {
          if (!ownedSet.has(targetId)) {
            ids.add(targetId);
          }
        }
      }
    }
    return ids;
  }, [ownedClassIds, ownedSet]);

  const displayClasses: ClassData[] = useMemo(() => {
    const owned: ClassData[] = [];
    const locked: ClassData[] = [];
    for (const c of CLASS_BY_ID.values()) {
      if (ownedSet.has(c.id)) {
        owned.push(c);
      } else if (lockedIds.has(c.id)) {
        locked.push(c);
      }
    }
    // Sort by tier then name for readability.
    owned.sort((a, b) => a.tier - b.tier || a.name.localeCompare(b.name));
    locked.sort((a, b) => a.tier - b.tier || a.name.localeCompare(b.name));
    return [...owned, ...locked];
  }, [ownedSet, lockedIds]);

  const isStarting = runStatus === 'starting_run';

  const handleConfirmClass = () => {
    if (selectedId === null) return;
    navigation.navigate('RiskContractSelect', { classId: selectedId });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Choose Your Class</Text>
      <Text style={styles.subtitle}>Select a class to begin the run.</Text>

      <FlatList
        data={displayClasses}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const owned = ownedSet.has(item.id);
          return (
            <ClassCard
              classData={item}
              owned={owned}
              selected={selectedId === item.id}
              unlocksFromName={unlocksFromMap.get(item.id)}
              unlockHint={
                owned
                  ? undefined
                  : getUnlockHint(item, ownedClassIds, CLASS_BY_ID)
              }
              onPress={() => setSelectedId(item.id as ClassId)}
            />
          );
        }}
      />

      <View style={styles.footer}>
        <PrimaryButton
          title="Confirm Class"
          onPress={handleConfirmClass}
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
