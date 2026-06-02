import { useEffect } from 'react';
import { Alert, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '@/navigation/AppNavigator';
import { usePlayerStore, useRunStore } from '@/stores';
import { useCombatStore } from '@/stores/combatStore';
import { PrimaryButton } from '@/components/atoms/PrimaryButton';
import { ScreenWrapper } from '@/components/atoms/ScreenWrapper';
import { Card } from '@/components/atoms/Card';
import { ThemeText } from '@/components/atoms/ThemeText';
import { colors, spacing, radius } from '@/design';
import { useGearInventory } from '@/hooks/useGearInventory';

export function HubScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();

  const runStatus = useRunStore((state) => state.status);
  const runError = useRunStore((state) => state.error);
  const runId = useRunStore((state) => state.runId);
  const stage = useRunStore((state) => state.stage);
  const selectedRiskContractIds = useRunStore((state) => state.selectedRiskContractIds);
  const bootstrap = useRunStore((state) => state.bootstrap);
  const endRunAction = useRunStore((state) => state.endRun);

  const playerStatus = usePlayerStore((state) => state.status);
  const uid = usePlayerStore((state) => state.uid);
  const playerError = usePlayerStore((state) => state.error);

  const clearCombat = useCombatStore((state) => state.clear);
  const { instances: gearInstances } = useGearInventory();

  useEffect(() => {
    bootstrap().catch(() => undefined);
  }, [bootstrap]);

  const isLoading =
    runStatus === 'initializing' ||
    runStatus === 'starting_run';

  const hasActiveRun = runId !== null && runStatus === 'run_active';
  const hasUnequippedGear = hasActiveRun && gearInstances.some((i) => !i.equipped);
  const forfeitBlocked = selectedRiskContractIds.includes('contract.no_forfeit');

  const handleStartNew = () => {
    clearCombat();
    navigation.navigate('OnboardingNarrative');
  };

  const handleResume = () => {
    navigation.navigate('RunMap');
  };

  const handleForfeit = (): void => {
    Alert.alert('Forfeit Run?', 'End this run as fled. Banked and vaulted rewards are secured, but progression is reduced.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Forfeit',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              await endRunAction('fled');
            } catch {
              // surfaced by run store
            }
          })();
        },
      },
    ]);
  };

  const error = runError ?? playerError;

  return (
    <ScreenWrapper mode="parchment">
      <ThemeText textRole="heading" size="2xl" color={colors.accent.gold}>
        MyRPGGame
      </ThemeText>
      <ThemeText textRole="body" size="sm" colorKey="secondary" style={{ marginBottom: spacing.lg }}>
        Forge Your Lineage
      </ThemeText>

      <Card variant="stat" style={{ marginBottom: spacing.lg }}>
        <ThemeText textRole="label" size="xs" colorKey="secondary" uppercase>
          Player
        </ThemeText>
        <ThemeText textRole="body" size="md" style={{ marginBottom: spacing.sm }}>
          {uid ?? 'Signing in…'}
        </ThemeText>
        <ThemeText textRole="label" size="xs" colorKey="secondary" uppercase>
          Status
        </ThemeText>
        <ThemeText textRole="body" size="md">
          {playerStatus}
        </ThemeText>
      </Card>

      {hasActiveRun && (
        <Card
          variant="selection"
          selected
          style={{ marginBottom: spacing.lg }}
        >
          <ThemeText textRole="heading" size="md">
            Active Run
          </ThemeText>
          <ThemeText textRole="pixel" size="md" style={{ marginVertical: spacing.sm }}>
            Stage {stage ?? '?'}
          </ThemeText>
          <ThemeText textRole="body" size="xs" colorKey="secondary">
            {runId}
          </ThemeText>
          {hasUnequippedGear && (
            <ThemeText textRole="body" size="xs" color={colors.accent.amber} style={{ fontStyle: 'italic', marginTop: spacing.sm }}>
              ⚠ You have unequipped gear — check the Equipment tab before heading back.
            </ThemeText>
          )}
          {forfeitBlocked ? (
            <View style={styles.forfeitBlockedRow}>
              <ThemeText textRole="body" size="sm" colorKey="secondary" style={{ fontStyle: 'italic' }}>
                🚫 No Retreat Oath active — forfeit disabled
              </ThemeText>
            </View>
          ) : (
            <TouchableOpacity onPress={handleForfeit} style={styles.forfeitLink}>
              <ThemeText textRole="body" size="xs" color={colors.accent.crimson} style={{ textDecorationLine: 'underline' }}>
                Forfeit Run
              </ThemeText>
            </TouchableOpacity>
          )}
        </Card>
      )}

      {error !== null && (
        <ThemeText textRole="body" size="sm" color={colors.accent.crimson} style={{ marginBottom: spacing.md }}>
          {error}
        </ThemeText>
      )}

      <View style={styles.actions}>
        {hasActiveRun ? (
          <PrimaryButton title="Resume Run" variant="secondary" onPress={handleResume} />
        ) : (
          <PrimaryButton
            title="Start New Run"
            onPress={handleStartNew}
            disabled={isLoading || playerStatus !== 'ready'}
            busy={isLoading}
          />
        )}
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  forfeitLink: { alignSelf: 'flex-start', marginTop: spacing.sm },
  forfeitBlockedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  actions: { gap: spacing.md, marginTop: spacing.xl },
});
