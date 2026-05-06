import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '@/ui/theme';
import { lines, stations } from '@/transit/graph';

export default function Settings() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>Settings</Text>

      <Section title="About">
        <Text style={styles.body}>
          Catch Transit is a *Jet Lag*–style game for Mumbai's Local & Metro network. Solo MVP —
          multiplayer Tag arrives in the next phase.
        </Text>
      </Section>

      <Section title="Network data">
        <Text style={styles.body}>
          {stations.length} stations, {lines.length} lines (seed). Run{' '}
          <Text style={styles.code}>pnpm build:transit</Text> to refresh from OpenStreetMap.
        </Text>
      </Section>

      <Section title="Safety">
        <Text style={styles.body}>
          Do not play while crossing tracks, on the road, or during peak rush. Mind the gap, keep
          one hand on a grab pole, and stay out of the goods compartment.
        </Text>
      </Section>

      <Section title="Privacy">
        <Text style={styles.body}>
          Your location is only used on-device to detect station arrivals. Nothing is uploaded in
          the solo MVP.
        </Text>
      </Section>
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, gap: spacing.lg },
  heading: { color: colors.text, fontSize: 28, fontWeight: '800' },
  section: { gap: spacing.sm },
  sectionTitle: { color: colors.textMuted, fontSize: 12, letterSpacing: 1 },
  card: {
    backgroundColor: colors.bgElevated,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  body: { color: colors.text, fontSize: 14, lineHeight: 21 },
  code: {
    fontFamily: 'Courier',
    color: colors.accent,
    backgroundColor: colors.bgCard,
    paddingHorizontal: 4,
  },
});
