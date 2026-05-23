import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/ui/Button';
import { selectMe, useRoomStore } from '@/multiplayer/store';
import { useRoomSync } from '@/multiplayer/hooks/useRoomSync';
import {
  leaveRoom,
  refillCoins,
  resetRound,
  setRaceTarget,
} from '@/firebase/rooms';
import { colors, radius, spacing } from '@/ui/theme';
import { getStation } from '@/transit/graph';

export default function RaceSummary() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const router = useRouter();
  const setRoomCode = useRoomStore((s) => s.setRoomCode);
  const room = useRoomStore((s) => s.room);
  const players = useRoomStore((s) => s.players);
  const events = useRoomStore((s) => s.events);
  const throws = useRoomStore((s) => s.throws);
  const me = useRoomStore(selectMe);

  useEffect(() => {
    if (code) setRoomCode(code);
  }, [code, setRoomCode]);

  useRoomSync();

  useEffect(() => {
    if (code && room?.state === 'lobby') {
      router.replace(`/race/${code}`);
    }
  }, [code, room?.state, router]);

  const handleLeave = async () => {
    if (code && me?.uid) await leaveRoom(code, me.uid);
    setRoomCode(null);
    router.replace('/');
  };

  const isHost = me?.uid && room?.hostUid === me.uid;
  const handlePlayAgain = async () => {
    if (!code || !room) return;
    if (room.mode === 'race') {
      // Swap from <-> to so the next round runs in the opposite direction.
      const next = {
        from: room.config.toStationId ?? room.config.fromStationId,
        to: room.config.fromStationId ?? room.config.toStationId,
      };
      if (next.from && next.to) await setRaceTarget(code, next.from, next.to);
      await refillCoins(
        code,
        players.map((p) => p.uid),
        room.config.startingCoins,
      );
    }
    await resetRound(code);
    router.replace(`/race/${code}`);
  };

  if (room?.mode !== 'race') return null;
  const finishEvent = events.find((e) => e.type === 'race-finish');
  const winner = room.winner ?? (finishEvent?.type === 'race-finish' ? finishEvent.team : '—');
  const finisher =
    finishEvent?.type === 'race-finish'
      ? players.find((p) => p.uid === finishEvent.uid)?.name ?? finishEvent.uid
      : null;
  const dest = room.config.toStationId ? getStation(room.config.toStationId) : null;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>Race over</Text>
      <Text style={styles.subtitle}>Winner: {winner}</Text>

      <View style={styles.list}>
        <Text style={styles.row}>
          Destination:{' '}
          <Text style={styles.bold}>{dest?.name ?? '—'}</Text>
        </Text>
        {finisher ? (
          <Text style={styles.row}>
            <Text style={styles.bold}>{finisher}</Text> finished first.
          </Text>
        ) : (
          <Text style={styles.muted}>No one finished — round timed out.</Text>
        )}
      </View>

      <Text style={styles.sectionTitle}>Curses thrown ({throws.length})</Text>
      <View style={styles.list}>
        {throws.length === 0 ? (
          <Text style={styles.muted}>No curses thrown this round.</Text>
        ) : (
          throws.map((t) => (
            <Text key={t.id} style={styles.row}>
              <Text style={styles.bold}>{t.fromName}</Text> threw{' '}
              <Text style={styles.bold}>{t.cardTitle}</Text> at {t.targetTeam}.
            </Text>
          ))
        )}
      </View>

      {isHost ? (
        <Button title="Play again (swap direction)" onPress={handlePlayAgain} />
      ) : (
        <Text style={styles.muted}>
          Waiting for the host to start the next round, or leave to go home.
        </Text>
      )}
      <Button title="Back to home" variant="secondary" onPress={handleLeave} />
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
