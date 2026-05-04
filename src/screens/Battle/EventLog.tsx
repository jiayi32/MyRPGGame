import { StyleSheet, Text, View } from 'react-native';

const EVENT_LOG_TAIL = 8;

function summarizeEvent(e: { type: string; [k: string]: unknown }): string {
  switch (e.type) {
    case 'damage': return `damage ${(e['amount'] as number)?.toFixed?.(0) ?? e['amount']} (${e['hitTier']})`;
    case 'heal': return `heal ${(e['amount'] as number)?.toFixed?.(0) ?? e['amount']}`;
    case 'skill_cast': return `cast ${e['skillId']} (${e['hitTier']})`;
    case 'unit_died': return `${e['unitId']} died`;
    case 'status_applied': return `${e['statusKind']} → ${e['targetUnitId']}`;
    case 'status_expired': return `${e['statusKind']} expired`;
    case 'status_tick': return `${e['statusKind']} tick ${(e['amount'] as number)?.toFixed?.(0) ?? e['amount']}`;
    case 'battle_ended': return `BATTLE ${(e['result'] as string)?.toUpperCase()}`;
    case 'battle_started': return 'battle started';
    case 'ct_shift': return `CT shift ${e['delta']}`;
    case 'effect_stub': return `${e['kind']} (stub)`;
    default: return e.type;
  }
}

export function EventLog({ events }: { events: readonly { tick: number; type: string; [k: string]: unknown }[] }) {
  if (events.length === 0) return null;
  const tail = events.slice(-EVENT_LOG_TAIL);
  return (
    <View style={styles.eventLog}>
      <Text style={styles.eventLogTitle}>Recent Events</Text>
      {tail.map((e, i) => (
        <Text key={`${e.tick}_${i}`} style={styles.eventLogLine}>
          t={e.tick} {summarizeEvent(e)}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  eventLog: {
    borderRadius: 10,
    backgroundColor: '#1d212e',
    padding: 10,
    gap: 2,
  },
  eventLogTitle: { fontSize: 11, fontWeight: '700', color: '#9aa0c0', marginBottom: 2 },
  eventLogLine: { fontSize: 11, color: '#d0d4e8', fontFamily: 'monospace' },
});
