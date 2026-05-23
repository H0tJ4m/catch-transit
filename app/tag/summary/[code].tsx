import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/ui/Button';
import { selectMe, useRoomStore } from '@/multiplayer/store';
import { useRoomSync } from '@/multiplayer/hooks/useRoomSync';
import { getStation } from '@/transit/graph';
import { colors, radius, spacing } from '@/ui/theme';
import { leaveRoom, resetRound } from '@/firebase/rooms';

export default function TagSummary() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const router = useRouter();
  const setRoomCode = useRoomStore((s) => s.setRoomCode);
  const room = useRoomStore((s) => s.room);
  const players = useRoomStore((s) => s.players);
  const events = useRoomStore((s) => s.events);
  const me = useRoomStore(selectMe);
  const isHost = me?.uid && room?.hostUid === me.uid;

  useEffect(() => {
    if (code) setRoomCode(code);
  }, [code, setRoomCode]);

  useRoomSync();

  useEffect(() => {
    if (code && room?.state === 'lobby') {
      router.replace(`/tag/${code}`);
    }
  }, [code, room?.state, router]);

  const handleLeave = async () => {
    if (code && me?.uid) await leaveRoom(code, me.uid);
    setRoomCode(null);
    router.replace('/');
  };

  const handlePlayAgain = async () => {
    if (!code) return;
    await resetRound(code);
    router.replace(`/tag/${code}`);
  };

  const captures = events.filter((e) => e.type === 'capture');

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>Round complete</Text>

      <View style={styles.statRow}>
        <Stat label="Players" value={players.length.toString()} />
        <Stat label="Captures" value={captures.length.toString()} />
        <Stat
          label="Minutes"
          value={
            room?.startedAt && room?.endedAt
              ? Math.round((room.endedAt - room.startedAt) / 60_000).toString()
              : '—'
          }
        />
      </View>

      <Text style={styles.sectionTitle}>Capture history</Text>
      <View style={styles.list}>
        {captures.length === 0 ? (
          <Text style={styles.muted}>The runner stayed free the whole round.</Text>
        ) : (
          captures.map((ev, i) => {
            if (ev.type !== 'capture') return null;
            const capturer = players.find((p) => p.uid === ev.capturerUid)?.name ?? ev.capturerUid;
            const captured = players.find((p) => p.uid === ev.capturedUid)?.name ?? ev.capturedUid;
            const station = getStation(ev.stationId)?.name ?? ev.stationId;
            return (
              <Text key={i} style={styles.row}>
                {capturer} caught {captured} at {station}
              </Text>
            );
          })
        )}
      </View>

      {isHost ? (
        <Button title="Play again (same room)" onPress={handlePlayAgain} />
      ) : (
        <Text style={styles.muted}>
          Waiting for the host to start the next round, or leave to go home.
        </Text>
      )}
      <Button title="Back to home" variant="secondary" onPress={handleLeave} />
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
  container: { padding: spacing.lg, gap: spacing.lg },
  heading: { color: colors.text, fontSize: 28, fontWeight: '800' },
  statRow: { flexDirection: 'row', gap: spacing.md },
  stat: {
    flex: 1,
    backgroundColor: colors.bgElevated,
    padding: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  statValue: { color: colors.accent, fontSize: 22, fontWeight: '800' },
  statLabel: { color: colors.textMuted, fontSize: 11, marginTop: spacing.xs, letterSpacing: 1 },
  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  list: {
    backgroundColor: colors.bgElevated,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  row: { color: colors.text, fontSize: 14 },
  muted: { color: colors.textMuted, fontSize: 13 },
});
