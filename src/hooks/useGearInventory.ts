import { useEffect, useMemo, useState } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  updateDoc,
  writeBatch,
} from '@react-native-firebase/firestore';
import { getFirestore } from '@/services/firebase';
import { usePlayerStore } from '@/stores';
import {
  type GearLookupResult,
  type GearSlot,
  lookupGearTemplate,
} from '@/content/gear';

export interface GearInstance {
  instanceId: string;
  templateId: string;
  obtainedFromRunId: string | null;
  equipped: boolean;
  resolved?: GearLookupResult;
}

export interface GearInventoryBySlot {
  weapon: GearInstance[];
  armor: GearInstance[];
  accessory: GearInstance[];
}

const EMPTY_BY_SLOT: GearInventoryBySlot = { weapon: [], armor: [], accessory: [] };

const groupBySlot = (instances: readonly GearInstance[]): GearInventoryBySlot => {
  const out: GearInventoryBySlot = { weapon: [], armor: [], accessory: [] };
  for (const inst of instances) {
    const slot = inst.resolved?.slot;
    if (slot === 'weapon' || slot === 'armor' || slot === 'accessory') {
      out[slot].push(inst);
    }
  }
  return out;
};

export interface UseGearInventoryResult {
  instances: GearInstance[];
  bySlot: GearInventoryBySlot;
  equippedBySlot: Partial<Record<GearSlot, GearInstance>>;
  loading: boolean;
  error: string | null;
  /** Equip a gear instance, atomically unequipping any other instance in the same slot. */
  equip: (instanceId: string) => Promise<void>;
  /** Unequip a gear instance. No-op if already unequipped. */
  unequip: (instanceId: string) => Promise<void>;
}

/**
 * Subscribes to `players/{uid}/gear` and exposes equip/unequip helpers.
 *
 * Rules: Firestore allows the owning player to read+write this sub-collection
 * (see [firebase/firestore.rules](../../../firebase/firestore.rules)), so equip
 * toggles run client-side without a callable round-trip.
 *
 * Returns an empty inventory until the playerStore has bootstrapped.
 */
export function useGearInventory(): UseGearInventoryResult {
  const uid = usePlayerStore((state) => state.uid);
  const [instances, setInstances] = useState<GearInstance[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (uid === null) {
      setInstances([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    const gearCol = collection(getFirestore(), 'players', uid, 'gear');
    const unsubscribe = onSnapshot(
      gearCol,
      (snapshot) => {
        const next: GearInstance[] = snapshot.docs.map((d) => {
          const data = d.data() as {
            templateId?: unknown;
            obtainedFromRunId?: unknown;
            equipped?: unknown;
          };
          const templateId = typeof data.templateId === 'string' ? data.templateId : '';
          const obtainedFromRunId =
            typeof data.obtainedFromRunId === 'string' ? data.obtainedFromRunId : null;
          const equipped = data.equipped === true;
          const resolved = templateId.length > 0 ? lookupGearTemplate(templateId) : undefined;
          return {
            instanceId: d.id,
            templateId,
            obtainedFromRunId,
            equipped,
            ...(resolved !== undefined ? { resolved } : {}),
          };
        });
        setInstances(next);
        setLoading(false);
      },
      (err) => {
        setError(err instanceof Error ? err.message : String(err));
        setLoading(false);
      },
    );
    return unsubscribe;
  }, [uid]);

  const bySlot = useMemo(() => (instances.length === 0 ? EMPTY_BY_SLOT : groupBySlot(instances)), [
    instances,
  ]);

  const equippedBySlot = useMemo(() => {
    const out: Partial<Record<GearSlot, GearInstance>> = {};
    for (const inst of instances) {
      if (inst.equipped && inst.resolved) {
        out[inst.resolved.slot] = inst;
      }
    }
    return out;
  }, [instances]);

  const equip = async (instanceId: string): Promise<void> => {
    if (uid === null) return;
    const target = instances.find((i) => i.instanceId === instanceId);
    if (target === undefined || target.resolved === undefined) {
      throw new Error(`Cannot equip: instance ${instanceId} unresolved.`);
    }
    const slot = target.resolved.slot;
    const others = instances.filter(
      (i) => i.equipped && i.resolved?.slot === slot && i.instanceId !== instanceId,
    );

    const db = getFirestore();
    const batch = writeBatch(db);
    for (const o of others) {
      const ref = doc(db, 'players', uid, 'gear', o.instanceId);
      batch.update(ref, { equipped: false });
    }
    const targetRef = doc(db, 'players', uid, 'gear', instanceId);
    batch.update(targetRef, { equipped: true });
    await batch.commit();
  };

  const unequip = async (instanceId: string): Promise<void> => {
    if (uid === null) return;
    const ref = doc(getFirestore(), 'players', uid, 'gear', instanceId);
    await updateDoc(ref, { equipped: false });
  };

  return { instances, bySlot, equippedBySlot, loading, error, equip, unequip };
}
