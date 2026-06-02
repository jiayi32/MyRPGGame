import { CtIndicator as DesignCtIndicator } from '@/components/atoms/CtIndicator';
import type { Unit } from '@/domain/combat';

/**
 * Battle-specific wrapper around the design system CtIndicator.
 * Extracts CT value from Unit and determines ready state.
 */
export function CtIndicator({ unit, isReady }: { unit: Unit; isReady: boolean }) {
  const variant = unit.team === 'player' ? 'player' : 'enemy';
  return <DesignCtIndicator ct={unit.ct} isReady={isReady} variant={variant} />;
}
