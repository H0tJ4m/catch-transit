import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Button } from '@/ui/Button';
import { colors, radius, spacing } from '@/ui/theme';
import {
  leaveRoom,
  setPlayerTeam,
  setRaceTarget,
  setRoomState,
} from '@/firebase/rooms';
import { useFirebaseUser } from '@/firebase/auth';
import { useRoomSync } from '@/multiplayer/hooks/useRoomSync';
import { selectMe, useRoomStore } from '@/multiplayer/store';
import { suggestTeam, teamCounts } from '@/multiplayer/race';
import { stations } from '@/transit/graph';
import type { Station } from '@/transit/types';
import type { Team } from '@/multiplayer/types';

export default function RaceLobby() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const router = useRouter();
  useFirebaseUser();
  const setRoomCode = useRoomStore((s) => s.setRoomCode);
  const room = useRoomStore((s) => s.room);
  const players = useRoomStore((s) => s.players);
  const me = useRoomStore(selectMe);

  const [pickerFor, setPickerFor] = useState<'from' | 'to' | null>(null);

  useEffect(() => {
    if (code) setRoomCode(code);
  }, [code, setRoomCode]);

  useRoomSync();

  // Auto-assign newcomers to the smaller team if they don't have one.
  useEffect(() => {
    if (!code || !me || me.team) return;
    setPlayerTeam(code, me.uid, suggestTeam(players)).catch(() => {});
  }, [code, me, players]);

  useEffect(() => {
    if (room?.state === 'running') router.replace(`/race/play/${code}`);
  }, [room?.state, router, code]);

  if (!code) return null;
  const isHost = me?.uid && room?.hostUid === me.uid;
  const raceRoom = room?.mode === 'race' ? room : null;
  const counts = teamCounts(players);

  const handleStart = async () => {
    if (!code || !raceRoom?.config.fromStationId || !raceRoom?.config.toStationId) return;
    if (counts.red === 0 || counts.blue === 0) return;
    await setRoomState(code, 'running');
    router.replace(`/race/play/${code}`);
  };

  const handleLeave = async () => {
    if (code && me?.uid) await leaveRoom(code, me.uid);
    setRoomCode(null);
    router.replace('/');
  };

  const swapTeam = async () => {
    if (!code || !me) return;
    const next: Team = me.team === 'red' ? 'blue' : 'red';
    await setPlayerTeam(code, me.uid, next);
  };

  const pickStation = async (s: Station) => {
    if (!code || !raceRoom) return;
    if (pickerFor === 'from') {
      await setRaceTarget(code, s.id, raceRoom.config.toStationId ?? s.id);
    } else {
      await setRaceTarget(code, raceRoom.config.fromStationId ?? s.id, s.id);
    }
    setPickerFor(null);
  };

  const fromStation = stations.find((s) => s.id === raceRoom?.config.fromStationId);
  const toStation = stations.find((s) => s.id === raceRoom?.config.toStationId);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.codeBlock}>
        <Text style={styles.codeLabel}>Room code</Text>
        <Text style={styles.codeText}>{code}</Text>
        <Text style={styles.codeHelp}>Share this code with your friends.</Text>
      </View>

      <Text style={styles.sectionTitle}>Route</Text>
      <View style={styles.routeRow}>
        <Pressable
          style={styles.routeButton}
          onPress={() => isHost && setPickerFor('from')}
          disabled={!isHost}
        >
          <Text style={styles.routeLabel}>FROM</Text>
          <Text style={styles.routeValue}>{fromStation?.name ?? 'Pick start'}</Text>
        </Pressable>
        <Text style={styles.arrow}>→</Text>
        <Pressable
          style={styles.routeButton}
          onPress={() => isHost && setPickerFor('to')}
          disabled={!isHost}
        >
          <Text style={styles.routeLabel}>TO</Text>
          <Text style={styles.routeValue}>{toStation?.name ?? 'Pick finish'}</Text>
        </Pressable>
      </View>

      <Text style={styles.sectionTitle}>
        Teams · Red {counts.red} · Blue {counts.blue}
      </Text>
      <View style={styles.list}>
        {players.map((p) => (
          <View key={p.uid} style={styles.row}>
            <View
              style={[
                styles.roleDot,
                {
                  backgroundColor:
                    p.team === 'red' ? colors.danger : colors.accentMuted,
                },
              ]}
            />
            <Text style={styles.rowText}>
              {p.name}
              {p.uid === me?.uid ? ' (you)' : ''}
            </Text>
            <Text style={styles.rowRole}>{p.team ?? '—'}</Text>
          </View>
        ))}
      </View>

      <Button title="Switch my team" variant="secondary" onPress={swapTeam} />

      {isHost ? (
        <Button
          title="Start race"
          onPress={handleStart}
          disabled={
            !raceRoom?.config.fromStationId ||
            !raceRoom?.config.toStationId ||
            counts.red === 0 ||
            counts.blue === 0
          }
        />
      ) : (
        <Text style={styles.muted}>Waiting for the host to start the race...</Text>
      )}
      <Button title="Leave room" variant="secondary" onPress={handleLeave} />

      <StationPickerModal
        open={pickerFor !== null}
        onClose={() => setPickerFor(null)}
        onPick={pickStation}
      />
    </ScrollView>
  );
}

function StationPickerModal({
  open,
  onClose,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (s: Station) => void;
}) {
  const items = useMemo(() => stations, []);
  return (
    <Modal animationType="slide" visible={open} transparent>
      <View style={styles.scrim}>
        <View style={styles.modalCard}>
          <Text style={styles.sectionTitle}>Pick station</Text>
          <ScrollView style={{ maxHeight: 460 }}>
            {items.map((s) => (
              <Pressable key={s.id} style={styles.refRow} onPress={() => onPick(s)}>
                <Text style={styles.rowText}>{s.name}</Text>
                <Text style={styles.muted}>{s.zone}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <Button title="Close" variant="secondary" onPress={onClose} />
        </View>
      </View>
    </Modal>
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
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  routeButton: {
    flex: 1,
    backgroundColor: colors.bgElevated,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  routeLabel: { color: colors.textMuted, fontSize: 11, letterSpacing: 1 },
  routeValue: { color: colors.text, fontSize: 15, fontWeight: '700' },
  arrow: { color: colors.textMuted, fontSize: 22, fontWeight: '700' },
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
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.bgElevated,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  refRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
});
