import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/ui/Button';
import { colors, radius, spacing } from '@/ui/theme';
import { getLine, getLinesAtStation, getStation, neighbors } from '@/transit/graph';

export default function StationDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const station = id ? getStation(id) : undefined;

  if (!station) {
    return (
      <View style={styles.empty}>
        <Text style={styles.text}>Station not found.</Text>
        <Button title="Back" onPress={() => router.back()} />
      </View>
    );
  }

  const linesAtStation = getLinesAtStation(station.id);
  const adjacents = neighbors(station.id);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>{station.name}</Text>
      <Text style={styles.coords}>
        {station.lat.toFixed(4)}, {station.lng.toFixed(4)} • {station.zone}
      </Text>

      <Text style={styles.sectionTitle}>Lines</Text>
      <View style={styles.lineRow}>
        {linesAtStation.map((line) => (
          <View key={line.id} style={[styles.lineChip, { borderColor: line.color }]}>
            <View style={[styles.lineDot, { backgroundColor: line.color }]} />
            <Text style={styles.lineName}>{line.name}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Connections</Text>
      <View style={styles.list}>
        {adjacents.length === 0 ? (
          <Text style={styles.muted}>No connections in seed graph.</Text>
        ) : (
          adjacents.map((edge) => {
            const line = getLine(edge.lineId);
            const target = getStation(edge.neighborId);
            return (
              <View key={`${edge.neighborId}-${edge.lineId}`} style={styles.row}>
                <View style={[styles.lineDotSmall, { backgroundColor: line?.color ?? '#888' }]} />
                <Text style={styles.rowText}>
                  {target?.name ?? edge.neighborId}
                  <Text style={styles.muted}>
                    {'  '}
                    {Math.round(edge.travelMinutes)} min
                  </Text>
                </Text>
              </View>
            );
          })
        )}
      </View>

      <Button title="Close" variant="secondary" onPress={() => router.back()} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, gap: spacing.lg },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  text: { color: colors.text, fontSize: 16 },
  heading: { color: colors.text, fontSize: 28, fontWeight: '800' },
  coords: { color: colors.textMuted, fontSize: 12 },
  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  lineRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  lineChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    borderWidth: 1,
    backgroundColor: colors.bgElevated,
  },
  lineDot: { width: 10, height: 10, borderRadius: 5 },
  lineDotSmall: { width: 8, height: 8, borderRadius: 4 },
  lineName: { color: colors.text, fontSize: 13 },
  list: {
    backgroundColor: colors.bgElevated,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  rowText: { color: colors.text, fontSize: 14, flex: 1 },
  muted: { color: colors.textMuted, fontSize: 13 },
});
