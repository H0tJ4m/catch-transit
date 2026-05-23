import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useKeepAwake } from 'expo-keep-awake';
import type { CameraRef } from '@maplibre/maplibre-react-native';
import { TransitMap, type PlayerMarker } from '@/map/MapView';
import { useUserLocation } from '@/map/hooks/useUserLocation';
import { useRoomSync } from '@/multiplayer/hooks/useRoomSync';
import { usePublishLocation } from '@/multiplayer/hooks/usePublishLocation';
import { useRaceLoop } from '@/multiplayer/hooks/useRaceLoop';
import { configureNotifications } from '@/multiplayer/notifications';
import { selectMe, useRoomStore } from '@/multiplayer/store';
import {
  logEvent,
  setPlayerCoins,
  setRoomState,
  throwCurse,
} from '@/firebase/rooms';
import { timeRemainingSec } from '@/multiplayer/race';
import { RACE_CURSE_DECK } from '@/multiplayer/raceCurseDeck';
import { getStation } from '@/transit/graph';
import { Button } from '@/ui/Button';
import { colors, radius, spacing } from '@/ui/theme';
import type { CurseThrow, Team } from '@/multiplayer/types';

export default function RacePlay() {
  useKeepAwake();
  const { code } = useLocalSearchParams<{ code: string }>();
  const router = useRouter();
  const cameraRef = useRef<CameraRef>(null);
  const { fix } = useUserLocation();

  const setRoomCode = useRoomStore((s) => s.setRoomCode);
  const room = useRoomStore((s) => s.room);
  const players = useRoomStore((s) => s.players);
  const me = useRoomStore(selectMe);
  const throws = useRoomStore((s) => s.throws);

  const [curseShopOpen, setCurseShopOpen] = useState(false);

  useEffect(() => {
    if (code) setRoomCode(code);
  }, [code, setRoomCode]);
  useEffect(() => {
    configureNotifications();
  }, []);

  useRoomSync();
  usePublishLocation(code ?? null, me?.uid ?? null, fix);
  useRaceLoop();

  useEffect(() => {
    if (room?.state === 'ended' && code) router.replace(`/race/summary/${code}`);
  }, [room?.state, router, code]);

  const raceRoom = room?.mode === 'race' ? room : null;

  const markers: PlayerMarker[] = useMemo(() => {
    return players
      .filter((p) => p.lastFix)
      .map((p) => ({
        uid: p.uid,
        name: p.name,
        lat: p.lastFix!.lat,
        lng: p.lastFix!.lng,
        // Reuse existing role styling: red team styled as 'runner' (yellow),
        // blue team as 'chaser' (red). We don't have a dedicated palette yet.
        role: p.team === 'red' ? 'runner' : 'chaser',
        isMe: p.uid === me?.uid,
      }));
  }, [players, me?.uid]);

  const myActiveCurses = useMemo(() => {
    if (!me?.team) return [] as CurseThrow[];
    const now = Date.now();
    return throws.filter(
      (t) => t.targetTeam === me.team && (t.expiresAt === 0 || t.expiresAt > now),
    );
  }, [throws, me?.team]);

  const recenter = () => {
    if (!fix) return;
    cameraRef.current?.flyTo([fix.lng, fix.lat], 800);
    cameraRef.current?.zoomTo(13.5, 600);
  };

  const handleEnd = async () => {
    if (code) await setRoomState(code, 'ended');
  };

  if (!code) return null;

  const dest = raceRoom?.config.toStationId
    ? getStation(raceRoom.config.toStationId)
    : null;

  return (
    <View style={styles.container}>
      <TransitMap
        cameraRef={cameraRef}
        userLocation={fix ? { lat: fix.lat, lng: fix.lng } : null}
        playerMarkers={markers}
        highlightedStationId={raceRoom?.config.toStationId ?? null}
      />

      <View style={styles.hud} pointerEvents="box-none">
        <View style={styles.hudCard} pointerEvents="auto">
          <Text style={styles.hudLabel}>Time</Text>
          <Text style={styles.hudValue}>{formatMmSs(timeRemainingSec(room ?? null))}</Text>
        </View>
        <View style={styles.hudCard} pointerEvents="auto">
          <Text style={styles.hudLabel}>Team</Text>
          <Text
            style={[
              styles.hudValue,
              { color: me?.team === 'red' ? colors.danger : colors.accent },
            ]}
          >
            {me?.team ?? '—'}
          </Text>
        </View>
        <View style={styles.hudCard} pointerEvents="auto">
          <Text style={styles.hudLabel}>Coins</Text>
          <Text style={styles.hudValue}>{me?.coins ?? 0}</Text>
        </View>
      </View>

      <View style={styles.bottomSheet} pointerEvents="auto">
        <Text style={styles.sheetTitle}>
          Race to: {dest?.name ?? 'destination'}
        </Text>
        {myActiveCurses.length > 0 ? (
          <ScrollView style={{ maxHeight: 100 }}>
            {myActiveCurses.map((c) => (
              <Text key={c.id} style={styles.curseRow}>
                <Text style={styles.bold}>{c.cardTitle}</Text>: {c.cardDescription}
              </Text>
            ))}
          </ScrollView>
        ) : (
          <Text style={styles.muted}>No active curses on your team.</Text>
        )}
        <Button title="Throw a curse" onPress={() => setCurseShopOpen(true)} />
      </View>

      <View style={styles.sideControls} pointerEvents="box-none">
        <Pressable style={styles.iconButton} onPress={recenter}>
          <Text style={styles.iconButtonText}>◎</Text>
        </Pressable>
        <Pressable style={[styles.iconButton, styles.endButton]} onPress={handleEnd}>
          <Text style={styles.iconButtonText}>End</Text>
        </Pressable>
      </View>

      <CurseShopModal
        open={curseShopOpen}
        onClose={() => setCurseShopOpen(false)}
        code={code}
      />
    </View>
  );
}

