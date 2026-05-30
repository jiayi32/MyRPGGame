import type { StageRoomType } from './types';
import type { StageConditionId } from '../../content/types';
import { STAGE_CONDITIONS } from '../../content/stageConditions';

export interface RunMapNode {
  id: string;
  stage: number;
  lane: number;
  roomType: StageRoomType;
  nextNodeIds: readonly string[];
  /** Deterministic room condition modifier. undefined = no condition. */
  condition?: StageConditionId;
}

export interface RunMapGraph {
  seed: number;
  totalStages: number;
  nodes: readonly RunMapNode[];
}

export type RunMapPath = Readonly<Record<number, string>>;

export const RUN_MAP_TOTAL_STAGES = 30;

export const RUN_MAP_ROOM_LABELS: Readonly<Record<StageRoomType, string>> = {
  normal: 'Battle',
  elite: 'Elite',
  event: 'Event',
  treasure: 'Treasure',
  rest: 'Rest',
  merchant: 'Merchant',
  anomaly: 'Anomaly',
  mini_boss: 'Mini-Boss',
  gate: 'Gate',
  counter: 'Counter Boss',
};

export const FORCED_ROOM_BY_STAGE: Readonly<Record<number, StageRoomType>> = {
  5: 'mini_boss',
  10: 'gate',
  20: 'gate',
  30: 'counter',
};

const MAX_PER_STAGE: Readonly<Partial<Record<StageRoomType, number>>> = {
  elite: 2,
  treasure: 1,
  rest: 1,
  merchant: 1,
  anomaly: 1,
};

const LANE_PRESETS: Readonly<Record<number, readonly number[]>> = {
  1: [3],
  2: [2, 4],
  3: [1, 3, 5],
  4: [0, 2, 4, 6],
};

const normalizeSeed = (seed: number): number => {
  if (!Number.isFinite(seed)) return 0;
  return Math.trunc(Math.abs(seed)) >>> 0;
};

const hash = (seed: number, salt: number): number => {
  let x = (normalizeSeed(seed) ^ Math.imul(salt | 0, 0x45d9f3b)) >>> 0;
  x ^= x >>> 16;
  x = Math.imul(x, 0x45d9f3b) >>> 0;
  x ^= x >>> 16;
  return x >>> 0;
};

const pickIndex = (seed: number, salt: number, length: number): number => {
  if (length <= 0) return 0;
  return hash(seed, salt) % length;
};

const uniqueStrings = (values: readonly string[]): string[] => {
  const seen = new Set<string>();
  const output: string[] = [];
  for (const value of values) {
    if (seen.has(value)) continue;
    seen.add(value);
    output.push(value);
  }
  return output;
};

const sortedStageNodes = (graph: RunMapGraph, stage: number): RunMapNode[] =>
  graph.nodes
    .filter((node) => node.stage === stage)
    .sort((a, b) => a.lane - b.lane || a.id.localeCompare(b.id));

const defaultNodeCountForStage = (seed: number, stage: number): number => {
  if (FORCED_ROOM_BY_STAGE[stage] !== undefined) return 1;
  if (stage <= 4) return 3;
  if (stage <= 9) return 3 + (hash(seed, stage * 13) % 2);
  if (stage <= 19) return 4;
  if (stage <= 29) return 3 + (hash(seed, stage * 17) % 2);
  return 1;
};

const weightTableForStage = (stage: number): readonly [StageRoomType, number][] => {
  if (stage <= 3) {
    return [
      ['normal', 72],
      ['event', 28],
    ];
  }
  if (stage <= 4) {
    return [
      ['normal', 58],
      ['event', 24],
      ['elite', 18],
    ];
  }
  if (stage <= 9) {
    return [
      ['normal', 42],
      ['elite', 21],
      ['event', 16],
      ['treasure', 8],
      ['rest', 7],
      ['merchant', 6],
    ];
  }
  if (stage <= 19) {
    return [
      ['normal', 36],
      ['elite', 22],
      ['event', 17],
      ['treasure', 8],
      ['rest', 7],
      ['merchant', 7],
      ['anomaly', 3],
    ];
  }
  return [
    ['normal', 30],
    ['elite', 24],
    ['event', 14],
    ['treasure', 8],
    ['rest', 8],
    ['merchant', 6],
    ['anomaly', 10],
  ];
};

