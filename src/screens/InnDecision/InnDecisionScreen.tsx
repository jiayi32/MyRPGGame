import { useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '@/navigation/AppNavigator';
import { INN_DECISIONS, type InnDecisionDef } from '@/content';
import { useRunStore } from '@/stores';
import { PrimaryButton } from '@/components/atoms/PrimaryButton';

type Props = NativeStackScreenProps<HomeStackParamList, 'InnDecision'>;

const DECISION_ICONS: Record<string, string> = {
  'inn.recover': '❤',
  'inn.cleanse': '✨',
  'inn.focus': '⚡',
};

export function InnDecisionScreen({ navigation }: Props) {
  const stage = useRunStore((state) => state.stage);
  const selectInnDecision = useRunStore((state) => state.selectInnDecision);

  const [selectedId, setSelectedId] = useState<string | null>(null);

  const stageLabel = stage !== null ? `Stage ${stage}` : '';

  const handleConfirm = () => {
    if (selectedId === null) return;
    selectInnDecision(selectedId);
    navigation.replace('Battle');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Rest Stop</Text>
      <Text style={styles.subtitle}>
        {stageLabel} — Choose a pre-combat buff
      </Text>

      <FlatList
        data={INN_DECISIONS}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }: { item: InnDecisionDef }) => {
          const selected = selectedId === item.id;
          const icon = DECISION_ICONS[item.id] ?? '•';
          return (
            <Pressable
              onPress={() => setSelectedId(item.id)}
              style={[styles.card, selected && styles.cardSelected]}
            >
              <View style={styles.cardRow}>
                <Text style={styles.cardIcon}>{icon}</Text>
                <View style={styles.cardContent}>
                  <Text style={styles.cardName}>{item.name}</Text>
                  <Text style={styles.cardEffect}>{item.effectLabel}</Text>
                  <Text style={styles.cardDescription}>{item.description}</Text>
                </View>
              </View>
            </Pressable>
          );
        }}
      />

      <View style={styles.footer}>
        <PrimaryButton
          title="Confirm"
          onPress={handleConfirm}
          disabled={selectedId === null}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a1a' },
  title: { fontSize: 22, fontWeight: '700', color: '#ffffff', padding: 20, paddingBottom: 4 },
  subtitle: { fontSize: 13, color: '#aabbcc', paddingHorizontal: 20, marginBottom: 8 },
  list: { paddingHorizontal: 16, paddingBottom: 16, gap: 10 },
  card: {
    borderWidth: 1.5,
    borderColor: 'rgba(0,255,255,0.1)',
    borderRadius: 12,
    padding: 14,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  cardSelected: {
    borderColor: '#65a974',
    backgroundColor: '#e9f7eb',
  },
  cardRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  cardIcon: { fontSize: 22, width: 30, textAlign: 'center' },
  cardContent: { flex: 1, gap: 4 },
  cardName: { fontSize: 15, fontWeight: '700', color: '#1e3a5f' },
  cardEffect: { fontSize: 13, fontWeight: '600', color: '#4a7a3a' },
  cardDescription: { fontSize: 12, color: '#aabbcc', lineHeight: 17 },
  footer: { padding: 20, borderTopWidth: 1, borderTopColor: 'rgba(0,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.03)' },
});
