/**
 * BattleScreen — Full-screen CT-queue turn-based combat view.
 *
 * Reads battleState from CampaignContext. Supports manual skill selection
 * and auto-battle (fast-forward). Tab bar is hidden while this screen is mounted.
 *
 * @see documentation/integration/EXPENSERPG.md §10
 */

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  ImageBackground,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useCampaign } from '../../contexts/CampaignContext';
import { resolveEquippedItems } from '../../services/gamification/GearDefinitions';
import CTQueueDisplay from '../../components/campaign/CTQueueDisplay';
import WaterfallCommandMenu from './components/WaterfallCommandMenu';
import StatusEffectBadges from './components/StatusEffectBadges';
import DiceAnimation from '../../components/campaign/DiceAnimation';
import BattleLog from '../../components/campaign/BattleLog';
import BattleUnitSprite from '../../components/campaign/BattleUnitSprite';
import AnimatedProgressBar from '../../components/AnimatedProgressBar';
import { DEFAULT_TAB_BAR_STYLE } from '../../constants/navigation';
import { Colors, Spacing, BorderRadius } from '../../styles/theme';
import type { SpriteAnimName } from '../../components/companion/types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { CompanionStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<CompanionStackParamList, 'BattleScreen'>;

const BATTLE_BG = require('../../../assets/sprites/Backgrounds/battle_bg_0057_01.jpg');
const TURN_DELAY_MS = 1200;
const AUTO_BATTLE_DELAY_MS = 500;

