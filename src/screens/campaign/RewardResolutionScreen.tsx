/**
 * RewardResolutionScreen — Post-battle rewards display.
 *
 * Full-screen, tab bar hidden. Victory shows rewards + continue.
 * Defeat shows retry/retreat options.
 */

import React, { useEffect, useCallback, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { useCampaign } from '../../contexts/CampaignContext';
import { DEFAULT_TAB_BAR_STYLE } from '../../constants/navigation';
import { Colors, Spacing, BorderRadius } from '../../styles/theme';
import type { QuestReward } from '../../services/gamification/CampaignTypes';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { CompanionStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<CompanionStackParamList, 'RewardResolutionScreen'>;

export default function RewardResolutionScreen({ navigation, route }: Props) {
  const { completeQuest, defeatBoss, claimEndlessRewards } = useCampaign();
  const { questId, bossId, result, endlessWave, endlessRewards, battleId } = route.params ?? {};
  const isVictory = result === 'victory';
  const isEndless = endlessWave !== undefined;

  const [rewards, setRewards] = useState<QuestReward | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);

  // Hide tab bar
  useEffect(() => {
    const parent = navigation.getParent();
    if (!parent) return;
    const unsubFocus = navigation.addListener('focus', () => {
      parent.setOptions({ tabBarStyle: { display: 'none' } });
    });
    const unsubBlur = navigation.addListener('blur', () => {
      parent.setOptions({ tabBarStyle: DEFAULT_TAB_BAR_STYLE });
    });
    parent.setOptions({ tabBarStyle: { display: 'none' } });
    return () => {
      unsubFocus();
      unsubBlur();
      parent.setOptions({ tabBarStyle: DEFAULT_TAB_BAR_STYLE });
    };
  }, [navigation]);

  const handleClaim = useCallback(async () => {
    setClaimError(null);
    setClaiming(true);
    try {
      if (isEndless && endlessRewards) {
        // Endless mode — award accumulated XP/gold + campaign XP
        const refId = battleId || `endless_fallback_${Date.now()}`;
        if (endlessRewards.xp > 0 || endlessRewards.gold > 0) {
          await claimEndlessRewards(refId, endlessRewards.xp, endlessRewards.gold);
        }
        setRewards({ xp: endlessRewards.xp, gold: endlessRewards.gold, materialId: null, itemId: null, classRankXP: 0 });
        navigation.popToTop();
        return;
      }

      // Boss victory
      if (isVictory && bossId) {
        await defeatBoss(bossId);
      }

      // Quest victory
      if (isVictory && questId) {
        const r = await completeQuest(questId);
        setRewards(r);
      }

      // Navigate back to hub
      navigation.popToTop();
    } catch (e) {
      console.warn('Claim failed:', e);
      setClaimError('Unable to save progression. Please retry while online.');
    } finally {
      setClaiming(false);
    }
  }, [isVictory, isEndless, endlessRewards, endlessWave, battleId, bossId, questId, completeQuest, defeatBoss, claimEndlessRewards, navigation]);

  const handleRetry = useCallback(() => {
    // Go back to QuestPrep
    navigation.goBack();
  }, [navigation]);

  const handleRetreat = useCallback(() => {
    // Pop back to hub
    navigation.popToTop();
  }, [navigation]);

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.center}>
        {/* Result banner */}
        <Text style={[styles.result, isVictory ? styles.victory : styles.defeat]}>
          {isEndless
            ? (isVictory ? 'ARENA COMPLETE!' : `WAVE ${endlessWave} DEFEAT`)
            : (isVictory ? 'VICTORY!' : 'DEFEAT')}
        </Text>

        <Text style={styles.subtitle}>
          {isEndless
            ? (isVictory ? `Survived ${endlessWave} waves!` : `Fell on wave ${endlessWave}`)
            : (isVictory ? 'Your party emerged triumphant!' : 'The party has fallen...')}
        </Text>

        {claimError && (
          <Text style={styles.errorText}>{claimError}</Text>
        )}

        {/* Endless rewards */}
        {isEndless && endlessRewards && (
          <View style={styles.rewardsBox}>
            <Text style={styles.rewardsTitle}>Arena Rewards</Text>
            <View style={styles.rewardRow}>
              <View style={styles.rewardItem}>
                <Text style={styles.rewardValue}>{endlessRewards.xp}</Text>
                <Text style={styles.rewardLabel}>XP</Text>
              </View>
              <View style={styles.rewardItem}>
                <Text style={styles.rewardValue}>{endlessRewards.gold}</Text>
                <Text style={styles.rewardLabel}>Gold</Text>
              </View>
            </View>
          </View>
        )}

        {/* Quest/Boss rewards (non-endless victory) */}
        {!isEndless && isVictory && rewards && (
          <View style={styles.rewardsBox}>
            <Text style={styles.rewardsTitle}>Rewards Earned</Text>
            <View style={styles.rewardRow}>
              <View style={styles.rewardItem}>
                <Text style={styles.rewardValue}>{rewards.xp}</Text>
                <Text style={styles.rewardLabel}>XP</Text>
              </View>
              <View style={styles.rewardItem}>
                <Text style={styles.rewardValue}>{rewards.gold}</Text>
                <Text style={styles.rewardLabel}>Gold</Text>
              </View>
              {rewards.classRankXP > 0 && (
                <View style={styles.rewardItem}>
                  <Text style={styles.rewardValue}>{rewards.classRankXP}</Text>
                  <Text style={styles.rewardLabel}>Rank XP</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Actions */}
        {isEndless ? (
          <Pressable
            style={[styles.primaryBtn, claiming && styles.disabledBtn]}
            onPress={handleClaim}
            disabled={claiming}
          >
            {claiming ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryBtnText}>
                {rewards ? 'Return to Hub' : 'Claim Rewards'}
              </Text>
            )}
          </Pressable>
        ) : isVictory ? (
          <Pressable
            style={[styles.primaryBtn, claiming && styles.disabledBtn]}
            onPress={handleClaim}
            disabled={claiming}
          >
            {claiming ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryBtnText}>
                {rewards ? 'Return to Hub' : 'Claim Rewards'}
              </Text>
            )}
          </Pressable>
        ) : (
          <View style={styles.defeatActions}>
            <Pressable style={styles.retryBtn} onPress={handleRetry}>
              <Text style={styles.retryBtnText}>Retry</Text>
            </Pressable>
            <Pressable style={styles.retreatBtn} onPress={handleRetreat}>
              <Text style={styles.retreatBtnText}>Retreat to Hub</Text>
            </Pressable>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  result: {
    fontSize: 42,
    fontWeight: '900',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 10,
  },
  victory: {
    color: '#FFD700',
    textShadowColor: 'rgba(255,215,0,0.5)',
  },
  defeat: {
    color: '#FF4444',
    textShadowColor: 'rgba(255,68,68,0.5)',
  },
  subtitle: {
    color: '#ccc',
    fontSize: 16,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  rewardsBox: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginTop: Spacing.xl,
    width: '100%',
    alignItems: 'center',
  },
  rewardsTitle: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: Spacing.md,
  },
  rewardRow: {
    flexDirection: 'row',
    gap: Spacing.xl,
  },
  rewardItem: {
    alignItems: 'center',
  },
  rewardValue: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
  },
  rewardLabel: {
    color: '#aaa',
    fontSize: 12,
    marginTop: 2,
  },
  primaryBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.xl,
    minWidth: 200,
    alignItems: 'center',
  },
  disabledBtn: {
    opacity: 0.6,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  defeatActions: {
    gap: Spacing.md,
    marginTop: Spacing.xl,
    width: '100%',
    alignItems: 'center',
  },
  retryBtn: {
    backgroundColor: '#FF9800',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    minWidth: 200,
    alignItems: 'center',
  },
  retryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  retreatBtn: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
  },
  retreatBtnText: {
    color: '#aaa',
    fontSize: 14,
    fontWeight: '600',
  },
  errorText: {
    color: '#FF8A80',
    fontSize: 13,
    fontWeight: '600',
    marginTop: Spacing.md,
    textAlign: 'center',
  },
});
