import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button } from '@/ui/Button';
import { colors, radius, spacing } from '@/ui/theme';
import { useFirebaseUser } from '@/firebase/auth';
import { isFirebaseConfigured } from '@/firebase/config';
import { createRoom, joinRoom } from '@/firebase/rooms';
import { useRoomStore } from '@/multiplayer/store';

export default function RaceHome() {
  const router = useRouter();
  const { user, loading } = useFirebaseUser();
  const setIdentity = useRoomStore((s) => s.setIdentity);
  const setRoomCode = useRoomStore((s) => s.setRoomCode);
  const displayName = useRoomStore((s) => s.displayName);

  const [name, setName] = useState(displayName);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (user) setIdentity(user.uid, name);
  }, [user, name, setIdentity]);

  if (!isFirebaseConfigured) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.heading}>Train Rush</Text>
        <View style={styles.warning}>
          <Text style={styles.warningTitle}>Firebase not configured</Text>
          <Text style={styles.warningBody}>
            Copy <Text style={styles.code}>.env.example</Text> to{' '}
            <Text style={styles.code}>.env</Text> and paste your Firebase web config.
          </Text>
        </View>
      </ScrollView>
    );
  }

  const handleCreate = async () => {
    if (!user) return;
    setBusy(true);
    setErr(null);
    try {
      const newCode = await createRoom(user.uid, name || 'Player', { mode: 'race' });
      setRoomCode(newCode);
      router.push(`/race/${newCode}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to create room');
    } finally {
      setBusy(false);
    }
  };

  const handleJoin = async () => {
    if (!user || code.length < 3) return;
    setBusy(true);
    setErr(null);
    try {
      const upper = code.toUpperCase();
      await joinRoom(upper, user.uid, name || 'Player');
      setRoomCode(upper);
      router.push(`/race/${upper}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to join');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>Train Rush</Text>
      <Text style={styles.body}>
        Two teams race across MMR from station A to station B. Spend coins to throw curses at the
        opposing side. First team to reach the destination wins.
      </Text>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Your name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="e.g. Aarav"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          maxLength={16}
        />
      </View>

      <View style={styles.section}>
        <Button title="Create room" onPress={handleCreate} disabled={!user || busy || loading} />
      </View>

      <View style={styles.divider} />

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Or join with a code</Text>
        <TextInput
          value={code}
          onChangeText={(v) => setCode(v.toUpperCase().replace(/[^A-Z2-9]/g, ''))}
          placeholder="ABCD"
          placeholderTextColor={colors.textMuted}
          style={[styles.input, styles.codeInput]}
          maxLength={4}
          autoCapitalize="characters"
        />
        <Button
          title="Join"
          variant="secondary"
          onPress={handleJoin}
          disabled={!user || busy || code.length < 3}
        />
      </View>

      {err ? <Text style={styles.error}>{err}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, gap: spacing.lg, flexGrow: 1 },
  heading: { color: colors.text, fontSize: 28, fontWeight: '800' },
  body: { color: colors.textMuted, fontSize: 14, lineHeight: 21 },
  section: { gap: spacing.sm },
  sectionLabel: { color: colors.textMuted, fontSize: 12, letterSpacing: 1 },
  input: {
    backgroundColor: colors.bgElevated,
    borderRadius: radius.md,
    padding: spacing.md,
    color: colors.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  codeInput: { fontSize: 28, fontWeight: '800', letterSpacing: 8, textAlign: 'center' },
  divider: { height: 1, backgroundColor: colors.border },
  warning: {
    backgroundColor: colors.bgElevated,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.warning,
    gap: spacing.sm,
  },
  warningTitle: { color: colors.warning, fontWeight: '700' },
  warningBody: { color: colors.text, lineHeight: 21 },
  code: {
    fontFamily: 'Courier',
    color: colors.accent,
    backgroundColor: colors.bgCard,
    paddingHorizontal: 4,
  },
  error: { color: colors.danger, fontSize: 13 },
});
