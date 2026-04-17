/**
 * QuestPrepScreen — Pre-battle preparation screen.
 *
 * Shows quest encounters (or boss stats), party lineup, rewards preview.
 * "Begin Battle" starts the battle and navigates to BattleScreen.
 * Full-screen: tab bar hidden.
 */

import React, { useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCampaign } from '../../contexts/CampaignContext';
import BattleUnitSprite from '../../components/campaign/BattleUnitSprite';
import AnimatedProgressBar from '../../components/AnimatedProgressBar';
import { DEFAULT_TAB_BAR_STYLE } from '../../constants/navigation';
import { getBottomContentPadding } from '../../constants/navigation';
import { Colors, Spacing, BorderRadius } from '../../styles/theme';
import type { QueueUnit } from '../../services/gamification/CampaignTypes';
import { buildAvatarQueueUnit } from '../../services/gamification/CampaignUnitBuilder';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { CompanionStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<CompanionStackParamList, 'QuestPrepScreen'>;

export default function QuestPrepScreen({ navigation, route }: Props) {
  const { quests, currentBoss, avatar, partyAvatars, startBattle, startQuest } = useCampaign();
  const insets = useSafeAreaInsets();
  const { questId, bossId } = route.params ?? {};

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

  const quest = useMemo(() => quests.find(q => q.questId === questId), [quests, questId]);
  const isReplay = quest?.status === 'completed';

  const isBossBattle = !!bossId && !!currentBoss;

  const handleBeginBattle = useCallback(() => {
    if (isBossBattle && currentBoss) {
      startBattle(null, bossId!, currentBoss.archetype, currentBoss.level, 1, currentBoss.maxHp);
      navigation.replace('BattleScreen', { bossId });
    } else if (quest) {
      const encounter = quest.encounters?.[0];
      if (encounter) {
        if (questId) startQuest(questId);
        startBattle(
          questId ?? null,
          encounter.isBoss ? (encounter.bossId ?? bossId ?? null) : null,
          encounter.enemyArchetype,
          encounter.enemyLevel,
          1,
          undefined,
        );
        navigation.replace('BattleScreen', { questId });
      }
    }
  }, [isBossBattle, currentBoss, quest, questId, bossId, startBattle, startQuest, navigation]);

  // Gear-resolved preview unit — same builder the combat engine uses.
  const avatarUnit: QueueUnit | null = useMemo(
    () => (avatar ? buildAvatarQueueUnit(avatar) : null),
    [avatar],
  );

  return (
    <SafeAreaView style={styles.root}>
      {/* Back button */}
      <Pressable style={styles.backArrow} onPress={() => navigation.goBack()}>
        <Text style={styles.backArrowText}>← Back</Text>
      </Pressable>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: getBottomContentPadding(insets.bottom) }]}>
        {/* Title */}
        <Text style={styles.title}>
          {isBossBattle ? `Boss: ${currentBoss!.name}` : quest?.title ?? 'Quest'}
        </Text>
        <Text style={styles.description}>
          {isBossBattle
            ? `${currentBoss!.archetype} boss, Level ${currentBoss!.level}`
            : quest?.description ?? ''}
        </Text>

        {/* Boss stats */}
        {isBossBattle && currentBoss && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Boss Stats</Text>
            <AnimatedProgressBar
              value={currentBoss.hp}
              total={currentBoss.maxHp}
              height={8}
              color="#D32F2F"
              label="HP"
            />
            <View style={styles.traitRow}>
              {currentBoss.traits?.map(t => (
                <View key={t} style={styles.traitBadge}>
                  <Text style={styles.traitText}>{t}</Text>
                </View>
              ))}
            </View>
            {currentBoss.isRival && (
              <Text style={styles.rivalText}>This is a Rival Boss!</Text>
            )}
          </View>
        )}

        {/* Quest encounters */}
        {!isBossBattle && quest?.encounters && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Encounters</Text>
            {quest.encounters.map((enc, i) => (
              <View key={i} style={styles.encounterRow}>
                <Text style={styles.encounterName}>
                  {enc.enemyArchetype}
                </Text>
                <Text style={styles.encounterLevel}>Lv {enc.enemyLevel}</Text>
                {enc.isBoss && <Text style={styles.bossBadge}>BOSS</Text>}
              </View>
            ))}
          </View>
        )}

        {/* Rewards preview */}
        {quest?.rewards && !isBossBattle && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {isReplay ? 'Rewards (Replay — 50%)' : 'Rewards'}
            </Text>
            <View style={styles.rewardRow}>
              <Text style={styles.rewardItem}>
                XP: {isReplay ? Math.floor(quest.rewards.xp * 0.5) : quest.rewards.xp}
              </Text>
              <Text style={styles.rewardItem}>
                Gold: {isReplay ? Math.floor(quest.rewards.gold * 0.5) : quest.rewards.gold}
              </Text>
              {quest.rewards.classRankXP > 0 && (
                <Text style={styles.rewardItem}>
                  Rank XP: {isReplay ? Math.floor(quest.rewards.classRankXP * 0.5) : quest.rewards.classRankXP}
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Party lineup */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Party</Text>
          <View style={styles.partyRow}>
            {avatarUnit && (
              <View style={styles.partyMember}>
                <BattleUnitSprite unit={avatarUnit} animState="standby" displayWidth={56} displayHeight={56} />
                <Text style={styles.partyLabel}>{avatar?.primaryClassId} Lv{avatar?.campaignLevel}</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Begin Battle button */}
      <View style={styles.footer}>
        <Pressable style={styles.battleBtn} onPress={handleBeginBattle}>
          <Text style={styles.battleBtnText}>Begin Battle</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  backArrow: {
    padding: Spacing.md,
  },
  backArrowText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    padding: Spacing.md,
    paddingTop: 0,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.text,
  },
  description: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
    marginBottom: Spacing.md,
    lineHeight: 20,
  },
  section: {
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  encounterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  encounterName: {
    fontSize: 14,
    color: Colors.text,
    flex: 1,
    textTransform: 'capitalize',
  },
  encounterLevel: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  bossBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#D32F2F',
    backgroundColor: 'rgba(211,47,47,0.1)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  traitRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  traitBadge: {
    backgroundColor: 'rgba(0,0,0,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  traitText: {
    fontSize: 11,
    color: Colors.textSecondary,
    textTransform: 'capitalize',
  },
  rivalText: {
    color: '#FFD700',
    fontWeight: '700',
    marginTop: Spacing.sm,
    fontSize: 13,
  },
  rewardRow: {
    flexDirection: 'row',
    gap: Spacing.lg,
  },
  rewardItem: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
  },
  partyRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  partyMember: {
    alignItems: 'center',
  },
  partyLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 4,
    textTransform: 'capitalize',
  },
  footer: {
    padding: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  battleBtn: {
    backgroundColor: '#D32F2F',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  battleBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
});