const canPlaceRoomType = (
  roomType: StageRoomType,
  stageCountByType: Readonly<Partial<Record<StageRoomType, number>>>,
): boolean => {
  const maxForType = MAX_PER_STAGE[roomType];
  if (maxForType === undefined) return true;
  return (stageCountByType[roomType] ?? 0) < maxForType;
};

const weightedPickRoom = (seed: number, salt: number, entries: readonly [StageRoomType, number][]): StageRoomType => {
  if (entries.length === 0) return 'normal';
  const positive = entries.filter((entry) => entry[1] > 0);
  if (positive.length === 0) return 'normal';

  const totalWeight = positive.reduce((sum, [, weight]) => sum + weight, 0);
  const roll = hash(seed, salt) % totalWeight;
  let cursor = 0;
  for (const [roomType, weight] of positive) {
    cursor += weight;
    if (roll < cursor) {
      return roomType;
    }
  }
  return positive[positive.length - 1]?.[0] ?? 'normal';
};

interface MutableNode {
  id: string;
  stage: number;
  lane: number;
  roomType: StageRoomType;
  nextNodeIds: string[];
  condition: StageConditionId | undefined;
}

const nearestNodeIndex = (lane: number, nodes: readonly MutableNode[]): number => {
  let bestIdx = 0;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (let i = 0; i < nodes.length; i += 1) {
    const node = nodes[i];
    if (node === undefined) continue;
    const distance = Math.abs(node.lane - lane);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIdx = i;
    }
  }
  return bestIdx;
};

const computeForwardEdges = (
  seed: number,
  stage: number,
  node: MutableNode,
  nextStageNodes: readonly MutableNode[],
): string[] => {
  if (nextStageNodes.length === 0) return [];
  if (nextStageNodes.length === 1) {
    return [nextStageNodes[0]?.id ?? ''];
  }

  const nearestIdx = nearestNodeIndex(node.lane, nextStageNodes);
  const nearestNode = nextStageNodes[nearestIdx];
  if (nearestNode === undefined) return [];

  const output: string[] = [nearestNode.id];
  const goRight = hash(seed, stage * 211 + node.lane * 17 + nearestIdx) % 2 === 0;

  if (goRight && nearestIdx < nextStageNodes.length - 1) {
    const right = nextStageNodes[nearestIdx + 1];
    if (right !== undefined) output.push(right.id);
  } else if (nearestIdx > 0) {
    const left = nextStageNodes[nearestIdx - 1];
    if (left !== undefined) output.push(left.id);
  } else if (nearestIdx < nextStageNodes.length - 1) {
    const right = nextStageNodes[nearestIdx + 1];
    if (right !== undefined) output.push(right.id);
  }

  if (nextStageNodes.length >= 4 && hash(seed, stage * 223 + node.lane) % 100 < 18) {
    const thirdOffset = goRight ? 2 : -2;
    const thirdIdx = Math.max(0, Math.min(nextStageNodes.length - 1, nearestIdx + thirdOffset));
    const third = nextStageNodes[thirdIdx];
    if (third !== undefined) output.push(third.id);
  }

  return uniqueStrings(output).filter((value) => value.length > 0);
};

