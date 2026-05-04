import { useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useShallow } from 'zustand/react/shallow';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/AppNavigator';
import { usePlayerStore } from '@/stores';
import { useRunStore } from '@/stores/runStore';
import { useCombatStore } from '@/stores/combatStore';
import { PrimaryButton } from '@/components/atoms/PrimaryButton';
import { ToolButton } from './ToolButton';
import {
  devGrantAllClasses,
  devResetPlayer,
  devSetCurrencies,
  devSkipStage,
  formatCallableError,
} from '@/services/runApi';
import type { StageOutcomeResult } from '@/features/run/types';

export function DevToolsScreen() {
  const playerRefresh = usePlayerStore((state) => state.refresh);
  const playerReset = usePlayerStore((state) => state.reset);
  // Shallow-equality projection of the player fields the JSON dump renders. Subscribing to the
  // whole store via `usePlayerStore()` returned a fresh object reference on every set() and
  // triggered React's "getSnapshot should be cached" infinite-loop warning.
  const playerSnapshot = usePlayerStore(
    useShallow((s) => ({
      status: s.status,
      uid: s.uid,
      goldBank: s.goldBank,
      ascensionCells: s.ascensionCells,
      xpScrolls: s.xpScrolls,
      ownedClassIds: s.ownedClassIds,
      currentRunId: s.currentRunId,
    })),
  );

  const runRefresh = useRunStore((state) => state.refreshRunSnapshot);
  const runReset = useRunStore((state) => state.resetRun);
  const runSnapshot = useRunStore(
    useShallow((s) => ({
      status: s.status,
      runId: s.runId,
      stage: s.stage,
      activeClassId: s.activeClassId,
      runResult: s.runResult,
    })),
  );
  const clearCombat = useCombatStore((state) => state.clear);
  const forceFinish = useCombatStore((state) => state.forceFinish);
  const preparedStageIndex = useCombatStore((state) => state.prepared?.stageIndex ?? null);

  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [skipTarget, setSkipTarget] = useState('30');
  const [goldInput, setGoldInput] = useState('');
  const [cellsInput, setCellsInput] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<string | null>(null);

  const surfaceError = (label: string, e: unknown): void => {
    const msg = formatCallableError(e);
    Alert.alert(`${label} failed`, msg);
    setLastResult(`${label}: ERROR — ${msg}`);
  };

  const run = async (label: string, fn: () => Promise<unknown>): Promise<void> => {
    setBusy(label);
    setLastResult(null);
    try {
      const result = await fn();
      setLastResult(`${label}: ok ${JSON.stringify(result)}`);
    } catch (e) {
      surfaceError(label, e);
    } finally {
      setBusy(null);
    }
  };

  const handleSkipStage = async (): Promise<void> => {
    const target = Number.parseInt(skipTarget, 10);
    if (!Number.isFinite(target) || target < 1 || target > 30) {
      Alert.alert('Invalid stage', 'Enter a stage between 1 and 30.');
      return;
    }
    const runId = runSnapshot.runId;
    if (runId === null) {
      Alert.alert('No active run', 'Start a run first.');
      return;
    }
    await run('Skip stage', async () => {
      const result = await devSkipStage(runId, target);
      await runRefresh();
      return result;
    });
  };

  const handleGrantAllClasses = async (): Promise<void> => {
    await run('Grant classes', async () => {
      const result = await devGrantAllClasses();
      await playerRefresh();
      return result;
    });
  };

  const handleResetPlayer = async (): Promise<void> => {
    Alert.alert(
      'Reset player save',
      'This deletes your player profile, all run docs, and all gear instances. Sign-out is recommended afterwards. Proceed?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            void run('Reset player', async () => {
              const result = await devResetPlayer();
              clearCombat();
              runReset();
              playerReset();
              return result;
            });
          },
        },
      ],
    );
  };

  const handleForceOutcome = (result: StageOutcomeResult): void => {
    if (preparedStageIndex === null) {
      Alert.alert('No prepared stage', 'Begin a battle first (Hub → Start Run → Begin Run).');
      return;
    }
    try {
      forceFinish(result);
      setLastResult(`Force ${result}: ok — return to Battle to submit`);
      // Navigate back to the Battle screen so the user immediately sees the result card.
      navigation.navigate('MainTabs', {
        screen: 'HomeStack',
        params: { screen: 'Battle' },
      });
    } catch (e) {
      surfaceError(`Force ${result}`, e);
    }
  };

  const handleSetCurrencies = async (): Promise<void> => {
    const goldNum = goldInput.length === 0 ? undefined : Number.parseInt(goldInput, 10);
    const cellsNum = cellsInput.length === 0 ? undefined : Number.parseInt(cellsInput, 10);
    const validate = (label: string, n: number | undefined): boolean => {
      if (n === undefined) return true;
      if (!Number.isFinite(n) || n < 0) {
        Alert.alert('Invalid input', `${label} must be a non-negative integer.`);
        return false;
      }
      return true;
    };
    if (!validate('Gold', goldNum) || !validate('Cells', cellsNum)) return;
    if (goldNum === undefined && cellsNum === undefined) {
      Alert.alert('Nothing to set', 'Enter at least one value.');
      return;
    }
    await run('Set currencies', async () => {
      const payload: Record<string, number> = {};
      if (goldNum !== undefined) payload['goldBank'] = goldNum;
      if (cellsNum !== undefined) payload['ascensionCells'] = cellsNum;
      const result = await devSetCurrencies(payload);
      await playerRefresh();
      return result;
    });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.warning}>
        ⚠ Dev tools — server-gated by ALLOW_DEV_TOOLS. Calls fail in prod.
      </Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Run Control</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={skipTarget}
            onChangeText={setSkipTarget}
            keyboardType="number-pad"
            placeholder="Target stage 1-30"
          />
          <ToolButton
            label="Skip to stage"
            onPress={() => { void handleSkipStage(); }}
            busy={busy === 'Skip stage'}
          />
        </View>
        <Text style={styles.hint}>
          Sets the active run's stage pointer. You still play stage outcomes from there.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Force outcome</Text>
        <View style={styles.forceRow}>
          <PrimaryButton
            title="Force: Won"
            variant="secondary"
            onPress={() => handleForceOutcome('won')}
            disabled={preparedStageIndex === null}
            fullWidth={false}
            style={styles.forceBtn}
          />
          <PrimaryButton
            title="Force: Lost"
            variant="destructive"
            onPress={() => handleForceOutcome('lost')}
            disabled={preparedStageIndex === null}
            fullWidth={false}
            style={styles.forceBtn}
          />
          <PrimaryButton
            title="Force: Fled"
            variant="secondary"
            onPress={() => handleForceOutcome('fled')}
            disabled={preparedStageIndex === null}
            fullWidth={false}
            style={styles.forceBtn}
          />
        </View>
        <Text style={styles.hint}>
          Synthesises a terminal report for the current stage without running combat. Returns you
          to the Battle screen with the result card; tap Submit & Continue to apply normally.
          Requires a prepared stage (start a run first).
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Inventory</Text>
        <ToolButton
          label="Grant all Drakehorn classes"
          description="Adds T1-T5 to your owned class list."
          onPress={() => { void handleGrantAllClasses(); }}
          busy={busy === 'Grant classes'}
        />

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={goldInput}
            onChangeText={setGoldInput}
            keyboardType="number-pad"
            placeholder="Gold"
          />
          <TextInput
            style={styles.input}
            value={cellsInput}
            onChangeText={setCellsInput}
            keyboardType="number-pad"
            placeholder="Cells"
          />
          <ToolButton
            label="Set"
            onPress={() => { void handleSetCurrencies(); }}
            busy={busy === 'Set currencies'}
          />
        </View>
        <Text style={styles.hint}>
          Leave a field empty to keep the current value. Sets goldBank / ascensionCells absolute.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Save</Text>
        <ToolButton
          label="Reset player save"
          description="Wipes profile, runs, and gear for this account."
          destructive
          onPress={() => { void handleResetPlayer(); }}
          busy={busy === 'Reset player'}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Live State</Text>
        <Text style={styles.codeLabel}>playerStore</Text>
        <Text style={styles.code} selectable>
          {JSON.stringify(playerSnapshot, null, 2)}
        </Text>
        <Text style={styles.codeLabel}>runStore</Text>
        <Text style={styles.code} selectable>
          {JSON.stringify(runSnapshot, null, 2)}
        </Text>
      </View>

      {lastResult !== null && (
        <View style={styles.lastResultCard}>
          <Text style={styles.lastResultLabel}>Last action</Text>
          <Text style={styles.lastResult} selectable>
            {lastResult}
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1d212e' },
  content: { padding: 16, gap: 14, paddingBottom: 40 },
  warning: {
    fontSize: 12,
    color: '#f0a040',
    backgroundColor: '#2a221a',
    borderRadius: 8,
    padding: 10,
    fontStyle: 'italic',
  },
  section: {
    backgroundColor: '#262a3a',
    borderRadius: 10,
    padding: 14,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#9aa0c0',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputRow: { flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' },
  input: {
    flex: 1,
    minWidth: 80,
    backgroundColor: '#161927',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: '#d8dcef',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#363a52',
  },
  hint: { fontSize: 11, color: '#7a8090', fontStyle: 'italic' },
  forceRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  forceBtn: { flex: 1, minWidth: 96 },
  codeLabel: { fontSize: 10, color: '#7a8090', textTransform: 'uppercase', letterSpacing: 0.5 },
  code: {
    fontFamily: 'monospace',
    fontSize: 11,
    color: '#d0d4e8',
    backgroundColor: '#161927',
    borderRadius: 4,
    padding: 8,
  },
  lastResultCard: {
    backgroundColor: '#1a2a1a',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#3a8a5a',
  },
  lastResultLabel: { fontSize: 10, color: '#80a080', textTransform: 'uppercase', letterSpacing: 0.5 },
  lastResult: { fontSize: 11, color: '#d0e0d0', fontFamily: 'monospace', marginTop: 4 },
});
