import { Bar } from '@/components/atoms/Bar';
import type { Unit } from '@/domain/combat';

export function MpBar({ unit }: { unit: Unit }) {
  return <Bar current={unit.mp} max={unit.mpMax} variant="mp" height={8} showLabel={false} width="100%" />;
}
