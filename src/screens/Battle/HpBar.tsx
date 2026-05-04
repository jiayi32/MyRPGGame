import { AnimatedHpBar } from '@/components/atoms/AnimatedHpBar';
import type { Unit } from '@/domain/combat';

export function HpBar({ unit, color = '#4a9a5a' }: { unit: Unit; color?: string }) {
  return <AnimatedHpBar hp={unit.hp} hpMax={unit.hpMax} color={color} />;
}
