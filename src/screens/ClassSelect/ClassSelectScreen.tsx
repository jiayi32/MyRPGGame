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
import { CLASS_BY_ID, RISK_CONTRACTS } from '@/content';
import type { ClassData, ClassId, RiskContractId } from '@/content/types';
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
  const [selectedRiskContractIds, setSelectedRiskContractIds] = useState<RiskContractId[]>([]);

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
      await startRun(selectedId, { selectedRiskContractIds });
      navigation.replace('RunMap');
    } catch {
      // Error surfaced by runStore.
    }
  };

  const toggleRiskContract = (contractId: RiskContractId) => {
    setSelectedRiskContractIds((previous) => {
      if (previous.includes(contractId)) {
        return previous.filter((id) => id !== contractId);
      }
      if (previous.length >= 2) {
        return previous;
      }
      return [...previous, contractId];
    });
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

      <View style={styles.contractPanel}>
        <Text style={styles.contractTitle}>Risk Contracts (optional, max 2)</Text>
        {RISK_CONTRACTS.map((contract) => {
          const selected = selectedRiskContractIds.includes(contract.id);
          return (
            <Pressable
              key={contract.id}
              onPress={() => toggleRiskContract(contract.id)}
              style={[styles.contractRow, selected ? styles.contractRowSelected : null]}
            >
              <View style={styles.contractHeaderRow}>
                <Text style={styles.contractName}>{contract.name}</Text>
                <Text style={styles.contractReward}>{contract.rewardBonusLabel}</Text>
              </View>
              <Text style={styles.contractDescription}>{contract.description}</Text>
            </Pressable>
          );
        })}
      </View>

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
  contractPanel: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d8cdbb',
    backgroundColor: '#fffdf8',
    gap: 8,
  },
  contractTitle: { fontSize: 13, fontWeight: '700', color: '#4a3821' },
  contractRow: {
    borderWidth: 1,
    borderColor: '#d8cdbb',
    borderRadius: 10,
    padding: 10,
    backgroundColor: '#f8f2e8',
    gap: 4,
  },
  contractRowSelected: {
    borderColor: '#8b5a2b',
    backgroundColor: '#efe1ca',
  },
  contractHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  contractName: { flex: 1, fontSize: 14, fontWeight: '700', color: '#2b1f10' },
  contractReward: { fontSize: 12, fontWeight: '700', color: '#7f5428' },
  contractDescription: { fontSize: 12, color: '#5f4d34' },
  footer: { padding: 20, borderTopWidth: 1, borderTopColor: '#d8cdbb', backgroundColor: '#fffdf8' },
});