const ensureIncomingCoverage = (
  seed: number,
  stage: number,
  currentNodes: readonly MutableNode[],
  nextNodes: readonly MutableNode[],
): void => {
  if (currentNodes.length === 0 || nextNodes.length === 0) return;

  const incoming = new Map<string, number>();
  for (const next of nextNodes) {
    incoming.set(next.id, 0);
  }
  for (const current of currentNodes) {
    for (const nextId of current.nextNodeIds) {
      incoming.set(nextId, (incoming.get(nextId) ?? 0) + 1);
    }
  }

  for (const next of nextNodes) {
    if ((incoming.get(next.id) ?? 0) > 0) continue;

    const bestSourceIdx = currentNodes
      .map((node, idx) => ({
        idx,
        distance: Math.abs(node.lane - next.lane),
        tiebreak: hash(seed, stage * 257 + node.lane * 19 + idx),
      }))
      .sort((a, b) => a.distance - b.distance || a.tiebreak - b.tiebreak)[0]?.idx;

    if (bestSourceIdx === undefined) continue;
    const source = currentNodes[bestSourceIdx];
    if (source === undefined) continue;
    source.nextNodeIds = uniqueStrings([...source.nextNodeIds, next.id]);
    incoming.set(next.id, 1);
  }
};

const sanitizePathInput = (rawPath: unknown): Record<number, string> => {
  if (typeof rawPath !== 'object' || rawPath === null) return {};
  const output: Record<number, string> = {};
  for (const [stageRaw, nodeId] of Object.entries(rawPath as Record<string, unknown>)) {
    const stage = Number(stageRaw);
    if (!Number.isInteger(stage) || stage < 1 || stage > RUN_MAP_TOTAL_STAGES) continue;
    if (typeof nodeId !== 'string' || nodeId.length === 0) continue;
    output[stage] = nodeId;
  }
  return output;
};

/**
 * Remove merchant-room nodes from the graph when the Sealed Purse contract
 * is active.  Edges are rewired so that any node that pointed to a removed
 * merchant node now points to whatever the merchant node pointed to.
 * Forced boss/gate/counter stages are never filtered.
 */
export const filterMapGraphByContracts = (
  graph: RunMapGraph,
  contractIds: readonly string[],
): RunMapGraph => {
  if (!contractIds.includes('contract.no_merchant_route')) {
    return graph;
  }

  const merchantNodeIds = new Set(
    graph.nodes
      .filter((node) => node.roomType === 'merchant' && FORCED_ROOM_BY_STAGE[node.stage] === undefined)
      .map((node) => node.id),
  );

  if (merchantNodeIds.size === 0) return graph;

  // Build a lookup of next-node-ids after transitive merchant removal.
  const merchantNext = new Map<string, readonly string[]>();
  for (const node of graph.nodes) {
    if (!merchantNodeIds.has(node.id)) continue;
    // Follow through chains of merchant nodes (unlikely but safe).
    const resolved = new Set<string>();
    const stack = [...node.nextNodeIds];
    while (stack.length > 0) {
      const candidate = stack.pop()!;
      if (merchantNodeIds.has(candidate)) {
        const inner = graph.nodes.find((n) => n.id === candidate);
        if (inner !== undefined) stack.push(...inner.nextNodeIds);
      } else {
        resolved.add(candidate);
      }
    }
    merchantNext.set(node.id, [...resolved]);
  }

  const filteredNodes = graph.nodes
    .filter((node) => !merchantNodeIds.has(node.id))
    .map((node) => ({
      ...node,
      nextNodeIds: node.nextNodeIds.flatMap((nextId) =>
        merchantNodeIds.has(nextId)
          ? merchantNext.get(nextId) ?? []
          : [nextId],
      ),
    }));

  // Deduplicate nextNodeIds per node after rewiring.
  const seen = new Set<string>();
  const deduped = filteredNodes.map((node) => {
    seen.clear();
    const uniqueNext: string[] = [];
    for (const nextId of node.nextNodeIds) {
      if (!seen.has(nextId)) {
        seen.add(nextId);
        uniqueNext.push(nextId);
      }
    }
    return { ...node, nextNodeIds: uniqueNext as readonly string[] };
  });

  return {
    seed: graph.seed,
    totalStages: graph.totalStages,
    nodes: deduped,
  };
};

export const getRunMapNodeById = (
  graph: RunMapGraph,
  nodeId: string,
): RunMapNode | undefined => graph.nodes.find((node) => node.id === nodeId);

