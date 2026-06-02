import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '@/navigation/AppNavigator';
import { useRunStore } from '@/stores';
import { useCombatStore } from '@/stores/combatStore';
import { CLASS_BY_ID, RUN_PASSIVE_BY_ID, STAGE_CONDITION_BY_ID } from '@/content';
import type { ClassId } from '@/content/types';
import { ScreenWrapper } from '@/components/atoms/ScreenWrapper';
import { RoomNodeCard } from '@/components/atoms/RoomNodeCard';
import { ThemeText } from '@/components/atoms/ThemeText';
import { PrimaryButton } from '@/components/atoms/PrimaryButton';
import { colors, spacing, radius } from '@/design';
import {
  getAvailableNodeIdsForStage,
  getRunMapNodesForStage,
  getSelectedNodeForStage,
  RUN_MAP_ROOM_LABELS,
  type RunMapNode,
} from '@/domain/run/map';
import type { StageRoomType } from '@/domain/run/types';

type Props = NativeStackScreenProps<HomeStackParamList, 'RunMap'>;

const LANE_MIN = 0;
const LANE_MAX = 6;
const NODE_SIZE = 44;
const STAGE_GAP = 74;
const BOARD_SIDE_PADDING = 24;
const BOARD_TOP_PADDING = 26;
const MIN_BOARD_WIDTH = 300;
const MAX_BOARD_WIDTH = 420;

type EdgeTone = 'base' | 'preview' | 'chosen';

interface GraphEdge {
  id: string;
  left: number;
  top: number;
  width: number;
  angle: string;
  tone: EdgeTone;
}

// Room visuals now use design tokens via RoomNodeCard component (colors.roomType)

