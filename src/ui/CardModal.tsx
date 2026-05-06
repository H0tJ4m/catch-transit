import { Modal, StyleSheet, Text, View } from 'react-native';
import { Button } from './Button';
import { colors, radius, spacing } from './theme';
import type { ActiveCard } from '@/game/types';
import { getStation } from '@/transit/graph';

type Props = {
  card: ActiveCard | null;
  onResolve: (result: 'success' | 'fail' | 'skip') => void;
};

export function CardModal({ card, onResolve }: Props) {
  if (!card) return null;
  const station = getStation(card.stationId);
  const isCurse = card.kind === 'curse';

  return (
    <Modal animationType="fade" transparent visible>
      <View style={styles.scrim}>
        <View
          style={[
            styles.card,
            { borderColor: isCurse ? colors.curse : colors.challenge },
          ]}
        >
          <Text
            style={[
              styles.kindBadge,
              { color: isCurse ? colors.curse : colors.challenge },
            ]}
          >
            {isCurse ? 'CURSE' : 'CHALLENGE'}
          </Text>
          <Text style={styles.station}>at {station?.name ?? 'Unknown Station'}</Text>
          <Text style={styles.title}>{card.title}</Text>
          <Text style={styles.description}>{card.description}</Text>
          <View style={styles.metaRow}>
            <Text style={styles.meta}>+{card.reward} on success</Text>
            <Text style={styles.meta}>−{card.penalty} on fail</Text>
            {card.timerSeconds > 0 ? (
              <Text style={styles.meta}>
                {Math.round(card.timerSeconds / 60)} min limit
              </Text>
            ) : null}
          </View>

          <View style={styles.actions}>
            <Button title="Done — success" onPress={() => onResolve('success')} />
            <Button title="Failed it" variant="danger" onPress={() => onResolve('fail')} />
            <Button title="Skip" variant="secondary" onPress={() => onResolve('skip')} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    backgroundColor: colors.bgElevated,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 2,
  },
  kindBadge: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: spacing.xs,
  },
  station: {
    color: colors.textMuted,
    fontSize: 13,
    marginBottom: spacing.md,
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  description: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  metaRow: {
    flexDirection: 'row',
    gap: spacing.md,
    flexWrap: 'wrap',
    marginBottom: spacing.lg,
  },
  meta: {
    color: colors.textMuted,
    fontSize: 12,
  },
  actions: {
    gap: spacing.sm,
  },
});
