// Lineage system core logic
// Handles lineage adjacency, evolution, and validation

import { LINEAGES, Lineage } from '../content/lineages';

export function getAdjacentLineages(lineageId: string): Lineage[] {
  const lineage = LINEAGES.find(l => l.id === lineageId);
  if (!lineage) return [];
  return LINEAGES.filter(l => lineage.adjacency.includes(l.id));
}

export function canEvolveTo(currentId: string, targetId: string): boolean {
  const lineage = LINEAGES.find(l => l.id === currentId);
  return lineage ? lineage.adjacency.includes(targetId) : false;
}
