import type { ClassData, ClassId } from './types';
import { DRAKEHORN_CLASSES } from './classes/drakehornForge';
import { STUB_CLASSES } from './classes/stubs';

export const CLASSES: readonly ClassData[] = [...DRAKEHORN_CLASSES, ...STUB_CLASSES];

export const CLASS_BY_ID: ReadonlyMap<ClassId, ClassData> = new Map(CLASSES.map((c) => [c.id, c]));
