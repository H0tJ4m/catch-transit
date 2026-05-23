import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useKeepAwake } from 'expo-keep-awake';
import type { CameraRef } from '@maplibre/maplibre-react-native';
import { TransitMap, type PlayerMarker } from '@/map/MapView';
import { useUserLocation } from '@/map/hooks/useUserLocation';
import { useRoomSync } from '@/multiplayer/hooks/useRoomSync';
import { usePublishLocation } from '@/multiplayer/hooks/usePublishLocation';
import { useHideSeekLoop } from '@/multiplayer/hooks/useHideSeekLoop';
import { configureNotifications } from '@/multiplayer/notifications';
import { selectHider, selectMe, useRoomStore } from '@/multiplayer/store';
import {
  answerQuestion,
  askQuestion,
  lockHider,
  logEvent,
  logHint,
  setHiderStation,
  setPlayerCoins,
  setRoomState,
} from '@/firebase/rooms';
import {
  currentPhase,
  timeRemainingSec,
} from '@/multiplayer/hideSeek';
import { eligibleHidingStations, HINT_CATALOG, resolveHint } from '@/multiplayer/hideSeekHints';
import { getStation, nearestStation, stations } from '@/transit/graph';
import { colors, radius, spacing } from '@/ui/theme';
import { Button } from '@/ui/Button';
import type { Station } from '@/transit/types';

export default function HideSeekPlay() {
  useKeepAwake();
  const { code } = useLocalSearchParams<{ code: string }>();
  const router = useRouter();
  const cameraRef = useRef<CameraRef>(null);
  const { fix } = useUserLocation();

  const setRoomCode = useRoomStore((s) => s.setRoomCode);
  const room = useRoomStore((s) => s.room);
  const players = useRoomStore((s) => s.players);
  const me = useRoomStore(selectMe);
  const hider = useRoomStore(selectHider);
  const questions = useRoomStore((s) => s.questions);
  const hints = useRoomStore((s) => s.hints);

  const [chatOpen, setChatOpen] = useState(false);
  const [hintShopOpen, setHintShopOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    if (code) setRoomCode(code);
  }, [code, setRoomCode]);
  useEffect(() => {
    configureNotifications();
  }, []);

  useRoomSync();
  usePublishLocation(code ?? null, me?.uid ?? null, fix);
  useHideSeekLoop();

  useEffect(() => {
    if (room?.state === 'ended' && code) {
      router.replace(`/hideseek/summary/${code}`);
    }
  }, [room?.state, router, code]);

  const phase = currentPhase(room ?? null);
  const isHider = me?.uid && me.uid === hider?.uid;
  const hsRoom = room?.mode === 'hide-seek' ? room : null;

  const markers: PlayerMarker[] = useMemo(() => {
    if (!hsRoom) return [];
    return players
      .filter((p) => p.lastFix)
      .map((p) => {
        const isMyHider = p.uid === hsRoom.hiderUid;
        const isMe = p.uid === me?.uid;
        // Hider's location is hidden from seekers throughout.
        if (isMyHider && !isMe) return null;
        return {
          uid: p.uid,
          name: p.name,
          lat: p.lastFix!.lat,
          lng: p.lastFix!.lng,
          role: isMyHider ? 'runner' : 'chaser',
          isMe,
        } as PlayerMarker;
      })
      .filter((m): m is PlayerMarker => Boolean(m));
  }, [players, hsRoom, me?.uid]);

  const recenter = () => {
    if (!fix) return;
    cameraRef.current?.flyTo([fix.lng, fix.lat], 800);
    cameraRef.current?.zoomTo(13.5, 600);
  };

  const handleEnd = async () => {
    if (code) await setRoomState(code, 'ended');
  };

  const handleSetHidingStation = async (station: Station) => {
    if (!code) return;
    await setHiderStation(code, station.id);
    setPickerOpen(false);
  };

  const handleLockHider = async () => {
    if (!code || !hsRoom?.config.hiderStationId) return;
    await Promise.all([
      lockHider(code),
      logEvent(code, {
        type: 'hider-locked',
        uid: me?.uid ?? '',
        stationId: hsRoom.config.hiderStationId,
        at: Date.now(),
      }),
    ]);
  };

  if (!code) return null;

  return (
    <View style={styles.container}>
      <TransitMap
        cameraRef={cameraRef}
        userLocation={fix ? { lat: fix.lat, lng: fix.lng } : null}
        playerMarkers={markers}
        highlightedStationId={
          isHider && hsRoom?.config.hiderStationId ? hsRoom.config.hiderStationId : null
        }
      />

      <View style={styles.hud} pointerEvents="box-none">
        <View style={styles.hudCard} pointerEvents="auto">
          <Text style={styles.hudLabel}>Phase</Text>
          <Text style={styles.hudValue}>
            {phase === 'hider-picking' ? 'Hider hiding' : phase}
          </Text>
        </View>
        <View style={styles.hudCard} pointerEvents="auto">
          <Text style={styles.hudLabel}>Time</Text>
          <Text style={styles.hudValue}>{formatMmSs(timeRemainingSec(room ?? null))}</Text>
        </View>
        <View style={styles.hudCard} pointerEvents="auto">
          <Text style={styles.hudLabel}>{isHider ? 'Role' : 'Coins'}</Text>
          <Text style={styles.hudValue}>{isHider ? 'HIDER' : me?.coins ?? '—'}</Text>
        </View>
      </View>

      {isHider ? (
        <View style={styles.bottomSheet} pointerEvents="auto">
          {!hsRoom?.config.hiderLocked ? (
            <>
              <Text style={styles.sheetTitle}>
                {hsRoom?.config.hiderStationId
                  ? `Hiding at: ${getStation(hsRoom.config.hiderStationId)?.name}`
                  : 'Choose your hiding station'}
              </Text>
              <View style={styles.sheetActions}>
                <Button
                  title="Pick a station"
                  variant="secondary"
                  onPress={() => setPickerOpen(true)}
                />
                <Button
                  title="Use nearest"
                  variant="secondary"
                  onPress={() => {
                    if (!fix) return;
                    const near = nearestStation(fix);
                    if (near) handleSetHidingStation(near.station);
                  }}
                />
                <Button
                  title="Lock in"
                  onPress={handleLockHider}
                  disabled={!hsRoom?.config.hiderStationId}
                />
              </View>
            </>
          ) : (
            <Text style={styles.sheetTitle}>
              Locked at {getStation(hsRoom.config.hiderStationId ?? '')?.name}. Stay close
              and answer questions.
            </Text>
          )}
          <Button
            title={`Questions (${questions.filter((q) => !q.answer).length} unanswered)`}
            onPress={() => setChatOpen(true)}
          />
        </View>
      ) : (
        <View style={styles.bottomSheet} pointerEvents="auto">
          <Text style={styles.sheetTitle}>
            {hsRoom?.config.hiderLocked
              ? 'The hider has locked in. Find them!'
              : 'Wait for the hider to lock in their station.'}
          </Text>
          <View style={styles.sheetActions}>
            <Button
              title={`Ask (${questions.length})`}
              onPress={() => setChatOpen(true)}
              disabled={!hsRoom?.config.hiderLocked}
            />
            <Button
              title={`Hints (${hints.length})`}
              variant="secondary"
              onPress={() => setHintShopOpen(true)}
              disabled={!hsRoom?.config.hiderLocked}
            />
          </View>
        </View>
      )}

      <View style={styles.sideControls} pointerEvents="box-none">
        <Pressable style={styles.iconButton} onPress={recenter}>
          <Text style={styles.iconButtonText}>◎</Text>
        </Pressable>
        <Pressable style={[styles.iconButton, styles.endButton]} onPress={handleEnd}>
          <Text style={styles.iconButtonText}>End</Text>
        </Pressable>
      </View>

      <ChatModal
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        isHider={Boolean(isHider)}
        code={code}
      />

      <HintShopModal
        open={hintShopOpen}
        onClose={() => setHintShopOpen(false)}
        code={code}
      />

      <StationPickerModal
        open={pickerOpen}
        zone={hsRoom?.config.zone ?? 'all-mmr'}
        onClose={() => setPickerOpen(false)}
        onPick={handleSetHidingStation}
      />
    </View>
  );
}

