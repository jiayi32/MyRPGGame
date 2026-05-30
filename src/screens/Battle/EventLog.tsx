import { StyleSheet, Text, View } from 'react-native';

const EVENT_LOG_TAIL = 6;

interface EventLogEntry {
  tick: number;
  type: string;
  [k: string]: unknown;
}

interface SummarizedEvent {
  icon: string;
  text: string;
  color: string;
}

const EVENT_STYLE: Record<string, { icon: string; color: string }> = {
  damage: { icon: '⚔', color: '#e57373' },
  heal: { icon: '💚', color: '#81c784' },
  skill_cast: { icon: '◆', color: '#64b5f6' },
  unit_died: { icon: '💀', color: '#bdbdbd' },
  status_applied: { icon: '✨', color: '#ce93d8' },
  status_expired: { icon: '⏳', color: '#90a4ae' },
  status_tick: { icon: '•', color: '#ffb74d' },
  battle_ended: { icon: '🏁', color: '#ffb74d' },
  battle_started: { icon: '▶', color: '#81c784' },
  ct_shift: { icon: '⏱', color: '#ffb74d' },
  effect_stub: { icon: '⬡', color: '#90a4ae' },
};

const FALLBACK_STYLE = { icon: '·', color: '#9aa0c0' };

function summarizeEvent(e: EventLogEntry): SummarizedEvent {
  const style = EVENT_STYLE[e.type] ?? FALLBACK_STYLE;
  switch (e.type) {
    case 'damage': {
      const amount = (e['amount'] as number)?.toFixed?.(0) ?? e['amount'];
      const tier = e['hitTier'];
      const tierSuffix = tier === 'critical' ? ' CRIT!' : tier === 'miss' ? ' miss' : '';
      return { icon: style.icon, text: `${amount} dmg${tierSuffix}`, color: style.color };
    }
    case 'heal': {
      const amount = (e['amount'] as number)?.toFixed?.(0) ?? e['amount'];
      return { icon: style.icon, text: `+${amount} HP`, color: style.color };
    }
    case 'skill_cast': return { icon: style.icon, text: `${e['skillId']}`, color: style.color };
    case 'unit_died': return { icon: style.icon, text: `${e['unitId']}`, color: style.color };
    case 'status_applied': return { icon: style.icon, text: `${e['statusKind']}`, color: style.color };
    case 'status_expired': return { icon: style.icon, text: `${e['statusKind']} off`, color: style.color };
    case 'status_tick': {
      const amount = (e['amount'] as number)?.toFixed?.(0) ?? e['amount'];
      return { icon: style.icon, text: `${e['statusKind']} ${amount}`, color: style.color };
    }
    case 'battle_ended': return { icon: style.icon, text: `${(e['result'] as string)?.toUpperCase()}`, color: style.color };
    case 'battle_started': return { icon: style.icon, text: 'start', color: style.color };
    case 'ct_shift': return { icon: style.icon, text: `CT ${e['delta']}`, color: style.color };
    case 'effect_stub': return { icon: style.icon, text: `${e['kind']}`, color: style.color };
    default: return { icon: style.icon, text: e.type, color: style.color };
  }
}

const tickToSeconds = (tick: number): string => {
  const totalSec = tick / 10;
  if (totalSec < 60) return `${totalSec.toFixed(1)}s`;
  const mins = Math.floor(totalSec / 60);
  const secs = (totalSec % 60).toFixed(0);
  return `${mins}m ${secs}s`;
};

export function EventLog({
  events,
  maxEvents = EVENT_LOG_TAIL,
}: {
  events: readonly EventLogEntry[];
  maxEvents?: number;
}) {
  if (events.length === 0) return null;
  const tail = events.slice(-Math.max(1, maxEvents));
  return (
    <View style={styles.eventLog}>
      <Text style={styles.eventLogTitle}>Combat Log</Text>
      {tail.map((e, i) => {
        const summary = summarizeEvent(e);
        return (
          <View key={`${e.tick}_${i}`} style={styles.eventRow}>
            <Text style={styles.eventTime}>{tickToSeconds(e.tick)}</Text>
            <Text style={styles.eventIcon}>{summary.icon}</Text>
            <Text style={[styles.eventText, { color: summary.color }]} numberOfLines={1}>
              {summary.text}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  eventLog: {
    borderRadius: 10,
    backgroundColor: '#1d212e',
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 3,
  },
  eventLogTitle: { fontSize: 11, fontWeight: '700', color: '#9aa0c0', marginBottom: 2 },
  eventRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  eventTime: { fontSize: 10, color: '#5a6080', fontFamily: 'monospace', width: 42 },
  eventIcon: { fontSize: 11, width: 16, textAlign: 'center' },
  eventText: { fontSize: 11, fontWeight: '600', flex: 1 },
});

