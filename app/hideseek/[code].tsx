import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/ui/Button';
import { colors, radius, spacing } from '@/ui/theme';
import { leaveRoom, setRoomState } from '@/firebase/rooms';
import { useFirebaseUser } from '@/firebase/auth';
import { useRoomSync } from '@/multiplayer/hooks/useRoomSync';
import { selectMe, useRoomStore } from '@/multiplayer/store';

export default function HideSeekLobby() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const router = useRouter();
  useFirebaseUser();
  const setRoomCode = useRoomStore((s) => s.setRoomCode);
  const room = useRoomStore((s) => s.room);
  const players = useRoomStore((s) => s.players);
  const me = useRoomStore(selectMe);

  useEffect(() => {
    if (code) setRoomCode(code);
  }, [code, setRoomCode]);

  useRoomSync();

  useEffect(() => {
    if (room?.state === 'running') {
      router.replace(`/hideseek/play/${code}`);
    }
  }, [room?.state, router, code]);

  if (!code) return null;
  const isHost = me?.uid && room?.hostUid === me.uid;
  const handleStart = async () => {
    if (!code) return;
    await setRoomState(code, 'running');
    router.replace(`/hideseek/play/${code}`);
  };
  const handleLeave = async () => {
    if (code && me?.uid) await leaveRoom(code, me.uid);
    setRoomCode(null);
    router.replace('/');
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.codeBlock}>
        <Text style={styles.codeLabel}>Room code</Text>
        <Text style={styles.codeText}>{code}</Text>
        <Text style={styles.codeHelp}>Share this code with the seekers.</Text>
      </View>

      {room?.mode === 'hide-seek' ? (
        <View style={styles.list}>
          <Text style={styles.muted}>
            Mode: Hide & Seek · Zone:{' '}
            <Text style={styles.bold}>{room.config.zone}</Text>
          </Text>
          <Text style={styles.muted}>
            Round: {room.config.durationMin} min · Capture radius:{' '}
            {room.config.captureRadiusM} m · Coins: {room.config.startingCoins}
          </Text>
        </View>
      ) : null}

      <Text style={styles.sectionTitle}>Players ({players.length})</Text>
      <View style={styles.list}>
        {players.length === 0 ? (
          <Text style={styles.muted}>Waiting for players to join...</Text>
        ) : (
          players.map((p) => (
            <View key={p.uid} style={styles.row}>
              <View
                style={[
                  styles.roleDot,
                  {
                    backgroundColor:
                      p.role === 'hider' ? colors.warning : colors.accent,
                  },
                ]}
              />
              <Text style={styles.rowText}>
                {p.name}
                {p.uid === me?.uid ? ' (you)' : ''}
              </Text>
              <Text style={styles.rowRole}>{p.role}</Text>
            </View>
          ))
        )}
      </View>

      {isHost ? (
        <Button
          title="Start round"
          onPress={handleStart}
          disabled={players.length < 2}
        />
      ) : (
        <Text style={styles.muted}>
          Waiting for the hider to start the round...
        </Text>
      )}
      <Button title="Leave room" variant="secondary" onPress={handleLeave} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, gap: spacing.lg, flexGrow: 1 },
  codeBlock: {
    backgroundColor: colors.bgElevated,
    padding: spacing.lg,
    borderRadius: radius.lg,
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  codeLabel: { color: colors.textMuted, fontSize: 12, letterSpacing: 2 },
  codeText: { color: colors.accent, fontSize: 56, fontWeight: '800', letterSpacing: 8 },
  codeHelp: { color: colors.textMuted, fontSize: 12 },
  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  list: {
    backgroundColor: colors.bgElevated,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  roleDot: { width: 10, height: 10, borderRadius: 5 },
  rowText: { color: colors.text, fontSize: 14, flex: 1 },
  rowRole: {
    color: colors.textMuted,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  muted: { color: colors.textMuted, fontSize: 13 },
  bold: { color: colors.text, fontWeight: '700' },
});