export default function BattleScreen({ navigation, route }: Props) {
  const { battleState, beginBattle, advanceQueue, executeBattleTurn, clearBattle, advanceEndlessWave, partyAvatars } = useCampaign();
  const isEndless = route.params?.endlessMode === true;

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

  // ── State ──────────────────────────────────────────────────────────
  const [isAutoBattle, setIsAutoBattle] = useState(false);
  const [showDice, setShowDice] = useState(false);
  const [latestDice, setLatestDice] = useState<any[]>([]);
  const lastProcessedTurn = useRef(0);
  const isAnimating = useRef(false);
  const autoStepTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Per-unit animation states
  const [unitAnims, setUnitAnims] = useState<Record<string, SpriteAnimName>>({});

  // ── Derived ────────────────────────────────────────────────────────
  const players = useMemo(() =>
    battleState?.units.filter(u => u.unitType === 'player') ?? [], [battleState?.units]);
  const enemies = useMemo(() =>
    battleState?.units.filter(u => u.unitType === 'enemy') ?? [], [battleState?.units]);

  const activeUnit = useMemo(() =>
    battleState?.units.find(u => u.unitId === battleState.activeUnitId) ?? null,
    [battleState?.units, battleState?.activeUnitId]);

  const isPlayerTurn = battleState?.phase === 'player_turn' && activeUnit?.unitType === 'player';

  // Equipment worn by the active player unit. unitId === avatar.userId by
  // construction (see CampaignUnitBuilder.buildAvatarQueueUnit), so this
  // lookup works for solo and group campaigns. Empty array when the active
  // unit is an enemy or has no avatar record.
  const activeUnitEquippedItems = useMemo(() => {
    if (!activeUnit || activeUnit.unitType !== 'player') return [];
    const owner = partyAvatars.find(a => a.userId === activeUnit.unitId);
    return resolveEquippedItems(owner?.equippedGear);
  }, [activeUnit, partyAvatars]);

  // ── Battle summary (computed when battle ends) ─────────────────────
  const battleSummary = useMemo(() => {
    if (!battleState || battleState.result === 'in_progress') return null;
    let playerDamage = 0;
    let playerHealing = 0;
    const playerIds = new Set(
      battleState.units.filter(u => u.unitType === 'player').map(u => u.unitId),
    );
    for (const turn of battleState.turnHistory) {
      if (playerIds.has(turn.actingUnitId)) {
        playerDamage += Object.values(turn.damageDealt).reduce((a, b) => a + b, 0);
        playerHealing += Object.values(turn.healingDone).reduce((a, b) => a + b, 0);
      }
    }
    return { playerDamage, playerHealing };
  }, [battleState?.result]);

  // ── Turn processing ────────────────────────────────────────────────
  useEffect(() => {
    if (!battleState) return;

    // Process new turns for animations
    const newTurns = battleState.turnHistory.filter(
      t => t.turnNumber > lastProcessedTurn.current
    );

    if (newTurns.length > 0) {
      const latestTurn = newTurns[newTurns.length - 1];
      lastProcessedTurn.current = latestTurn.turnNumber;

      // Show dice
      if (latestTurn.diceRolls.length > 0) {
        setLatestDice(latestTurn.diceRolls);
        setShowDice(true);
      }

      // Set attacking animation on actor
      const actorUnit = battleState.units.find(u => u.unitId === latestTurn.actingUnitId);
      if (actorUnit) {
        const attackAnim = latestTurn.skillId.includes('magic') ? 'magic_atk' : 'atk';
        setUnitAnims(prev => ({ ...prev, [actorUnit.unitId]: attackAnim as SpriteAnimName }));

        // Revert to idle after animation
        setTimeout(() => {
          setUnitAnims(prev => ({ ...prev, [actorUnit.unitId]: 'idle' as SpriteAnimName }));
        }, 800);
      }

      // Set dying/dead on KO'd units
      battleState.units.forEach(u => {
        if (u.isKO) {
          setUnitAnims(prev => {
            if (prev[u.unitId] === 'dead') return prev;
            return { ...prev, [u.unitId]: 'dying' as SpriteAnimName };
          });
          setTimeout(() => {
            setUnitAnims(prev => ({ ...prev, [u.unitId]: 'dead' as SpriteAnimName }));
          }, 600);
        }
      });
    }

    // Handle battle end animations
    if (battleState.result === 'victory') {
      battleState.units.forEach(u => {
        if (!u.isKO && u.unitType === 'player') {
          setUnitAnims(prev => ({ ...prev, [u.unitId]: 'win' as SpriteAnimName }));
        }
      });
    }
  }, [battleState?.currentTurn, battleState?.result]);

  // ── Auto-step: step one turn at a time with delay ──────────────────
  useEffect(() => {
    if (!battleState || battleState.result !== 'in_progress') return;
    if (isAutoBattle) return; // fast forward handles this
    if (battleState.phase !== 'enemy_turn') return;

    // Enemy turn — auto-step after delay
    autoStepTimer.current = setTimeout(() => {
      executeBattleTurn();
    }, TURN_DELAY_MS);

    return () => {
      if (autoStepTimer.current) clearTimeout(autoStepTimer.current);
    };
  }, [battleState?.phase, battleState?.activeUnitId, battleState?.result, isAutoBattle]);

  // ── Auto-battle: step both player + enemy turns at a steady pace ──
  useEffect(() => {
    if (!isAutoBattle || !battleState || battleState.result !== 'in_progress') return;
    if (showDice) return; // wait for dice animation to finish

    const timer = setTimeout(() => {
      executeBattleTurn();
    }, AUTO_BATTLE_DELAY_MS);

    return () => clearTimeout(timer);
  }, [isAutoBattle, battleState?.currentTurn, battleState?.result, battleState?.phase, showDice]);

  // ── Queueing auto-advance: transition from queueing to player_turn/enemy_turn ──
  // Only advances CT and sets phase — does NOT pick or execute an action.
  useEffect(() => {
    if (!battleState || battleState.result !== 'in_progress') return;
    if (battleState.phase !== 'queueing') return;
    if (isAutoBattle) return; // auto-battle effect handles all phases

    const timer = setTimeout(() => {
      advanceQueue();
    }, 100);

    return () => clearTimeout(timer);
  }, [battleState?.phase, battleState?.result, isAutoBattle]);

  // ── Handlers ───────────────────────────────────────────────────────
  // Manual targeting lives entirely inside WaterfallCommandMenu — by the
  // time we receive a command here, target IDs are already resolved.
  const handleCommand = useCallback((skillId: string, targetUnitIds: string[]) => {
    if (!isPlayerTurn || isAnimating.current) return;
    executeBattleTurn(skillId, targetUnitIds);
  }, [isPlayerTurn, executeBattleTurn]);

  const handleToggleAuto = useCallback(() => {
    setIsAutoBattle(prev => !prev);
  }, []);

  const handleDiceComplete = useCallback(() => {
    setShowDice(false);
  }, []);

  const handleBattleEnd = useCallback(() => {
    const result = battleState?.result as 'victory' | 'defeat';
    if (isEndless) {
      // Capture before clearBattle wipes state
      const rewards = battleState?.endlessRewards ?? { xp: 0, gold: 0 };
      const wave = battleState?.endlessWave ?? 1;
      const battleId = battleState?.battleId;
      clearBattle();
      navigation.replace('RewardResolutionScreen', {
        result: 'defeat',
        endlessWave: wave,
        endlessRewards: rewards,
        battleId,
      });
    } else {
      clearBattle();
      navigation.replace('RewardResolutionScreen', {
        questId: route.params?.questId,
        bossId: route.params?.bossId,
        result,
      });
    }
  }, [battleState?.result, battleState?.endlessWave, battleState?.endlessRewards, battleState?.battleId, isEndless, clearBattle, navigation, route.params]);

  // Collect & Leave for endless mode (on victory)
  const handleEndlessCollect = useCallback(() => {
    const wave = battleState?.endlessWave ?? 1;
    const battleId = battleState?.battleId;
    const prev = battleState?.endlessRewards ?? { xp: 0, gold: 0 };
    // Include current wave's reward in the total
    const wasBossWave = wave % 5 === 0;
    const rewards = { xp: prev.xp + (wasBossWave ? 25 : 5), gold: prev.gold + (wasBossWave ? 15 : 3) };
    clearBattle();
    navigation.replace('RewardResolutionScreen', {
      result: 'victory',
      endlessWave: wave,
      endlessRewards: rewards,
      battleId,
    });
  }, [battleState?.endlessWave, battleState?.endlessRewards, battleState?.battleId, clearBattle, navigation]);

  // Handle endless wave advance (reset auto-battle state for new wave)
  const handleNextWave = useCallback(() => {
    setIsAutoBattle(false);
    lastProcessedTurn.current = 0;
    advanceEndlessWave();
  }, [advanceEndlessWave]);

  // ── Early exit ─────────────────────────────────────────────────────
  if (!battleState) {
    return (
      <SafeAreaView style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No active battle</Text>
        <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const isBattleOver = battleState.result !== 'in_progress';
  const isPreparation = battleState.phase === 'preparation';

  return (
    <ImageBackground source={BATTLE_BG} style={styles.root} resizeMode="cover">
      <SafeAreaView style={styles.safeArea}>
        {/* CT Queue — hidden during preparation */}
        {!isPreparation && (
          <CTQueueDisplay
            units={battleState.units}
            activeUnitId={battleState.activeUnitId}
          />
        )}

        {/* Boss HP bar (if boss battle) */}
        {route.params?.bossId && enemies.length > 0 && (
          <View style={styles.bossBar}>
            <Text style={styles.bossName}>{enemies[0].name}</Text>
            <AnimatedProgressBar
              key={`boss-hp-${enemies[0].unitId}-${enemies[0].hp}-${battleState.currentTurn}`}
              value={enemies[0].hp}
              total={enemies[0].maxHp}
              height={8}
              color="#D32F2F"
              showStats={false}
            />
          </View>
        )}

        {/* Battlefield */}
        <View style={styles.battlefield}>
          {/* Player side */}
          <View style={styles.teamColumn}>
            {players.map(unit => (
              <View key={unit.unitId} style={styles.unitSlot}>
                <View style={styles.unitHpRow}>
                  <AnimatedProgressBar
                    key={`unit-hp-${unit.unitId}-${unit.hp}-${battleState.currentTurn}`}
                    value={unit.hp}
                    total={unit.maxHp}
                    height={4}
                    color={unit.hp / unit.maxHp > 0.5 ? '#4CAF50' : unit.hp / unit.maxHp > 0.25 ? '#FF9800' : '#F44336'}
                    showStats={false}
                    animated={false}
                  />
                </View>
                <BattleUnitSprite
                  unit={unit}
                  animState={unitAnims[unit.unitId] ?? 'idle'}
                  displayWidth={80}
                  displayHeight={80}
                  flipped
                />
                <StatusEffectBadges effects={unit.statusEffects} />
                <Text style={styles.unitLabel}>{unit.name}</Text>
              </View>
            ))}
          </View>

          {/* VS divider */}
          <Text style={styles.vsText}>VS</Text>

          {/* Enemy side */}
          <View style={styles.teamColumn}>
            {enemies.map(unit => (
              <View key={unit.unitId} style={[styles.unitSlot, unit.isKO && styles.koUnit]}>
                <View style={styles.unitHpRow}>
                  <AnimatedProgressBar
                    key={`unit-hp-${unit.unitId}-${unit.hp}-${battleState.currentTurn}`}
                    value={unit.hp}
                    total={unit.maxHp}
                    height={4}
                    color="#F44336"
                    showStats={false}
                    animated={false}
                  />
                </View>
                <BattleUnitSprite
                  unit={unit}
                  animState={unitAnims[unit.unitId] ?? 'idle'}
                  displayWidth={80}
                  displayHeight={80}
                />
                <StatusEffectBadges effects={unit.statusEffects} />
                <Text style={styles.unitLabel}>{unit.name}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Battle Log (collapsible) */}
        <View style={styles.logContainer}>
          <BattleLog
            turnHistory={battleState.turnHistory}
            units={battleState.units}
            maxHeight={100}
          />
        </View>

        {/* Command menu — only during player_turn */}
        {!isBattleOver && activeUnit && isPlayerTurn && (
          <WaterfallCommandMenu
            unit={activeUnit}
            enemies={enemies}
            allies={players}
            isBossBattle={!!battleState.bossId}
            equippedGearItems={activeUnitEquippedItems}
            onCommand={handleCommand}
          />
        )}

        {/* Enemy turn indicator */}
        {battleState.phase === 'enemy_turn' && !isAutoBattle && (
          <View style={styles.enemyTurnBanner}>
            <Text style={styles.enemyTurnText}>Enemy thinking...</Text>
          </View>
        )}

        {/* Auto-battle toggle */}
        {!isBattleOver && !isPreparation && (
          <Pressable style={[styles.autoBtn, isAutoBattle && styles.autoBtnActive]} onPress={handleToggleAuto}>
            <Text style={styles.autoBtnText}>
              {isAutoBattle ? 'Manual' : 'Auto Battle'}
            </Text>
          </Pressable>
        )}

        {/* Preparation Phase Overlay */}
        {isPreparation && (
          <View style={styles.resultOverlay}>
            <Text style={styles.prepTitle}>
              {isEndless ? `Wave ${battleState.endlessWave ?? 1}` : 'Battle Preparation'}
            </Text>
            <Text style={styles.prepSubtext}>
              {players.length} hero{players.length !== 1 ? 'es' : ''} vs {enemies.length} enem{enemies.length !== 1 ? 'ies' : 'y'}
            </Text>
            {isEndless && battleState.endlessRewards && battleState.endlessRewards.xp > 0 && (
              <Text style={styles.prepSubtext}>
                Accumulated: {battleState.endlessRewards.xp} XP | {battleState.endlessRewards.gold} Gold
              </Text>
            )}
            <Pressable style={styles.continueBtn} onPress={beginBattle}>
              <Text style={styles.continueBtnText}>Begin Battle</Text>
            </Pressable>
          </View>
        )}

        {/* Victory / Defeat / Retreated Overlay */}
        {isBattleOver && (
          <View style={styles.resultOverlay}>
            <ScrollView contentContainerStyle={styles.resultContent}>
              {/* Endless wave clear */}
              {isEndless && battleState.result === 'victory' ? (
                <>
                  <Text style={[styles.resultText, styles.victoryText]}>
                    Wave {battleState.endlessWave ?? 1} Cleared!
                  </Text>
                  <Text style={styles.resultSubtext}>
                    +{(battleState.endlessWave ?? 1) % 5 === 0 ? 25 : 5} XP | +{(battleState.endlessWave ?? 1) % 5 === 0 ? 15 : 3} Gold
                  </Text>
                  <Text style={styles.accumulatedText}>
                    Total: {(battleState.endlessRewards?.xp ?? 0) + ((battleState.endlessWave ?? 1) % 5 === 0 ? 25 : 5)} XP | {(battleState.endlessRewards?.gold ?? 0) + ((battleState.endlessWave ?? 1) % 5 === 0 ? 15 : 3)} Gold
                  </Text>
                </>
              ) : (
                <>
                  <Text style={[
                    styles.resultText,
                    battleState.result === 'victory' ? styles.victoryText : styles.defeatText,
                  ]}>
                    {battleState.fleeFlag ? 'RETREATED' : battleState.result === 'victory' ? 'VICTORY!' : 'DEFEAT'}
                  </Text>
                  {isEndless && (
                    <Text style={styles.accumulatedText}>
                      Reached Wave {battleState.endlessWave ?? 1} | Earned: {battleState.endlessRewards?.xp ?? 0} XP | {battleState.endlessRewards?.gold ?? 0} Gold
                    </Text>
                  )}
                </>
              )}

              <Text style={styles.resultSubtext}>
                {battleState.currentTurn} turns | {battleState.diceHistory.length} dice rolls
              </Text>

              {/* Summary stats */}
              {battleSummary && (
                <View style={styles.summaryRow}>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryValue}>{battleSummary.playerDamage}</Text>
                    <Text style={styles.summaryLabel}>Damage</Text>
                  </View>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryValue}>{battleSummary.playerHealing}</Text>
                    <Text style={styles.summaryLabel}>Healing</Text>
                  </View>
                </View>
              )}

              {/* Scrollable battle log */}
              <View style={styles.summaryLogContainer}>
                <Text style={styles.summaryLogTitle}>Battle Log</Text>
                <BattleLog
                  turnHistory={battleState.turnHistory}
                  units={battleState.units}
                  maxHeight={200}
                />
              </View>

              {/* Action buttons */}
              {isEndless && battleState.result === 'victory' ? (
                <>
                  <Pressable style={styles.continueBtn} onPress={handleNextWave}>
                    <Text style={styles.continueBtnText}>Next Wave</Text>
                  </Pressable>
                  <Pressable style={styles.collectBtn} onPress={handleEndlessCollect}>
                    <Text style={styles.collectBtnText}>Collect & Leave</Text>
                  </Pressable>
                </>
              ) : (
                <Pressable style={styles.continueBtn} onPress={handleBattleEnd}>
                  <Text style={styles.continueBtnText}>Continue</Text>
                </Pressable>
              )}
            </ScrollView>
          </View>
        )}

        {/* Dice Animation Overlay */}
        <DiceAnimation
          visible={showDice}
          diceRolls={latestDice}
          onComplete={handleDiceComplete}
          duration={isAutoBattle ? 400 : undefined}
        />
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: '#fff',
    fontSize: 18,
  },
  backBtn: {
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
  },
  backBtnText: {
    color: '#fff',
    fontWeight: '600',
  },
  bossBar: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.xs,
    padding: Spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: BorderRadius.sm,
  },
  bossName: {
    color: '#FF6B6B',
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 4,
  },
  battlefield: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: Spacing.md,
  },
  teamColumn: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  unitSlot: {
    alignItems: 'center',
    width: 90,
  },
  koUnit: {
    opacity: 0.4,
  },
  unitHpRow: {
    width: 70,
    marginBottom: 2,
  },
  unitLabel: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 2,
  },
  vsText: {
    color: '#FFD700',
    fontSize: 20,
    fontWeight: '900',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 4,
  },
  logContainer: {
    marginHorizontal: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  autoBtn: {
    alignSelf: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: 'rgba(255,215,0,0.85)',
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  autoBtnActive: {
    backgroundColor: 'rgba(76,175,80,0.85)',
  },
  autoBtnText: {
    color: '#1a1a2e',
    fontWeight: '700',
    fontSize: 14,
  },
  resultOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
  },
  resultText: {
    fontSize: 42,
    fontWeight: '900',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 8,
  },
  victoryText: {
    color: '#FFD700',
    textShadowColor: 'rgba(255,215,0,0.5)',
  },
  defeatText: {
    color: '#FF4444',
    textShadowColor: 'rgba(255,68,68,0.5)',
  },
  resultSubtext: {
    color: '#ccc',
    fontSize: 14,
    marginTop: Spacing.sm,
  },
  continueBtn: {
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
  },
  continueBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  prepTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '900',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 4,
  },
  prepSubtext: {
    color: '#ccc',
    fontSize: 16,
    marginTop: Spacing.sm,
  },
  enemyTurnBanner: {
    alignSelf: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs,
    backgroundColor: 'rgba(255,68,68,0.7)',
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.xs,
  },
  enemyTurnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    fontStyle: 'italic',
  },
  resultContent: {
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 1,
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: Spacing.xl,
    marginTop: Spacing.lg,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryValue: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '800',
  },
  summaryLabel: {
    color: '#aaa',
    fontSize: 11,
    marginTop: 2,
  },
  summaryLogContainer: {
    width: '100%',
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  summaryLogTitle: {
    color: '#ccc',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  accumulatedText: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: '700',
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  collectBtn: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    marginTop: Spacing.sm,
  },
  collectBtnText: {
    color: '#aaa',
    fontSize: 14,
    fontWeight: '600',
  },
});