export const getRunMapNodesForStage = (
  graph: RunMapGraph,
  stage: number,
): readonly RunMapNode[] => sortedStageNodes(graph, stage);

export const getAvailableNodeIdsForStage = (
  graph: RunMapGraph,
  pathByStage: RunMapPath,
  stage: number,
): readonly string[] => {
  if (!Number.isInteger(stage) || stage < 1 || stage > graph.totalStages) return [];

  const stageNodes = getRunMapNodesForStage(graph, stage);
  if (stageNodes.length === 0) return [];
  if (stage === 1) return stageNodes.map((node) => node.id);

  const previousNodeId = pathByStage[stage - 1];
  if (typeof previousNodeId !== 'string' || previousNodeId.length === 0) return [];

  const previousNode = getRunMapNodeById(graph, previousNodeId);
  if (previousNode === undefined) return [];

  const allowed = new Set(stageNodes.map((node) => node.id));
  return previousNode.nextNodeIds.filter((nodeId) => allowed.has(nodeId));
};

export const getSelectedNodeForStage = (
  graph: RunMapGraph,
  pathByStage: RunMapPath,
  stage: number,
): RunMapNode | null => {
  if (!Number.isInteger(stage) || stage < 1 || stage > graph.totalStages) return null;
  const nodeId = pathByStage[stage];
  if (typeof nodeId !== 'string' || nodeId.length === 0) return null;
  const node = getRunMapNodeById(graph, nodeId);
  if (node === undefined || node.stage !== stage) return null;
  return node;
};

const isSelectableNodeForStage = (
  graph: RunMapGraph,
  pathByStage: RunMapPath,
  stage: number,
  nodeId: string,
): boolean => {
  const available = getAvailableNodeIdsForStage(graph, pathByStage, stage);
  return available.includes(nodeId);
};

const fallbackNodeForStage = (
  graph: RunMapGraph,
  pathByStage: RunMapPath,
  stage: number,
  seed: number,
): string | null => {
  const available = getAvailableNodeIdsForStage(graph, pathByStage, stage);
  if (available.length === 0) return null;
  return available[pickIndex(seed, stage * 347, available.length)] ?? null;
};

export const repairRunMapPath = (
  graph: RunMapGraph,
  rawPathByStage: unknown,
  currentStage: number,
): Record<number, string> => {
  const sanitizedInput = sanitizePathInput(rawPathByStage);
  const output: Record<number, string> = {};
  const stageLimit = Math.max(1, Math.min(graph.totalStages, Math.trunc(currentStage)));

  // Completed stages need a valid deterministic path to preserve one-way traversal.
  for (let stage = 1; stage < stageLimit; stage += 1) {
    const candidate = sanitizedInput[stage];
    if (typeof candidate === 'string' && isSelectableNodeForStage(graph, output, stage, candidate)) {
      output[stage] = candidate;
      continue;
    }

    const fallback = fallbackNodeForStage(graph, output, stage, graph.seed);
    if (fallback !== null) {
      output[stage] = fallback;
    }
  }

  // Keep current-stage selection only if it remains valid.
  const currentCandidate = sanitizedInput[stageLimit];
  if (
    typeof currentCandidate === 'string' &&
    isSelectableNodeForStage(graph, output, stageLimit, currentCandidate)
  ) {
    output[stageLimit] = currentCandidate;
  }

  return output;
};

/**
 * Deterministically assign a room condition modifier to a node.
 * Higher-chance on elite/boss rooms (~60%), moderate on normal/event (~30%),
 * lower on economy rooms (~25%). Some conditions are room-type-specific.
 * Returns undefined when no condition is assigned.
 */
