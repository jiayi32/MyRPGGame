import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/AppNavigator';
import { CLASS_BY_ID } from '@/content';
import type { ClassId } from '@/content/types';
import { formatCallableError, upgradeClass } from '@/services/runApi';
import { usePlayerStore } from '@/stores';
import { useRunStore } from '@/stores/runStore';
import { useCombatStore } from '@/stores/combatStore';

function StatRow({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

export function ProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const uid = usePlayerStore((state) => state.uid);
  const goldBank = usePlayerStore((state) => state.goldBank);
  const ascensionCells = usePlayerStore((state) => state.ascensionCells);
  const lineageRanks = usePlayerStore((state) => state.lineageRanks);
  const classRanks = usePlayerStore((state) => state.classRanks);
  const xpScrolls = usePlayerStore((state) => state.xpScrolls);
  const ownedClassIds = usePlayerStore((state) => state.ownedClassIds);
  const playerStatus = usePlayerStore((state) => state.status);
  const applyPlayerSnapshot = usePlayerStore((state) => state.applyPlayerSnapshot);

  const signOutAndReset = usePlayerStore((state) => state.signOutAndReset);
  const resetRun = useRunStore((state) => state.resetRun);
  const clearCombat = useCombatStore((state) => state.clear);

  const lineageEntries = Object.entries(lineageRanks).filter(([, rank]) => rank > 0);
  const [busyClassId, setBusyClassId] = useState<string | null>(null);
  const [upgradeError, setUpgradeError] = useState<string | null>(null);

  const handleUpgradeClass = async (classId: string): Promise<void> => {
    setBusyClassId(classId);
    setUpgradeError(null);
    try {
      const response = await upgradeClass({ classId });
      applyPlayerSnapshot(response.player);
    } catch (error) {
      setUpgradeError(formatCallableError(error));
    } finally {
      setBusyClassId(null);
    }
  };

  const handleSignOut = (): void => {
    Alert.alert(
      'Sign Out',
      'Sign out of this account? Your save is preserved on the server.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: () => {
            clearCombat();
            resetRun();
            signOutAndReset().catch(() => undefined);
          },
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
        <Text style={styles.subtitle}>Player progression & stats</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Account</Text>
          <StatRow label="UID" value={uid ?? 'Not signed in'} />
          <StatRow label="Status" value={playerStatus} />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Resources</Text>
          <StatRow label="Gold" value={goldBank} />
          <StatRow label="Ascension Cells" value={ascensionCells} />
          <StatRow label="XP Scrolls" value={`M ${xpScrolls.minor} / S ${xpScrolls.standard} / G ${xpScrolls.grand}`} />
        </View>

        {lineageEntries.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Lineage Ranks</Text>
            {lineageEntries.map(([lineageId, rank]) => (
              <StatRow key={lineageId} label={lineageId.replace(/_/g, ' ')} value={`Rank ${rank}`} />
            ))}
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Owned Classes ({ownedClassIds.length})</Text>
          {upgradeError !== null && <Text style={styles.errorText}>{upgradeError}</Text>}
          {ownedClassIds.map((id) => {
            const c = CLASS_BY_ID.get(id as ClassId);
            const rank = Math.max(0, Math.trunc(classRanks[id] ?? 0));
            const maxed = rank >= 10;
            const busy = busyClassId === id;
            return (
              <View key={id} style={styles.classRow}>
                <View style={styles.classMeta}>
                  <Text style={styles.className}>{c?.name ?? id}</Text>
                  <Text style={styles.classTier}>T{c?.tier ?? '?'}  Rank {rank}</Text>
                </View>
                <TouchableOpacity
                  disabled={maxed || busy}
                  onPress={() => {
                    handleUpgradeClass(id).catch(() => undefined);
                  }}
                  style={[styles.upgradeBtn, (maxed || busy) && styles.upgradeBtnDisabled]}
                >
                  <Text style={styles.upgradeBtnText}>{maxed ? 'MAX' : busy ? '...' : 'Upgrade'}</Text>
                </TouchableOpacity>
              </View>
            );
          })}
          {ownedClassIds.length === 0 && (
            <Text style={styles.emptyHint}>No classes yet.</Text>
          )}
        </View>

        <TouchableOpacity
          style={styles.signOutBtn}
          onPress={handleSignOut}
        >
          <Text style={styles.signOutBtnText}>Sign Out</Text>
        </TouchableOpacity>

        {__DEV__ && (
          <TouchableOpacity
            style={styles.devBtn}
            onPress={() => navigation.navigate('DevTools')}
          >
            <Text style={styles.devBtnText}>🛠 Dev Tools</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.diagBtn}
          onPress={() =>
            navigation.navigate('MainTabs', {
              screen: 'HomeStack',
              params: { screen: 'Placeholder' },
            })
          }
        >
          <Text style={styles.diagBtnText}>Diagnostics</Text>
        </TouchableOpacity>
      </ScrollView>
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
  content: { padding: 16, gap: 12 },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d8cdbb',
    backgroundColor: '#fffdf8',
    padding: 14,
    gap: 8,
  },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#4a3a28', marginBottom: 2 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statLabel: { fontSize: 13, color: '#7b684a' },
  statValue: { fontSize: 13, fontWeight: '600', color: '#2b1f10' },
  classRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  classMeta: { flex: 1, gap: 2 },
  className: { fontSize: 14, color: '#2b1f10' },
  classTier: { fontSize: 12, color: '#7b684a', fontWeight: '600' },
  upgradeBtn: {
    borderRadius: 6,
    backgroundColor: '#7a3b00',
    paddingHorizontal: 10,
    paddingVertical: 5,
    minWidth: 72,
    alignItems: 'center',
  },
  upgradeBtnDisabled: { backgroundColor: '#b9ab96' },
  upgradeBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  errorText: { fontSize: 12, color: '#8b1a1a' },
  emptyHint: { fontSize: 13, color: '#9e8870', fontStyle: 'italic' },
  diagBtn: {
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d8cdbb',
    backgroundColor: '#fffdf8',
    marginTop: 4,
  },
  diagBtnText: { fontSize: 13, color: '#9e8870' },
  signOutBtn: {
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#a04040',
    backgroundColor: '#fff',
    marginTop: 12,
  },
  signOutBtnText: { fontSize: 13, color: '#a04040', fontWeight: '600' },
  devBtn: {
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3a8a5a',
    backgroundColor: '#1d212e',
    marginTop: 8,
  },
  devBtnText: { fontSize: 13, color: '#80c090', fontWeight: '600' },
});
