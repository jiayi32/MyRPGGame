import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import type { BattleEvent, InstanceId } from '@/domain/combat';
import { useCombatEventStream } from '@/hooks/useCombatEventStream';

interface PopupItem {
  /** Stable id derived from log index. */
  id: number;
  text: string;
  kind: 'damage' | 'heal' | 'crit' | 'miss' | 'dot' | 'hot';
}

/**
 * Float-and-fade damage / heal popup overlay for a single unit.
 *
 * Listens on the global combat event stream and only renders popups whose
 * target matches `unitId`. Each popup self-removes after ~700ms via the
 * onComplete callback set by AnimatedPopup.
 */
export function DamagePopupOverlay({ unitId }: { unitId: InstanceId }) {
  const [items, setItems] = useState<readonly PopupItem[]>([]);

  useCombatEventStream((event: BattleEvent, indexInLog: number) => {
    const item = popupForEvent(event, indexInLog, unitId);
    if (item === null) return;
    setItems((prev) => [...prev, item]);
  });

  const remove = (id: number): void => {
    setItems((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <View pointerEvents="none" style={styles.overlay}>
      {items.map((item) => (
        <AnimatedPopup key={item.id} item={item} onComplete={() => remove(item.id)} />
      ))}
    </View>
  );
}

function popupForEvent(
  event: BattleEvent,
  indexInLog: number,
  unitId: InstanceId,
): PopupItem | null {
  if (event.type === 'damage' && event.targetUnitId === unitId) {
    const amount = Math.round(event.amount);
    if (event.hitTier === 'fail') return { id: indexInLog, text: 'miss', kind: 'miss' };
    if (event.hitTier === 'critical') {
      return { id: indexInLog, text: `−${amount}!`, kind: 'crit' };
    }
    return { id: indexInLog, text: `−${amount}`, kind: 'damage' };
  }
  if (event.type === 'heal' && event.targetUnitId === unitId) {
    return { id: indexInLog, text: `+${Math.round(event.amount)}`, kind: 'heal' };
  }
  if (event.type === 'status_tick' && event.targetUnitId === unitId) {
    if (event.statusKind === 'dot') {
      return { id: indexInLog, text: `−${Math.round(event.amount)}`, kind: 'dot' };
    }
    if (event.statusKind === 'hot') {
      return { id: indexInLog, text: `+${Math.round(event.amount)}`, kind: 'hot' };
    }
  }
  return null;
}

const KIND_COLORS: Record<PopupItem['kind'], string> = {
  damage: '#c04040',
  crit: '#ff7030',
  miss: '#888',
  heal: '#3a8a5a',
  dot: '#a040a0',
  hot: '#5aaa3a',
};

function AnimatedPopup({ item, onComplete }: { item: PopupItem; onComplete: () => void }) {
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 100 });
    translateY.value = withTiming(
      -36,
      { duration: 700, easing: Easing.out(Easing.cubic) },
      (finished) => {
        if (finished) runOnJS(onComplete)();
      },
    );
    // Fade out near the end.
    opacity.value = withTiming(0, { duration: 700, easing: Easing.in(Easing.cubic) });
  }, [opacity, translateY, onComplete]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const color = KIND_COLORS[item.kind];
  const isCrit = item.kind === 'crit';

  return (
    <Animated.Text
      style={[
        styles.popup,
        { color },
        isCrit && styles.popupCrit,
        style,
      ]}
    >
      {item.text}
    </Animated.Text>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 0,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  popup: {
    position: 'absolute',
    top: -4,
    fontSize: 14,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  popupCrit: {
    fontSize: 18,
  },
});
