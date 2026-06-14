import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '@/navigation/AppNavigator';
import { PrimaryButton } from '@/components/atoms/PrimaryButton';

type Props = NativeStackScreenProps<HomeStackParamList, 'OnboardingNarrative'>;

const PROLOGUE_BEATS: ReadonlyArray<{ title: string; body: string }> = [
  {
    title: 'The Grid Awakens',
    body: 'A data breach beneath the corporate arcologies has awakened ancient code. Every sortie reshapes the network and tests a different specialization.',
  },
  {
    title: 'Victory Has A Price',
    body: 'Your haul splits between secured credits and at-risk vault rewards. Push deeper for bigger multipliers, or secure gains at checkpoints.',
  },
  {
    title: 'Corporations Remember',
    body: 'Each specialization choice echoes across your career. Quantum Cores strengthen your corp standing; Scrap will eventually unlock cross-corp evolution.',
  },
];

export function OnboardingNarrativeScreen({ navigation }: Props) {
  const enterClassSelect = () => navigation.replace('ClassSelect');

  return (
    <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.container}>
      <Text style={styles.eyebrow}>Briefing</Text>
      <Text style={styles.title}>Before You Jack In</Text>
      <Text style={styles.subtitle}>
        This world is built around short tactical sorties, escalating risk, and long-term corporate growth.
      </Text>

      <View style={styles.introCard}>
        <Text style={styles.introQuote}>
          "One sortie writes a legend. Many sorties forge a legacy."
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
  scrollContainer: { flex: 1, backgroundColor: '#0a0a1a' },
  container: { padding: 20, gap: 14 },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: '#ffb000',
  },
  title: { fontSize: 26, fontWeight: '700', color: '#ffffff' },
  subtitle: { fontSize: 14, color: '#aabbcc', lineHeight: 20 },
  introCard: {
    borderWidth: 1,
    borderColor: 'rgba(0,255,255,0.1)',
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 14,
  },
  introQuote: { fontSize: 15, color: '#aabbcc', fontStyle: 'italic', lineHeight: 22 },
  beats: { gap: 10 },
  beatCard: {
    borderWidth: 1,
    borderColor: 'rgba(0,255,255,0.1)',
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 12,
    gap: 4,
  },
  beatIndex: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: '#889999',
  },
  beatTitle: { fontSize: 16, fontWeight: '700', color: '#ffffff' },
  beatBody: { fontSize: 13, color: '#aabbcc', lineHeight: 19 },
  actions: { gap: 8, paddingTop: 6, paddingBottom: 8 },
});
