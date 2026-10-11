import { Feather } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Activity } from '@workspace/activity-catalog';
import { fonts } from '@/constants/colors';
import { useColors } from '@/hooks/useColors';
import { catalogCardIdentity, catalogCardMetadata } from '@/lib/catalog-explore';
import { DISCIPLINE_LABEL } from '@/lib/domain';

type Props = { activity: Activity; saved: boolean; onOpen: (target: View | null) => void; onToggleSaved: () => void };

function CatalogResultCardBase({ activity, saved, onOpen, onToggleSaved }: Props) {
  const c = useColors();
  const openRef = React.useRef<View>(null);
  const identity = catalogCardIdentity(activity);
  const labels = catalogCardMetadata(activity).slice(0, 3);
  const icon = identity === 'Sequence' ? 'layers' : identity === 'Sport' ? 'flag' : 'activity';
  return (
    <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
      <Pressable
        ref={openRef}
        testID={`catalog-result-${activity.id}`}
        accessibilityRole="button"
        accessibilityLabel={`${activity.name}, ${identity}. Open details`}
        onPress={() => onOpen(openRef.current)}
        style={({ pressed }) => [styles.main, { opacity: pressed ? 0.85 : 1 }]}
      >
        <View style={[styles.icon, { backgroundColor: c.secondary }]}>
          <Feather name={icon} size={18} color={c.secondaryForeground} />
        </View>
        <View style={styles.body}>
          <Text style={[styles.identity, { color: c.mutedForeground }]}>{DISCIPLINE_LABEL[activity.discipline]} · {identity}</Text>
          <Text style={[styles.title, { color: c.foreground }]}>{activity.name}</Text>
          {labels.length ? (
            <View style={styles.labels}>
              {labels.map(label => (
                <View key={label} style={[styles.label, { backgroundColor: c.muted }]}>
                  <Text style={[styles.labelText, { color: c.foreground }]}>{label}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      </Pressable>
      <Pressable
        testID={`catalog-quick-save-${activity.id}`}
        accessibilityRole="button"
        accessibilityState={{ selected: saved }}
        accessibilityLabel={saved ? `Saved ${activity.name}; remove bookmark` : `Save ${activity.name}`}
        onPress={onToggleSaved}
        style={[styles.save, { backgroundColor: saved ? c.secondary : 'transparent' }]}
      >
        <Feather name="bookmark" size={20} color={saved ? c.accent : c.mutedForeground} />
        <Text style={[styles.saveText, { color: saved ? c.accent : c.mutedForeground }]}>{saved ? 'Saved' : 'Save'}</Text>
      </Pressable>
    </View>
  );
}

export const CatalogResultCard = React.memo(CatalogResultCardBase);

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 24, paddingBottom: 8 },
  main: { minWidth: 0, minHeight: 44, flexDirection: 'row', gap: 12, padding: 14 },
  icon: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, minWidth: 0, gap: 3 },
  identity: { fontFamily: fonts.bodySemi, fontSize: 11, letterSpacing: 0.6, textTransform: 'uppercase' },
  title: { fontFamily: fonts.display, fontSize: 17, lineHeight: 22 },
  labels: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 5 },
  label: { maxWidth: '100%', borderRadius: 10, paddingHorizontal: 9, paddingVertical: 4 },
  labelText: { fontFamily: fonts.bodyMedium, fontSize: 12 },
  save: { minHeight: 44, alignSelf: 'flex-end', flexDirection: 'row', gap: 7, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 22, marginRight: 10, alignItems: 'center', justifyContent: 'center' },
  saveText: { fontFamily: fonts.bodySemi, fontSize: 13 },
});