function RunMapScreenInner({ navigation }: Props) {
  const { width: windowWidth } = useWindowDimensions();

  const runId = useRunStore((state) => state.runId);
  const stage = useRunStore((state) => state.stage);
  const mapGraph = useRunStore((state) => state.mapGraph);
  const mapPathByStage = useRunStore((state) => state.mapPathByStage);
  const activeClassId = useRunStore((state) => state.activeClassId);
  const runError = useRunStore((state) => state.error);
  const vaultStreak = useRunStore((state) => state.vaultStreak);
  const runPassiveIds = useRunStore((state) => state.runPassiveIds);
  const selectMapNodeForCurrentStage = useRunStore((state) => state.selectMapNodeForCurrentStage);
  const clearMapNodeSelectionForCurrentStage = useRunStore(
    (state) => state.clearMapNodeSelectionForCurrentStage,
  );

  const combatStatus = useCombatStore((state) => state.status);
  const preparedStageIndex = useCombatStore((state) => state.prepared?.stageIndex ?? null);

  const currentStage = stage ?? 0;
  const totalStages = mapGraph?.totalStages ?? 30;
  const completedCount = Math.max(0, currentStage - 1);
  const remaining = Math.max(0, totalStages - completedCount);
  const selectedCurrentStageNodeId = mapPathByStage[currentStage];
  const [showRules, setShowRules] = useState(false);
  const [showStageRoutes, setShowStageRoutes] = useState(false);

  const graphMetrics = useMemo(() => {
    const laneCount = LANE_MAX - LANE_MIN + 1;
    const boardWidth = Math.max(MIN_BOARD_WIDTH, Math.min(MAX_BOARD_WIDTH, windowWidth - 24));
    const lanePitch = (boardWidth - BOARD_SIDE_PADDING * 2 - NODE_SIZE) / (laneCount - 1);
    const boardHeight = BOARD_TOP_PADDING * 2 + totalStages * STAGE_GAP + NODE_SIZE;

    return {
      boardWidth,
      boardHeight,
      nodeLeft: (lane: number): number => BOARD_SIDE_PADDING + (lane - LANE_MIN) * lanePitch,
      nodeTop: (nodeStage: number): number => BOARD_TOP_PADDING + nodeStage * STAGE_GAP,
    };
  }, [totalStages, windowWidth]);

  const nodeById = useMemo(
    () => new Map((mapGraph?.nodes ?? []).map((node) => [node.id, node])),
    [mapGraph?.nodes],
  );

  const availableNodeIds = useMemo(() => {
    if (mapGraph === null || stage === null) return [];
    return getAvailableNodeIdsForStage(mapGraph, mapPathByStage, stage);
  }, [mapGraph, mapPathByStage, stage]);

  const availableNodeIdSet = useMemo(() => new Set(availableNodeIds), [availableNodeIds]);

  const selectedNode = useMemo(() => {
    if (mapGraph === null || stage === null) return null;
    return getSelectedNodeForStage(mapGraph, mapPathByStage, stage);
  }, [mapGraph, mapPathByStage, stage]);

  const currentStageNodes = useMemo(() => {
    if (mapGraph === null || stage === null) return [];
    return getRunMapNodesForStage(mapGraph, stage);
  }, [mapGraph, stage]);

  const edges = useMemo<readonly GraphEdge[]>(() => {
    if (mapGraph === null) return [];

    const output: GraphEdge[] = [];

    for (const node of mapGraph.nodes) {
      const startX = graphMetrics.nodeLeft(node.lane) + NODE_SIZE / 2;
      const startY = graphMetrics.nodeTop(node.stage) + NODE_SIZE / 2;

      for (const nextId of node.nextNodeIds) {
        const nextNode = nodeById.get(nextId);
        if (nextNode === undefined) continue;

        const endX = graphMetrics.nodeLeft(nextNode.lane) + NODE_SIZE / 2;
        const endY = graphMetrics.nodeTop(nextNode.stage) + NODE_SIZE / 2;
        const dx = endX - startX;
        const dy = endY - startY;
        const lineLength = Math.max(1, Math.sqrt(dx * dx + dy * dy));
        // Position edge at midpoint so rotation-around-center aligns the line
        // between the two node centers.
        const midX = (startX + endX) / 2;
        const midY = (startY + endY) / 2;

        let tone: EdgeTone = 'base';
        if (mapPathByStage[node.stage] === node.id && mapPathByStage[node.stage + 1] === nextId) {
          tone = 'chosen';
        } else if (
          node.stage === currentStage - 1 &&
          mapPathByStage[node.stage] === node.id &&
          availableNodeIdSet.has(nextId)
        ) {
          tone = 'preview';
        } else if (node.stage === currentStage && mapPathByStage[currentStage] === node.id) {
          tone = 'preview';
        }

        output.push({
          id: `${node.id}->${nextId}`,
          left: midX - lineLength / 2,
          top: midY,
          width: lineLength,
          angle: `${Math.atan2(dy, dx)}rad`,
          tone,
        });
      }
    }

    return output;
  }, [availableNodeIdSet, currentStage, graphMetrics, mapGraph, mapPathByStage, nodeById]);

  const stageMarkers = useMemo(() => {
    const markers: Array<{ stage: number; top: number }> = [];
    for (let stageNum = 0; stageNum <= totalStages; stageNum += 1) {
      if (stageNum === 0 || stageNum === 1 || stageNum === totalStages || stageNum === currentStage || stageNum % 5 === 0) {
        markers.push({
          stage: stageNum,
          top: graphMetrics.nodeTop(stageNum) + NODE_SIZE / 2 - 7,
        });
      }
    }
    return markers;
  }, [currentStage, graphMetrics, totalStages]);

  const isCombatLocked =
    preparedStageIndex === currentStage &&
    (combatStatus === 'in_progress' || combatStatus === 'simulating' || combatStatus === 'finished');

  if (runId === null || stage === null) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>No Active Run</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.replace('Hub')}>
          <Text style={styles.backBtnText}>Return to Hub</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (mapGraph === null) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>Building Run Map…</Text>
      </View>
    );
  }

  const selectedRoomName =
    selectedNode !== null ? RUN_MAP_ROOM_LABELS[selectedNode.roomType] : 'None selected';

  const handleSelectNode = (nodeId: string) => {
    if (isCombatLocked) return;
    try {
      selectMapNodeForCurrentStage(nodeId);
    } catch {
      // surfaced through runStore.error
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Branching Run Map</Text>
        <Text style={styles.subtitle}>
          Stage {currentStage} of {totalStages} · {completedCount} cleared · {remaining} to go
        </Text>
        {activeClassId !== null && (
          <Text style={styles.classLabel}>{CLASS_BY_ID.get(activeClassId as ClassId)?.name ?? activeClassId}</Text>
        )}
        <Text style={styles.selectionLabel}>Current pick: {selectedRoomName}</Text>
        {vaultStreak > 0 && <Text style={styles.vaultStreakLabel}>Vault streak: {vaultStreak} at risk</Text>}
        {isCombatLocked && (
          <Text style={styles.lockLabel}>
            Route locked: this stage already has an active battle.
          </Text>
        )}
        {runPassiveIds.length > 0 && (
          <View style={styles.passiveChipsRow}>
            {runPassiveIds.map((pid) => {
              const def = RUN_PASSIVE_BY_ID.get(pid);
              return (
                <View key={pid} style={styles.passiveChip}>
                  <Text style={styles.passiveChipText} numberOfLines={1}>
                    {def?.name ?? pid}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
        <View style={styles.headerToolsRow}>
          <Pressable onPress={() => setShowRules((v) => !v)} style={styles.headerToolChip}>
            <Text style={styles.headerToolChipText}>{showRules ? 'Hide Rules' : 'Show Rules'}</Text>
          </Pressable>
          <Pressable onPress={() => setShowStageRoutes((v) => !v)} style={styles.headerToolChip}>
            <Text style={styles.headerToolChipText}>{showStageRoutes ? 'Hide Routes' : 'Show Routes'}</Text>
          </Pressable>
        </View>
      </View>

      {showRules && (
        <View style={styles.rulesCard}>
          <Text style={styles.rulesTitle}>Map Rules</Text>
          <Text style={styles.rulesLine}>One-way traversal only: each room connects forward to the next stage.</Text>
          <Text style={styles.rulesLine}>Boss cadence: Stage 5 mini-boss, Stage 10 gate boss, Stage 30 counter boss.</Text>
          <Text style={styles.rulesLine}>Checkpoint gates at Stage 10, Stage 20, and Stage 30.</Text>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.graphScrollContent}>
        <View
          style={[
            styles.graphBoard,
            {
              width: graphMetrics.boardWidth,
              height: graphMetrics.boardHeight,
            },
          ]}
        >
          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            {edges.map((edge) => (
              <View
                key={edge.id}
                style={[
                  styles.edge,
                  edge.tone === 'chosen'
                    ? styles.edgeChosen
                    : edge.tone === 'preview'
                      ? styles.edgePreview
                      : styles.edgeBase,
                  {
                    left: edge.left,
                    top: edge.top,
                    width: edge.width,
                    transform: [{ rotateZ: edge.angle }],
                  },
                ]}
              />
            ))}
          </View>

          {stageMarkers.map((marker) => (
            <View key={`marker.${marker.stage}`} style={[styles.stageMarker, { top: marker.top }]}>
              <Text
                style={[
                  styles.stageMarkerText,
                  marker.stage === currentStage && styles.stageMarkerTextCurrent,
                ]}
              >
                {`S${marker.stage}`}
              </Text>
            </View>
          ))}

          {mapGraph.nodes.map((node) => {
            const isCurrentStage = node.stage === currentStage;
            const isCompleted = node.stage < currentStage;
            const isAvailable = isCurrentStage && availableNodeIdSet.has(node.id) && !isCombatLocked;
            const isSelected = mapPathByStage[node.stage] === node.id;
            const left = graphMetrics.nodeLeft(node.lane);
            const top = graphMetrics.nodeTop(node.stage);

            return (
              <View key={node.id} style={[styles.nodeSlot, { left, top }]}>
                <RoomNodeCard
                  roomType={node.roomType}
                  isAvailable={isAvailable}
                  isSelected={isSelected}
                  isCompleted={isCompleted}
                  conditionLabel={node.condition !== undefined ? STAGE_CONDITION_BY_ID.get(node.condition)?.effectLabel : undefined}
                  onPress={() => handleSelectNode(node.id)}
                />
              </View>
            );
          })}
        </View>

        {showStageRoutes && currentStageNodes.length > 0 && (
          <View style={styles.currentChoicesCard}>
            <Text style={styles.currentChoicesTitle}>Current Stage Routes</Text>
            <View style={styles.currentChoicesGrid}>
              {currentStageNodes.map((node) => {
                const roomColors = colors.roomType[node.roomType === 'mini_boss' ? 'miniBoss' : node.roomType === 'gate' ? 'gateBoss' : node.roomType === 'counter' ? 'counterBoss' : node.roomType];
                const isReachable = availableNodeIdSet.has(node.id);
                const isSelected = selectedCurrentStageNodeId === node.id;

                return (
                  <View
                    key={`choice.${node.id}`}
                    style={[
                      styles.choiceChip,
                      {
                        borderColor: roomColors.border,
                        backgroundColor: roomColors.bg,
                      },
                      !isReachable && !isSelected && styles.choiceChipLocked,
                      isSelected && styles.choiceChipSelected,
                    ]}
                  >
                    <Text style={[styles.choiceChipLabel, { color: roomColors.text }]}>
                      {RUN_MAP_ROOM_LABELS[node.roomType]}
                    </Text>
                    <Text style={styles.choiceChipMeta}>
                      {isSelected ? 'Selected' : isReachable ? 'Reachable' : 'Blocked'}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>

      {runError !== null && <Text style={styles.error}>{runError}</Text>}

      <View style={styles.footer}>
        {selectedNode !== null && !isCombatLocked && (
          <TouchableOpacity style={styles.secondaryBtn} onPress={clearMapNodeSelectionForCurrentStage}>
            <Text style={styles.secondaryBtnText}>Clear Pick</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.primaryBtn, selectedNode === null && styles.primaryBtnDisabled]}
          disabled={selectedNode === null}
          onPress={() => {
            if (selectedNode === null) return;
            navigation.replace(selectedNode.roomType === 'rest' ? 'InnDecision' : 'Battle');
          }}
        >
          <Text style={styles.primaryBtnText}>
            {selectedNode === null ? 'Pick A Reachable Room' : `Enter ${RUN_MAP_ROOM_LABELS[selectedNode.roomType]}`}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export function RunMapScreen(props: Props) {
  return (
    <ScreenWrapper mode="dark" padded={false}>
      <RunMapScreenInner {...props} />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.dark.background.primary },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#f5f4ef',
    padding: 20,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#2b1f10' },
  header: {
    padding: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#d8cdbb',
    gap: 4,
  },
  title: { fontSize: 22, fontWeight: '800', color: '#2b1f10' },
  subtitle: { fontSize: 13, color: '#5d4d35' },
  classLabel: { fontSize: 12, color: '#7b684a', fontStyle: 'italic' },
  selectionLabel: { fontSize: 12, color: '#244d88', fontWeight: '700', marginTop: 2 },
  vaultStreakLabel: { fontSize: 12, color: '#8b5a00', fontWeight: '600' },
  lockLabel: { fontSize: 12, color: '#8a2e2e', fontWeight: '700', marginTop: 2 },
  passiveChipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
  passiveChip: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: '#e8f0ff',
    borderWidth: 1,
    borderColor: '#a0b8d8',
  },
  passiveChipText: { fontSize: 10, fontWeight: '600', color: '#2a4a7a' },
  headerToolsRow: {
    marginTop: 6,
    flexDirection: 'row',
    gap: 6,
  },
  headerToolChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#d5ccb8',
    backgroundColor: '#f9f4e8',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  headerToolChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6b583b',
  },
  rulesCard: {
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d8cdbb',
    backgroundColor: '#fffdf8',
    padding: 10,
    gap: 3,
  },
  rulesTitle: { fontSize: 12, color: '#6f5838', fontWeight: '800', textTransform: 'uppercase' },
  rulesLine: { fontSize: 12, color: '#5c4b36' },
  graphScrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  graphBoard: {
    alignSelf: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#dfd5c4',
    backgroundColor: '#fffdf8',
    overflow: 'hidden',
  },
  edge: {
    position: 'absolute',
    borderRadius: 999,
  },
  edgeBase: {
    height: 1.5,
    backgroundColor: '#ded6c8',
  },
  edgePreview: {
    height: 2.4,
    backgroundColor: '#7ea3cc',
  },
  edgeChosen: {
    height: 2.8,
    backgroundColor: '#2d5ca8',
  },
  stageMarker: {
    position: 'absolute',
    left: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    backgroundColor: '#f2ede5',
  },
  stageMarkerText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#8a7962',
  },
  stageMarkerTextCurrent: {
    color: '#24579f',
  },
  nodeSlot: {
    position: 'absolute',
    width: NODE_SIZE,
    height: NODE_SIZE,
  },
  graphNode: {
    width: NODE_SIZE,
    height: NODE_SIZE,
    borderRadius: NODE_SIZE / 2,
    borderWidth: 1.8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  graphNodeAvailable: {
    shadowColor: '#2a5ab0',
    shadowOpacity: 0.2,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  graphNodeSelected: {
    borderWidth: 3,
    borderColor: '#1d5bab',
  },
  graphNodeShort: {
    fontSize: 16,
    fontWeight: '800',
  },
  graphNodePin: {
    position: 'absolute',
    bottom: 3,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#1d5bab',
  },
  conditionChip: {
    position: 'absolute',
    bottom: -16,
    alignSelf: 'center',
    backgroundColor: '#fdf2d0',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderWidth: 0.5,
    borderColor: '#d4a248',
    minWidth: 36,
    maxWidth: 90,
  },
  conditionChipText: {
    fontSize: 7.5,
    fontWeight: '700',
    color: '#805407',
    textAlign: 'center',
  },
  currentChoicesCard: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#dfd5c4',
    backgroundColor: '#fffdf8',
    padding: 10,
    gap: 8,
  },
  currentChoicesTitle: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    color: '#6f5c40',
    fontWeight: '800',
  },
  currentChoicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  choiceChip: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    minWidth: 90,
  },
  choiceChipLocked: {
    opacity: 0.45,
  },
  choiceChipSelected: {
    borderColor: '#1d5bab',
    borderWidth: 2,
  },
  choiceChipLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  choiceChipMeta: {
    fontSize: 10,
    marginTop: 2,
    color: '#6c6a68',
  },
  error: {
    marginHorizontal: 16,
    marginBottom: 8,
    color: '#8b1a1a',
    fontSize: 12,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#d8cdbb',
    backgroundColor: '#fffdf8',
    gap: 8,
  },
  primaryBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: '#2d5ca8',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  primaryBtnDisabled: { opacity: 0.45 },
  primaryBtnText: { fontSize: 14, color: '#fff', fontWeight: '800' },
  secondaryBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d8cdbb',
    backgroundColor: '#fffdf8',
    paddingVertical: 10,
  },
  secondaryBtnText: { fontSize: 13, color: '#4a3a28', fontWeight: '700' },
  backBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d8cdbb',
    backgroundColor: '#fffdf8',
  },
  backBtnText: { fontSize: 14, color: '#4a3a28', fontWeight: '600' },
});
