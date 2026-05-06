import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useKeepAwake } from 'expo-keep-awake';
import type { CameraRef } from '@maplibre/maplibre-react-native';
import { TransitMap, type PlayerMarker } from '@/map/MapView';
import { useUserLocation } from '@/map/hooks/useUserLocation';
import { useRoomSync } from '@/multiplayer/hooks/useRoomSync';
import { usePublishLocation } from '@/multiplayer/hooks/usePublishLocation';
import { useTagLoop } from '@/multiplayer/hooks/useTagLoop';
import { configureNotifications } from '@/multiplayer/notifications';
import { selectMe, useRoomStore } from '@/multiplayer/store';
import { setRoomState } from '@/firebase/rooms';
import {
  currentPhase,
  headStartRemainingSec,
  timeRemainingSec,
} from '@/multiplayer/tagEngine';
import { colors, radius, spacing } from '@/ui/theme';

export default function TagPlay() {
  useKeepAwake();
  const { code } = useLocalSearchParams<{ code: string }>();
  const router = useRouter();
  const cameraRef = useRef<CameraRef>(null);
  const { fix } = useUserLocation();

  const setRoomCode = useRoomStore((s) => s.setRoomCode);
  const room = useRoomStore((s) => s.room);
  const players = useRoomStore((s) => s.players);
  const me = useRoomStore(selectMe);

  useEffect(() => {
    if (code) setRoomCode(code);
  }, [code, setRoomCode]);
  useEffect(() => {
    configureNotifications();
  }, []);

  useRoomSync();
  usePublishLocation(code ?? null, me?.uid ?? null, fix);
  useTagLoop();

  useEffect(() => {
    if (room?.state === 'ended' && code) {
      router.replace(`/tag/summary/${code}`);
    }
  }, [room?.state, router, code]);

  const phase = currentPhase(room ?? null);

  const markers: PlayerMarker[] = useMemo(() => {
    if (!room) return [];
    return players
      .filter((p) => p.lastFix)
      .map((p) => {
        const isRunner = p.uid === room.runnerUid;
        const isMe = p.uid === me?.uid;
        const hideRunner = phase === 'head-start' && !isRunner && !isMe;
        if (hideRunner && isRunner) return null;
        return {
          uid: p.uid,
          name: p.name,
          lat: p.lastFix!.lat,
          lng: p.lastFix!.lng,
          role: isRunner ? 'runner' : 'chaser',
          isMe,
        } as PlayerMarker;
      })
      .filter((m): m is PlayerMarker => Boolean(m));
  }, [players, room, me?.uid, phase]);

  const recenter = () => {
    if (!fix) return;
    cameraRef.current?.flyTo([fix.lng, fix.lat], 800);
    cameraRef.current?.zoomTo(13.5, 600);
  };

  const handleEnd = async () => {
    if (code) await setRoomState(code, 'ended');
  };

  if (!code) return null;

  return (
    <View style={styles.container}>
      <TransitMap
        cameraRef={cameraRef}
        userLocation={fix ? { lat: fix.lat, lng: fix.lng } : null}
        playerMarkers={markers}
      />

      <View style={styles.hud} pointerEvents="box-none">
        <View style={styles.hudCard} pointerEvents="auto">
          <Text style={styles.hudLabel}>Phase</Text>
          <Text style={styles.hudValue}>
            {phase === 'head-start' ? 'Head start' : phase}
          </Text>
        </View>
        <View style={styles.hudCard} pointerEvents="auto">
          <Text style={styles.hudLabel}>
            {phase === 'head-start' ? 'Chasers wait' : 'Round time'}
          </Text>
          <Text style={styles.hudValue}>
            {formatMmSs(
              phase === 'head-start'
                ? headStartRemainingSec(room ?? null)
                : timeRemainingSec(room ?? null),
            )}
          </Text>
        </View>
        <View style={styles.hudCard} pointerEvents="auto">
          <Text style={styles.hudLabel}>Role</Text>
          <Text
            style={[
              styles.hudValue,
              { color: me?.role === 'runner' ? colors.warning : colors.danger },
            ]}
          >
            {me?.role ?? '—'}
          </Text>
        </View>
      </View>

      <View style={styles.bottomControls} pointerEvents="box-none">
        <Pressable style={styles.iconButton} onPress={recenter}>
          <Text style={styles.iconButtonText}>◎</Text>
        </Pressable>
        <Pressable
          style={[styles.iconButton, styles.endButton]}
          onPress={handleEnd}
        >
          <Text style={styles.iconButtonText}>End</Text>
        </Pressable>
      </View>
    </View>
  );
}

function formatMmSs(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  hud: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  hudCard: {
    backgroundColor: 'rgba(11,18,32,0.85)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    flex: 1,
  },
  hudLabel: { color: colors.textMuted, fontSize: 10, letterSpacing: 1 },
  hudValue: { color: colors.text, fontSize: 18, fontWeight: '800', textTransform: 'uppercase' },
  bottomControls: {
    position: 'absolute',
    bottom: spacing.lg,
    right: spacing.md,
    gap: spacing.sm,
  },
  iconButton: {
    backgroundColor: colors.bgElevated,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  endButton: { backgroundColor: colors.danger, borderColor: colors.danger },
  iconButtonText: { color: colors.text, fontSize: 18, fontWeight: '700' },
});
