import {
  createRunMapGraph,
  getAvailableNodeIdsForStage,
  getRunMapNodeById,
  getRunMapNodesForStage,
  repairRunMapPath,
} from '../map';

describe('run map graph', () => {
  it('is deterministic for the same seed', () => {
    const a = createRunMapGraph(20260501);
    const b = createRunMapGraph(20260501);
    expect(a).toEqual(b);
  });

  it('enforces forced boss and gate stages', () => {
    const graph = createRunMapGraph(77);

    const stage5 = getRunMapNodesForStage(graph, 5);
    const stage10 = getRunMapNodesForStage(graph, 10);
    const stage20 = getRunMapNodesForStage(graph, 20);
    const stage30 = getRunMapNodesForStage(graph, 30);

    expect(stage5).toHaveLength(1);
    expect(stage10).toHaveLength(1);
    expect(stage20).toHaveLength(1);
    expect(stage30).toHaveLength(1);

    expect(stage5[0]?.roomType).toBe('mini_boss');
    expect(stage10[0]?.roomType).toBe('gate');
    expect(stage20[0]?.roomType).toBe('gate');
    expect(stage30[0]?.roomType).toBe('counter');
  });

  it('connects nodes forward only and keeps all next-stage nodes reachable', () => {
    const graph = createRunMapGraph(1337);

    for (const node of graph.nodes) {
      if (node.stage === graph.totalStages) {
        expect(node.nextNodeIds).toHaveLength(0);
        continue;
      }

      expect(node.nextNodeIds.length).toBeGreaterThan(0);
      for (const nextId of node.nextNodeIds) {
        const nextNode = getRunMapNodeById(graph, nextId);
        expect(nextNode).toBeDefined();
        expect(nextNode?.stage).toBe(node.stage + 1);
      }
    }

    for (let stage = 2; stage <= graph.totalStages; stage += 1) {
      const previousStageNodes = getRunMapNodesForStage(graph, stage - 1);
      const currentStageNodes = getRunMapNodesForStage(graph, stage);
      const incoming = new Set(
        previousStageNodes.flatMap((node) => node.nextNodeIds),
      );
      for (const node of currentStageNodes) {
        expect(incoming.has(node.id)).toBe(true);
      }
    }
  });

  it('repairs missing history for completed stages and leaves current stage unselected', () => {
    const graph = createRunMapGraph(9901);
    const repaired = repairRunMapPath(graph, {}, 8);

    for (let stage = 1; stage <= 7; stage += 1) {
      const selectedNodeId = repaired[stage];
      expect(typeof selectedNodeId).toBe('string');
      const available = getAvailableNodeIdsForStage(graph, repaired, stage);
      expect(available.includes(selectedNodeId ?? '')).toBe(true);
    }

    expect(repaired[8]).toBeUndefined();
    expect(getAvailableNodeIdsForStage(graph, repaired, 8).length).toBeGreaterThan(0);
  });
});
