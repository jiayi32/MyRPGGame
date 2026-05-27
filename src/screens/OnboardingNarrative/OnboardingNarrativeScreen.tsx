import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '@/navigation/AppNavigator';
import { PrimaryButton } from '@/components/atoms/PrimaryButton';

type Props = NativeStackScreenProps<HomeStackParamList, 'OnboardingNarrative'>;

const PROLOGUE_BEATS: ReadonlyArray<{ title: string; body: string }> = [
  {
    title: 'The Ash Gate Opens',
    body: 'A rupture beneath the forge has awakened old ruins. Every descent reshapes the dungeon and tests a different path of power.',
  },
  {
    title: 'Victory Has A Cost',
    body: 'Your haul splits between safe banked rewards and at-risk vault rewards. Push deeper for bigger multipliers, or secure gains at checkpoints.',
  },
  {
    title: 'Lineages Remember',
    body: 'Each class choice echoes across future runs. Ascension Cells strengthen your lineage; rare Sigil Shards will eventually unlock cross-lineage evolution.',
  },
];

export function OnboardingNarrativeScreen({ navigation }: Props) {
  const enterClassSelect = () => navigation.replace('ClassSelect');

  return (
    <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.container}>
      <Text style={styles.eyebrow}>Prologue</Text>
      <Text style={styles.title}>Before You Enter The Dungeon</Text>
      <Text style={styles.subtitle}>
        This world is built around short tactical runs, escalating risk, and long-term lineage growth.
      </Text>

      <View style={styles.introCard}>
        <Text style={styles.introQuote}>
          "One run writes a legend. Many runs forge a lineage."
        </Text>
      </View>

      <View style={styles.beats}>
        {PROLOGUE_BEATS.map((beat, index) => (
          <View key={beat.title} style={styles.beatCard}>
            <Text style={styles.beatIndex}>0{index + 1}</Text>
            <Text style={styles.beatTitle}>{beat.title}</Text>
            <Text style={styles.beatBody}>{beat.body}</Text>
          </View>
        ))}
      </View>

      <View style={styles.actions}>
        <PrimaryButton title="Choose Class" onPress={enterClassSelect} />
        <PrimaryButton title="Skip Prologue" variant="secondary" onPress={enterClassSelect} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: { flex: 1, backgroundColor: '#f6f1e8' },
  container: { padding: 20, gap: 14 },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: '#7a3b00',
  },
  title: { fontSize: 26, fontWeight: '700', color: '#2b1f10' },
  subtitle: { fontSize: 14, color: '#5d4d35', lineHeight: 20 },
  introCard: {
    borderWidth: 1,
    borderColor: '#cdbda4',
    borderRadius: 12,
    backgroundColor: '#fffaf0',
    padding: 14,
  },
  introQuote: { fontSize: 15, color: '#503a1f', fontStyle: 'italic', lineHeight: 22 },
  beats: { gap: 10 },
  beatCard: {
    borderWidth: 1,
    borderColor: '#d8cdbb',
    borderRadius: 12,
    backgroundColor: '#fffdf8',
    padding: 12,
    gap: 4,
  },
  beatIndex: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: '#9c7c57',
  },
  beatTitle: { fontSize: 16, fontWeight: '700', color: '#2d2213' },
  beatBody: { fontSize: 13, color: '#4e4539', lineHeight: 19 },
  actions: { gap: 8, paddingTop: 6, paddingBottom: 8 },
});
