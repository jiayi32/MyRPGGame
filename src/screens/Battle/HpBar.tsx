import { Bar } from '@/components/atoms/Bar';
import type { Unit } from '@/domain/combat';
import { colors } from '@/design';

export function HpBar({ unit, color = colors.accent.emerald }: { unit: Unit; color?: string }) {
  // For enemy units, use crimson tone; for player, use provided color (default emerald)
  return <Bar current={unit.hp} max={unit.hpMax} variant="hp" height={10} pixelLabel width="100%" />;
}