const generateRoomCondition = (
  seed: number,
  stage: number,
  nodeId: string,
  roomType: StageRoomType,
): StageConditionId | undefined => {
  const eligible = STAGE_CONDITIONS.filter(
    (c) =>
      c.allowedRoomTypes.includes(roomType) ||
      c.allowedRoomTypes.length === 0,
  );
  if (eligible.length === 0) return undefined;

  // Base chance by room type tier
  const eliteOrBoss =
    roomType === 'elite' ||
    roomType === 'mini_boss' ||
    roomType === 'gate' ||
    roomType === 'counter';
  const combatRoom =
    roomType === 'normal' || roomType === 'event' || roomType === 'anomaly';
  const economyRoom =
    roomType === 'treasure' || roomType === 'rest' || roomType === 'merchant';

  let baseChance: number;
  if (eliteOrBoss) baseChance = 60;
  else if (combatRoom) baseChance = 30;
  else if (economyRoom) baseChance = 25;
  else baseChance = 20;

  // Deterministic roll: same seed + stage + nodeId → same result
  const salt = stage * 313 + [...nodeId].reduce((s, c, i) => s + c.charCodeAt(0) * (i + 1) * 73, 0);
  const roll = hash(seed, salt) % 100;
  if (roll >= baseChance) return undefined;

  // Weighted pick among eligible conditions
  const totalWeight = eligible.reduce((sum, c) => sum + c.weight, 0);
  const pickRoll = hash(seed, salt + 997) % totalWeight;
  let cursor = 0;
  for (const cond of eligible) {
    cursor += cond.weight;
    if (pickRoll < cursor) return cond.id;
  }
  return eligible[eligible.length - 1]?.id;
};

export const createRunMapGraph = (
  seed: number,
  totalStages = RUN_MAP_TOTAL_STAGES,
): RunMapGraph => {
  const mapSeed = normalizeSeed(seed);
  const clampedStages = Math.max(1, Math.min(RUN_MAP_TOTAL_STAGES, Math.trunc(totalStages)));

  const mutableNodes: MutableNode[] = [];

  for (let stage = 1; stage <= clampedStages; stage += 1) {
    const forcedRoom = FORCED_ROOM_BY_STAGE[stage];
    const nodeCount = defaultNodeCountForStage(mapSeed, stage);
    const lanes = LANE_PRESETS[nodeCount] ?? LANE_PRESETS[1] ?? [3];

    const stageCounts: Partial<Record<StageRoomType, number>> = {};

    for (let i = 0; i < lanes.length; i += 1) {
      const lane = lanes[i] ?? 3;
      let roomType: StageRoomType;

      if (forcedRoom !== undefined) {
        roomType = forcedRoom;
      } else {
        const weightedPool = weightTableForStage(stage)
          .filter(([candidate]) => canPlaceRoomType(candidate, stageCounts));
        roomType = weightedPickRoom(mapSeed, stage * 97 + i * 29, weightedPool);
      }

      stageCounts[roomType] = (stageCounts[roomType] ?? 0) + 1;

      mutableNodes.push({
        id: `map.s${stage}.n${i}`,
        stage,
        lane,
        roomType,
        nextNodeIds: [],
        condition: generateRoomCondition(mapSeed, stage, `map.s${stage}.n${i}`, roomType),
      });
    }
  }

  for (let stage = 1; stage < clampedStages; stage += 1) {
    const currentNodes = mutableNodes
      .filter((node) => node.stage === stage)
      .sort((a, b) => a.lane - b.lane || a.id.localeCompare(b.id));
    const nextNodes = mutableNodes
      .filter((node) => node.stage === stage + 1)
      .sort((a, b) => a.lane - b.lane || a.id.localeCompare(b.id));

    for (const node of currentNodes) {
      node.nextNodeIds = computeForwardEdges(mapSeed, stage, node, nextNodes);
    }

    ensureIncomingCoverage(mapSeed, stage, currentNodes, nextNodes);
  }

  return {
    seed: mapSeed,
    totalStages: clampedStages,
    nodes: mutableNodes.map((node) => ({
      id: node.id,
      stage: node.stage,
      lane: node.lane,
      roomType: node.roomType,
      nextNodeIds: [...node.nextNodeIds],
    })),
  };
};
