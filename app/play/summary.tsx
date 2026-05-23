import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/ui/Button';
import { useGame } from '@/game/store';
import { getStation } from '@/transit/graph';
import { colors, radius, spacing } from '@/ui/theme';

export default function Summary() {
  const router = useRouter();
  const session = useGame((s) => s.session);

  if (!session) {
    return (
      <View style={styles.empty}>
        <Text style={styles.text}>No session.</Text>
        <Button title="Home" onPress={() => router.replace('/')} />
      </View>
    );
  }

  const elapsedMin = session.endedAt
    ? Math.round((session.endedAt - session.startedAt) / 60_000)
    : 0;
  const successCount = session.events.filter((e) => e.result === 'success').length;
  const failCount = session.events.filter((e) => e.result === 'fail').length;
  const skipCount = session.events.filter((e) => e.result === 'skip').length;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>Session complete</Text>

      <View style={styles.statRow}>
        <Stat label="Score" value={session.score.toString()} accent />
        <Stat label="Stations" value={session.visitedStationIds.length.toString()} />
        <Stat label="Minutes" value={elapsedMin.toString()} />
      </View>

      <View style={styles.statRow}>
        <Stat label="Wins" value={successCount.toString()} />
        <Stat label="Fails" value={failCount.toString()} />
        <Stat label="Skips" value={skipCount.toString()} />
      </View>

      <Text style={styles.sectionTitle}>Visited</Text>
      <View style={styles.list}>
        {session.visitedStationIds.length === 0 ? (
          <Text style={styles.muted}>No stations visited.</Text>
        ) : (
          session.visitedStationIds.map((id) => (
            <Text key={id} style={styles.listRow}>
              • {getStation(id)?.name ?? id}
            </Text>
          ))
        )}
      </View>

      <Text style={styles.sectionTitle}>Card history</Text>
      <View style={styles.list}>
        {session.events.length === 0 ? (
          <Text style={styles.muted}>No cards drawn.</Text>
        ) : (
          session.events.map((ev, i) => (
            <View key={i} style={styles.eventRow}>
              <Text style={styles.eventTitle}>{ev.cardId}</Text>
              <Text
                style={[
                  styles.eventResult,
                  {
                    color:
                      ev.result === 'success'
                        ? colors.success
                        : ev.result === 'fail'
                        ? colors.danger
                        : colors.textMuted,
                  },
                ]}
              >
                {ev.result} ({ev.scoreDelta >= 0 ? '+' : ''}
                {ev.scoreDelta})
              </Text>
            </View>
          ))
        )}
      </View>

      <Button title="Back to home" onPress={() => router.replace('/')} />
    </ScrollView>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, accent ? { color: colors.accent } : null]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, gap: spacing.lg, flexGrow: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  text: { color: colors.text, fontSize: 16 },
  heading: { color: colors.text, fontSize: 28, fontWeight: '800' },
  statRow: { flexDirection: 'row', gap: spacing.md },
  stat: {
    flex: 1,
    backgroundColor: colors.bgElevated,
    padding: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  statValue: { color: colors.text, fontSize: 22, fontWeight: '800' },
  statLabel: { color: colors.textMuted, fontSize: 11, marginTop: spacing.xs, letterSpacing: 1 },
  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  list: {
    backgroundColor: colors.bgElevated,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  listRow: { color: colors.text, fontSize: 14 },
  muted: { color: colors.textMuted, fontSize: 13 },
  eventRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  eventTitle: { color: colors.text, fontSize: 13, flex: 1 },
  eventResult: { fontSize: 13, fontWeight: '700' },
});
