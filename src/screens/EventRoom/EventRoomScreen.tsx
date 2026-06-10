// ─── Event Room Screen ───────────────────────────────────────────
// Simple choice screen for event rooms on the Run Map.
// Shows scenario flavor text and 2-3 choices with costs/rewards.

import React, { useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '@/navigation/AppNavigator';
import { RUN_EVENTS, type RunEvent, type EventChoice } from '@/content/events';
import { useRunStore } from '@/stores';
import { usePlayerStore } from '@/stores/playerStore';
import { PrimaryButton } from '@/components/atoms/PrimaryButton';
import { ScreenWrapper } from '@/components/atoms/ScreenWrapper';
import { ThemeText } from '@/components/atoms/ThemeText';
import { Card } from '@/components/atoms/Card';
import { colors, spacing, radius } from '@/design';

type Props = NativeStackScreenProps<HomeStackParamList, 'Placeholder'>;

/** Deterministically pick an event based on seed + stage. */
const pickEvent = (seed: number, stage: number): RunEvent => {
  const hash = ((seed * 7919 + stage * 6271) ^ (seed >> 3)) >>> 0;
  return RUN_EVENTS[hash % RUN_EVENTS.length] ?? RUN_EVENTS[0]!;
};

export function EventRoomScreen({ navigation, route }: Props) {
  const seed = useRunStore((state) => state.seed);
  const stage = useRunStore((state) => state.stage);
  const addStim = useRunStore((state) => state.addStim);
  const selectPassive = useRunStore((state) => state.selectPassive);
  const goldBank = usePlayerStore((state) => state.goldBank);

  const [resolved, setResolved] = useState(false);
  const [resultText, setResultText] = useState('');

  const event = useMemo(
    () => pickEvent(seed ?? 42, stage ?? 1),
    [seed, stage],
  );

  const handleChoice = (choice: EventChoice) => {
    const messages: string[] = [];

    // Apply costs
    if (choice.cost) {
      if (choice.cost.gold) {
        messages.push(`−${choice.cost.gold} gold`);
      }
      if (choice.cost.hpPercent) {
        messages.push(`−${choice.cost.hpPercent}% HP (applied next battle)`);
      }
      if (choice.cost.tempDebuff) {
        messages.push(`Temporary: ${choice.cost.tempDebuff}`);
      }
    }

    // Apply rewards
    if (choice.reward) {
      if (choice.reward.gold) {
        messages.push(`+${choice.reward.gold} gold`);
      }
      if (choice.reward.healPercent) {
        messages.push(`Healed ${choice.reward.healPercent}% HP`);
      }
      if (choice.reward.stims) {
        for (const stimId of choice.reward.stims) {
          addStim(stimId);
        }
        messages.push(`+${choice.reward.stims.length} stim${choice.reward.stims.length > 1 ? 's' : ''}`);
      }
      if (choice.reward.passiveId) {
        selectPassive(choice.reward.passiveId);
        messages.push('Gained a passive!');
      }
      if (choice.reward.revealMap) {
        messages.push('Map data downloaded — all rooms revealed!');
      }
    }

    if (messages.length === 0) {
      messages.push('You walk away unchanged.');
    }

    setResultText(messages.join('\n'));
    setResolved(true);
  };

  return (
    <ScreenWrapper mode="dark">
      <ScrollView contentContainerStyle={styles.container}>
        {!resolved ? (
          <>
            <ThemeText textRole="heading" size="xl" style={styles.title}>
              {event.name}
            </ThemeText>
            <Card variant="narrative" style={styles.flavorCard}>
              <ThemeText textRole="narrative" size="base" colorKey="secondary">
                {event.flavor}
              </ThemeText>
            </Card>
            <ThemeText textRole="label" size="sm" colorKey="secondary" uppercase style={styles.choicesLabel}>
              What do you do?
            </ThemeText>
            {event.choices.map((choice) => (
              <TouchableOpacity
                key={choice.id}
                style={styles.choiceCard}
                onPress={() => handleChoice(choice)}
                activeOpacity={0.7}
              >
                <ThemeText textRole="label" size="md" style={styles.choiceLabel}>
                  {choice.label}
                </ThemeText>
                <ThemeText textRole="body" size="sm" colorKey="secondary" style={styles.choiceDesc}>
                  {choice.description}
                </ThemeText>
                {choice.cost && (
                  <View style={styles.costRow}>
                    {choice.cost.hpPercent && (
                      <Text style={styles.costText}>−{choice.cost.hpPercent}% HP</Text>
                    )}
                    {choice.cost.gold && (
                      <Text style={styles.costText}>−{choice.cost.gold}g</Text>
                    )}
                  </View>
                )}
                {choice.reward && (
                  <View style={styles.rewardRow}>
                    {choice.reward.gold && (
                      <Text style={styles.rewardText}>+{choice.reward.gold}g</Text>
                    )}
                    {choice.reward.healPercent && (
                      <Text style={styles.rewardText}>+{choice.reward.healPercent}% HP</Text>
                    )}
                    {choice.reward.stims && (
                      <Text style={styles.rewardText}>+{choice.reward.stims.length} stim</Text>
                    )}
                    {choice.reward.passiveId && (
                      <Text style={styles.rewardText}>+Passive</Text>
                    )}
                    {choice.reward.revealMap && (
                      <Text style={styles.rewardText}>+Map Intel</Text>
                    )}
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </>
        ) : (
          <>
            <ThemeText textRole="heading" size="xl" style={styles.title}>
              {event.name}
            </ThemeText>
            <Card variant="stat" style={styles.resultCard}>
              <ThemeText textRole="body" size="base" style={styles.resultText}>
                {resultText}
              </ThemeText>
            </Card>
            <PrimaryButton
              title="Continue"
              variant="primary"
              onPress={() => navigation.replace('RunMap')}
              style={styles.continueBtn}
            />
          </>
        )}
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.xl, gap: spacing.lg, paddingBottom: spacing['4xl'] },
  title: { color: colors.accent.gold, textAlign: 'center' },
  flavorCard: { marginBottom: spacing.sm },
  choicesLabel: { marginTop: spacing.sm },
  choiceCard: {
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: 'rgba(0,255,255,0.2)',
    backgroundColor: 'rgba(0,255,255,0.04)',
    padding: spacing.lg,
    gap: spacing.xs,
  },
  choiceLabel: { color: '#00ffff' },
  choiceDesc: {},
  costRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  costText: { fontSize: 11, fontWeight: '700', color: colors.accent.crimson },
  rewardRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  rewardText: { fontSize: 11, fontWeight: '700', color: colors.accent.emerald },
  resultCard: { marginBottom: spacing.lg },
  resultText: { whiteSpace: 'pre-line' as const },
  continueBtn: { marginTop: spacing.lg },
});
