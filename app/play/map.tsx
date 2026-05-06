import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useKeepAwake } from 'expo-keep-awake';
import type { CameraRef } from '@maplibre/maplibre-react-native';
import { TransitMap } from '@/map/MapView';
import { useStationGeofences } from '@/map/hooks/useStationGeofences';
import { useUserLocation } from '@/map/hooks/useUserLocation';
import { useGame } from '@/game/store';
import { CardModal } from '@/ui/CardModal';
import { colors, radius, spacing } from '@/ui/theme';
import { getStation } from '@/transit/graph';

export default function PlayMap() {
  useKeepAwake();
  const router = useRouter();
  const cameraRef = useRef<CameraRef>(null);
  const { fix, error: locError } = useUserLocation();

  const session = useGame((s) => s.session);
  const activeCard = useGame((s) => s.activeCard);
  const onStationArrival = useGame((s) => s.onStationArrival);
  const resolveActiveCard = useGame((s) => s.resolveActiveCard);
  const endSession = useGame((s) => s.endSession);

  useStationGeofences(fix, onStationArrival);

  const recenter = () => {
    if (!fix) return;
    cameraRef.current?.flyTo([fix.lng, fix.lat], 800);
    cameraRef.current?.zoomTo(13.5, 600);
  };

  useEffect(() => {
    if (!session) router.replace('/');
  }, [session, router]);

  if (!session) return null;

  const handleEnd = () => {
    endSession();
    router.replace('/play/summary');
  };

  return (
    <View style={styles.container}>
      <TransitMap
        cameraRef={cameraRef}
        userLocation={fix ? { lat: fix.lat, lng: fix.lng } : null}
        highlightedStationId={session.targets?.[session.visitedStationIds.length] ?? null}
      />

      <View style={styles.hud} pointerEvents="box-none">
        <View style={styles.hudCard} pointerEvents="auto">
          <Text style={styles.scoreLabel}>Score</Text>
          <Text style={styles.scoreValue}>{session.score}</Text>
        </View>

        {session.mode === 'daily-challenge' && session.targets ? (
          <View style={styles.hudCard} pointerEvents="auto">
            <Text style={styles.scoreLabel}>Targets</Text>
            <Text style={styles.targetText}>
              {Math.min(session.visitedStationIds.length, session.targets.length)} / {session.targets.length}
            </Text>
            <Text style={styles.targetSubtext} numberOfLines={1}>
              Next:{' '}
              {getStation(session.targets[session.visitedStationIds.length] ?? '')?.name ?? '—'}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.bottomControls} pointerEvents="box-none">
        <Pressable style={styles.iconButton} onPress={recenter}>
          <Text style={styles.iconButtonText}>◎</Text>
        </Pressable>
        <Pressable style={[styles.iconButton, styles.endButton]} onPress={handleEnd}>
          <Text style={styles.iconButtonText}>End</Text>
        </Pressable>
      </View>

      {locError ? (
        <View style={styles.errorBanner} pointerEvents="auto">
          <Text style={styles.errorText}>{locError}</Text>
        </View>
      ) : null}

      <CardModal card={activeCard} onResolve={resolveActiveCard} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  hud: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    gap: spacing.md,
  },
  hudCard: {
    backgroundColor: 'rgba(11, 18, 32, 0.85)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 90,
  },
  scoreLabel: { color: colors.textMuted, fontSize: 11, letterSpacing: 1 },
  scoreValue: { color: colors.accent, fontSize: 22, fontWeight: '800' },
  targetText: { color: colors.text, fontSize: 18, fontWeight: '700' },
  targetSubtext: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
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
  errorBanner: {
    position: 'absolute',
    bottom: 100,
    left: spacing.md,
    right: spacing.md,
    backgroundColor: colors.danger,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  errorText: { color: colors.text, fontSize: 13 },
});
