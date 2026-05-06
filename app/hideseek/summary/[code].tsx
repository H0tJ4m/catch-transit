import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/ui/Button';
import { useRoomStore, selectMe } from '@/multiplayer/store';
import { useRoomSync } from '@/multiplayer/hooks/useRoomSync';
import { getStation } from '@/transit/graph';
import { colors, radius, spacing } from '@/ui/theme';
import { leaveRoom } from '@/firebase/rooms';

export default function HideSeekSummary() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const router = useRouter();
  const setRoomCode = useRoomStore((s) => s.setRoomCode);
  const room = useRoomStore((s) => s.room);
  const players = useRoomStore((s) => s.players);
  const events = useRoomStore((s) => s.events);
  const hints = useRoomStore((s) => s.hints);
  const questions = useRoomStore((s) => s.questions);
  const me = useRoomStore(selectMe);

  useEffect(() => {
    if (code) setRoomCode(code);
  }, [code, setRoomCode]);

  useRoomSync();

  const handleLeave = async () => {
    if (code && me?.uid) await leaveRoom(code, me.uid);
    setRoomCode(null);
    router.replace('/');
  };

  if (room?.mode !== 'hide-seek') return null;
  const found = events.find((e) => e.type === 'hider-found');
  const hiderStationName = room.config.hiderStationId
    ? getStation(room.config.hiderStationId)?.name
    : '—';

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>Round complete</Text>
      <Text style={styles.subtitle}>
        Winner: {room.winner ?? (found ? 'seekers' : 'undecided')}
      </Text>

      <View style={styles.list}>
        <Text style={styles.row}>
          The hider was at <Text style={styles.bold}>{hiderStationName}</Text>.
        </Text>
        {found && found.type === 'hider-found' ? (
          <Text style={styles.row}>
            Found by{' '}
            <Text style={styles.bold}>
              {players.find((p) => p.uid === found.finderUid)?.name ?? found.finderUid}
            </Text>{' '}
            at the station.
          </Text>
        ) : (
          <Text style={styles.muted}>The hider survived the round.</Text>
        )}
      </View>

      <Text style={styles.sectionTitle}>Questions ({questions.length})</Text>
      <View style={styles.list}>
        {questions.length === 0 ? (
          <Text style={styles.muted}>None asked.</Text>
        ) : (
          questions.map((q) => (
            <Text key={q.id} style={styles.row}>
              <Text style={styles.bold}>{q.askerName}:</Text> {q.text} → {q.answer ?? '—'}
            </Text>
          ))
        )}
      </View>

      <Text style={styles.sectionTitle}>Hints bought ({hints.length})</Text>
      <View style={styles.list}>
        {hints.length === 0 ? (
          <Text style={styles.muted}>None.</Text>
        ) : (
          hints.map((h) => (
            <Text key={h.id} style={styles.row}>
              <Text style={styles.bold}>{h.askerName}:</Text> {h.result}
            </Text>
          ))
        )}
      </View>

      <Button title="Back to home" onPress={handleLeave} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, gap: spacing.lg },
  heading: { color: colors.text, fontSize: 28, fontWeight: '800' },
  subtitle: { color: colors.accent, fontSize: 16, fontWeight: '700' },
  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  list: {
    backgroundColor: colors.bgElevated,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  row: { color: colors.text, fontSize: 14 },
  muted: { color: colors.textMuted, fontSize: 13 },
  bold: { fontWeight: '700' },
});
