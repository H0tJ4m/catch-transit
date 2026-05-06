import { Link, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/ui/Button';
import { colors, radius, spacing } from '@/ui/theme';
import { useGame } from '@/game/store';
import { stations, lines } from '@/transit/graph';

export default function Home() {
  const router = useRouter();
  const startSession = useGame((s) => s.startSession);

  const startMode = (mode: 'free-roam' | 'daily-challenge') => {
    startSession(mode);
    router.push('/play/map');
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>Catch Transit</Text>
      <Text style={styles.subheading}>
        Play across the Mumbai Metropolitan Region rail network — Locals, Metro, all of it.
      </Text>

      <View style={styles.statsRow}>
        <Stat label="Stations" value={stations.length.toString()} />
        <Stat label="Lines" value={lines.length.toString()} />
        <Stat label="Mode" value="Solo" />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Game modes</Text>
        <View style={styles.modeCard}>
          <Text style={styles.modeTitle}>Daily Challenge</Text>
          <Text style={styles.modeDesc}>
            Reach 3 randomly-chosen stations across MMR. Cards trigger on arrival. Score points
            against the clock.
          </Text>
          <Button title="Start daily" onPress={() => startMode('daily-challenge')} />
        </View>

        <View style={styles.modeCard}>
          <Text style={styles.modeTitle}>Free Roam</Text>
          <Text style={styles.modeDesc}>
            Open-ended. Travel anywhere on the network and pull cards as you go. Good for testing
            the system on your commute.
          </Text>
          <Button
            title="Start free roam"
            variant="secondary"
            onPress={() => startMode('free-roam')}
          />
        </View>

        <View style={styles.modeCard}>
          <Text style={styles.modeTitle}>Tag (Multiplayer)</Text>
          <Text style={styles.modeDesc}>
            One runner, several chasers. Real-time location sync via 4-letter room codes. Roles
            rotate after every capture.
          </Text>
          <Button
            title="Open Tag"
            variant="secondary"
            onPress={() => router.push('/tag')}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Link href="/settings" style={styles.link}>
          Settings
        </Link>
      </View>
    </ScrollView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    gap: spacing.lg,
    backgroundColor: colors.bg,
    flexGrow: 1,
  },
  heading: { color: colors.text, fontSize: 32, fontWeight: '800' },
  subheading: { color: colors.textMuted, fontSize: 15, lineHeight: 22 },
  statsRow: { flexDirection: 'row', gap: spacing.md },
  stat: {
    flex: 1,
    backgroundColor: colors.bgElevated,
    padding: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  statValue: { color: colors.accent, fontSize: 24, fontWeight: '700' },
  statLabel: { color: colors.textMuted, fontSize: 12, marginTop: spacing.xs },
  section: { gap: spacing.md },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: '700' },
  modeCard: {
    backgroundColor: colors.bgElevated,
    padding: spacing.md,
    borderRadius: radius.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modeTitle: { color: colors.text, fontSize: 18, fontWeight: '700' },
  modeDesc: { color: colors.textMuted, fontSize: 14, lineHeight: 20 },
  link: { color: colors.accent, fontSize: 15, paddingVertical: spacing.sm },
});