function CurseShopModal({
  open,
  onClose,
  code,
}: {
  open: boolean;
  onClose: () => void;
  code: string;
}) {
  const me = useRoomStore(selectMe);
  const [busy, setBusy] = useState(false);

  const targetTeam: Team | null = me?.team === 'red' ? 'blue' : me?.team === 'blue' ? 'red' : null;

  const handleThrow = async (cardId: string) => {
    if (!me || !targetTeam) return;
    const card = RACE_CURSE_DECK.find((c) => c.id === cardId);
    if (!card || me.coins < card.cost) return;
    setBusy(true);
    try {
      const now = Date.now();
      await Promise.all([
        throwCurse(code, {
          fromUid: me.uid,
          fromName: me.name,
          targetTeam,
          cardId: card.id,
          cardTitle: card.title,
          cardDescription: card.description,
          cost: card.cost,
          thrownAt: now,
          expiresAt: card.durationSec > 0 ? now + card.durationSec * 1000 : 0,
        }),
        setPlayerCoins(code, me.uid, me.coins - card.cost),
        logEvent(code, {
          type: 'curse-throw',
          fromUid: me.uid,
          targetTeam,
          cardId: card.id,
          at: now,
        }),
      ]);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal animationType="slide" visible={open} transparent>
      <View style={styles.scrim}>
        <View style={styles.modalCard}>
          <Text style={styles.sheetTitle}>
            Curse shop · target: {targetTeam ?? '—'} · {me?.coins ?? 0} coins
          </Text>
          <ScrollView style={{ maxHeight: 460 }} contentContainerStyle={{ gap: spacing.sm }}>
            {RACE_CURSE_DECK.map((card) => (
              <View key={card.id} style={styles.curseCard}>
                <Text style={styles.curseTitle}>
                  {card.title} — {card.cost} coins
                </Text>
                <Text style={styles.muted}>{card.description}</Text>
                <Button
                  title={busy ? '...' : 'Throw'}
                  variant="danger"
                  onPress={() => handleThrow(card.id)}
                  disabled={busy || (me?.coins ?? 0) < card.cost || !targetTeam}
                />
              </View>
            ))}
          </ScrollView>
          <Button title="Close" variant="secondary" onPress={onClose} />
        </View>
      </View>
    </Modal>
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
  bottomSheet: {
    position: 'absolute',
    left: spacing.md,
    right: 80,
    bottom: spacing.lg,
    backgroundColor: 'rgba(11,18,32,0.92)',
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sheetTitle: { color: colors.text, fontWeight: '700', fontSize: 14 },
  curseRow: { color: colors.text, fontSize: 12, paddingVertical: 2 },
  bold: { fontWeight: '700' },
  muted: { color: colors.textMuted, fontSize: 12 },
  sideControls: {
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
  curseCard: {
    backgroundColor: colors.bgCard,
    padding: spacing.md,
    borderRadius: radius.md,
    gap: spacing.xs,
  },
  curseTitle: { color: colors.text, fontSize: 14, fontWeight: '700' },
});