function ChatModal({
  open,
  onClose,
  isHider,
  code,
}: {
  open: boolean;
  onClose: () => void;
  isHider: boolean;
  code: string;
}) {
  const [text, setText] = useState('');
  const me = useRoomStore(selectMe);
  const questions = useRoomStore((s) => s.questions);

  const submit = async () => {
    if (!me?.uid || !text.trim()) return;
    await askQuestion(code, me.uid, me.name, text.trim());
    setText('');
  };

  return (
    <Modal animationType="slide" visible={open} transparent>
      <View style={styles.scrim}>
        <View style={styles.modalCard}>
          <Text style={styles.sheetTitle}>Questions</Text>
          <ScrollView style={{ maxHeight: 380 }} contentContainerStyle={{ gap: spacing.sm }}>
            {questions.length === 0 ? (
              <Text style={styles.muted}>No questions yet.</Text>
            ) : (
              questions.map((q) => (
                <View key={q.id} style={styles.q}>
                  <Text style={styles.qText}>
                    <Text style={styles.bold}>{q.askerName}:</Text> {q.text}
                  </Text>
                  {q.answer ? (
                    <Text
                      style={[
                        styles.qAnswer,
                        {
                          color:
                            q.answer === 'yes'
                              ? colors.success
                              : q.answer === 'no'
                              ? colors.danger
                              : colors.textMuted,
                        },
                      ]}
                    >
                      Hider says: {q.answer}
                    </Text>
                  ) : isHider ? (
                    <View style={styles.answerRow}>
                      <Button
                        title="Yes"
                        onPress={() => answerQuestion(code, q.id, 'yes')}
                      />
                      <Button
                        title="No"
                        variant="danger"
                        onPress={() => answerQuestion(code, q.id, 'no')}
                      />
                      <Button
                        title="Idk"
                        variant="secondary"
                        onPress={() => answerQuestion(code, q.id, 'unknown')}
                      />
                    </View>
                  ) : (
                    <Text style={styles.muted}>Awaiting answer...</Text>
                  )}
                </View>
              ))
            )}
          </ScrollView>
          {!isHider ? (
            <View style={{ gap: spacing.sm }}>
              <TextInput
                value={text}
                onChangeText={setText}
                placeholder="Ask a yes/no question"
                placeholderTextColor={colors.textMuted}
                style={styles.input}
                multiline
              />
              <Button title="Ask" onPress={submit} disabled={!text.trim()} />
            </View>
          ) : null}
          <Button title="Close" variant="secondary" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

function HintShopModal({
  open,
  onClose,
  code,
}: {
  open: boolean;
  onClose: () => void;
  code: string;
}) {
  const me = useRoomStore(selectMe);
  const hints = useRoomStore((s) => s.hints);
  const room = useRoomStore((s) => s.room);
  const hsRoom = room?.mode === 'hide-seek' ? room : null;
  const [busy, setBusy] = useState(false);
  const [pickRefStation, setPickRefStation] = useState(false);

  const buy = async (entryIdx: number, refStationId?: string) => {
    if (!me || !hsRoom?.config.hiderStationId) return;
    const entry = HINT_CATALOG[entryIdx];
    if (!entry) return;
    if (me.coins < entry.costCoins) return;
    setBusy(true);
    try {
      const hiderStation = getStation(hsRoom.config.hiderStationId);
      if (!hiderStation) return;
      const { result } = resolveHint(entry.type, hiderStation, refStationId);
      await Promise.all([
        logHint(code, {
          askerUid: me.uid,
          askerName: me.name,
          type: entry.type,
          payload: refStationId ? { refStationId } : null,
          result,
          costCoins: entry.costCoins,
          askedAt: Date.now(),
        }),
        setPlayerCoins(code, me.uid, me.coins - entry.costCoins),
      ]);
    } finally {
      setBusy(false);
      setPickRefStation(false);
    }
  };

  return (
    <Modal animationType="slide" visible={open} transparent>
      <View style={styles.scrim}>
        <View style={styles.modalCard}>
          <Text style={styles.sheetTitle}>Hint shop · {me?.coins ?? 0} coins</Text>
          <ScrollView style={{ maxHeight: 380 }} contentContainerStyle={{ gap: spacing.sm }}>
            {HINT_CATALOG.map((entry, i) => (
              <View key={entry.type} style={styles.q}>
                <Text style={styles.qText}>
                  <Text style={styles.bold}>{entry.label}</Text> — {entry.costCoins} coins
                </Text>
                <Text style={styles.muted}>{entry.description}</Text>
                <Button
                  title={busy ? '...' : 'Buy'}
                  onPress={() => {
                    if (entry.needsReferenceStation) {
                      setPickRefStation(true);
                    } else {
                      buy(i);
                    }
                  }}
                  disabled={busy || (me?.coins ?? 0) < entry.costCoins}
                />
                {pickRefStation && entry.needsReferenceStation ? (
                  <ScrollView style={{ maxHeight: 160 }}>
                    {stations.map((s) => (
                      <Pressable
                        key={s.id}
                        style={styles.refRow}
                        onPress={() => buy(i, s.id)}
                      >
                        <Text style={styles.rowText}>{s.name}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                ) : null}
              </View>
            ))}
            <Text style={[styles.sheetTitle, { marginTop: spacing.md }]}>
              Past hints ({hints.length})
            </Text>
            {hints.map((h) => (
              <Text key={h.id} style={styles.qText}>
                <Text style={styles.bold}>{h.askerName}:</Text> {h.result}
              </Text>
            ))}
          </ScrollView>
          <Button title="Close" variant="secondary" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

function StationPickerModal({
  open,
  zone,
  onClose,
  onPick,
}: {
  open: boolean;
  zone: string;
  onClose: () => void;
  onPick: (s: Station) => void;
}) {
  const items = useMemo(() => eligibleHidingStations(zone), [zone]);
  return (
    <Modal animationType="slide" visible={open} transparent>
      <View style={styles.scrim}>
        <View style={styles.modalCard}>
          <Text style={styles.sheetTitle}>Pick hiding station</Text>
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
  sheetActions: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
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
  q: {
    backgroundColor: colors.bgCard,
    padding: spacing.md,
    borderRadius: radius.md,
    gap: spacing.xs,
  },
  qText: { color: colors.text, fontSize: 14 },
  qAnswer: { fontSize: 13, fontWeight: '700' },
  answerRow: { flexDirection: 'row', gap: spacing.sm },
  muted: { color: colors.textMuted, fontSize: 12 },
  bold: { fontWeight: '700' },
  input: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    padding: spacing.md,
    color: colors.text,
    minHeight: 44,
  },
  refRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowText: { color: colors.text, fontSize: 14 },
});
