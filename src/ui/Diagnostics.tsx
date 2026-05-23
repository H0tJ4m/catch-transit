import { useEffect, useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { isFirebaseConfigured } from '@/firebase/config';
import { Button } from './Button';
import { colors, radius, spacing } from './theme';

type Status = 'ok' | 'warn' | 'fail';

type Row = {
  label: string;
  detail: string;
  status: Status;
  fix?: () => void | Promise<void>;
};

/**
 * On-device diagnostics: surface the most common reasons the app might
 * misbehave (location permission denied, Firebase not configured, push
 * permissions blocked) so users can self-diagnose without reading logs.
 */
export function Diagnostics() {
  const [rows, setRows] = useState<Row[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const next: Row[] = [];

      const fg = await Location.getForegroundPermissionsAsync();
      const fgRow: Row = {
        label: 'Location (when in use)',
        detail: fg.status,
        status: fg.status === 'granted' ? 'ok' : 'fail',
      };
      if (fg.status !== 'granted') {
        fgRow.fix = async () => {
          const r = await Location.requestForegroundPermissionsAsync();
          if (r.status !== 'granted') Linking.openSettings();
        };
      }
      next.push(fgRow);

      const bg = await Location.getBackgroundPermissionsAsync();
      const bgRow: Row = {
        label: 'Location (background)',
        detail: bg.status,
        status: bg.status === 'granted' ? 'ok' : 'warn',
      };
      if (bg.status !== 'granted') {
        bgRow.fix = async () => {
          await Location.requestBackgroundPermissionsAsync();
          Linking.openSettings();
        };
      }
      next.push(bgRow);

      const services = await Location.hasServicesEnabledAsync();
      next.push({
        label: 'Location services on',
        detail: services ? 'enabled' : 'disabled',
        status: services ? 'ok' : 'fail',
      });

      const notif = await Notifications.getPermissionsAsync();
      const notifRow: Row = {
        label: 'Notifications',
        detail: notif.status,
        status: notif.status === 'granted' ? 'ok' : 'warn',
      };
      if (notif.status !== 'granted') {
        notifRow.fix = async () => {
          await Notifications.requestPermissionsAsync();
        };
      }
      next.push(notifRow);

      next.push({
        label: 'Firebase configured',
        detail: isFirebaseConfigured ? 'yes' : 'no — multiplayer disabled',
        status: isFirebaseConfigured ? 'ok' : 'warn',
      });

      if (!cancelled) setRows(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Diagnostics</Text>
      <View style={styles.list}>
        {rows.map((r, i) => (
          <View key={i} style={styles.row}>
            <View
              style={[
                styles.dot,
                {
                  backgroundColor:
                    r.status === 'ok'
                      ? colors.success
                      : r.status === 'warn'
                      ? colors.warning
                      : colors.danger,
                },
              ]}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>{r.label}</Text>
              <Text style={styles.detail}>{r.detail}</Text>
            </View>
            {r.fix ? (
              <Button title="Fix" variant="ghost" onPress={() => r.fix?.()} />
            ) : null}
          </View>
        ))}
      </View>
      <Button
        title="Re-check"
        variant="secondary"
        onPress={() => setRefreshKey((k) => k + 1)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  heading: { color: colors.textMuted, fontSize: 12, letterSpacing: 1 },
  list: {
    backgroundColor: colors.bgElevated,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dot: { width: 10, height: 10, borderRadius: 5 },
  label: { color: colors.text, fontSize: 14, fontWeight: '600' },
  detail: { color: colors.textMuted, fontSize: 12 },
});
