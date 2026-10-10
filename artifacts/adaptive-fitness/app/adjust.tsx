import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useMemo } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Eyebrow, IconButton, success } from '@/components/ui';
import { fonts } from '@/constants/colors';
import { useTempo } from '@/context/TempoContext';
import { useColors } from '@/hooks/useColors';
import { ADJUST_LABEL, AdjustKind, PlanDay, targetLabel } from '@/lib/engine';

const VALID: AdjustKind[] = ['10', '20', '30', 'low', 'noequip'];

export default function Adjust() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { kind: raw } = useLocalSearchParams<{ kind?: string }>();
  const kind = (VALID.includes(raw as AdjustKind) ? raw : '20') as AdjustKind;
  const { previewAdjust, applyAdjust, state } = useTempo();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const preview = useMemo(() => previewAdjust(kind), [kind, state.plan?.version]);
  const top = Platform.OS === 'web' ? 67 : insets.top + 12;
  const bottom = Platform.OS === 'web' ? 34 : insets.bottom + 12;

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: Platform.OS === 'ios' ? 20 : top, paddingBottom: 140 }}>
        <View style={s.head}>
          <View style={{ flex: 1 }}>
            <Eyebrow>Preview change</Eyebrow>
            <Text style={[s.title, { color: c.foreground }]}>{ADJUST_LABEL[kind]}</Text>
          </View>
          <IconButton testID="adjust-close" icon="x" label="Close" onPress={() => router.back()} />
        </View>
        {!preview ? (
          <Text style={{ color: c.mutedForeground }}>No plan loaded yet.</Text>
        ) : (
          <>
            <View style={[s.explain, { backgroundColor: c.secondary }]}>
              <Feather name="info" size={18} color={c.secondaryForeground} />
              <Text style={[s.explainText, { color: c.secondaryForeground }]}>{preview.explanation}</Text>
            </View>
            <DayCol label="Now" day={preview.before} muted />
            <View style={{ alignItems: 'center', marginVertical: 6 }}>
              <Feather name="arrow-down" size={22} color={c.primary} />
            </View>
            <DayCol label="After" day={preview.after} />
            <Text style={[s.fine, { color: c.mutedForeground }]}>Applying saves a new plan version. The old version stays in your history, unchanged.</Text>
          </>
        )}
      </ScrollView>
      <View style={[s.footer, { paddingBottom: bottom, backgroundColor: c.background, borderTopColor: c.border }]}>
        <Button testID="adjust-cancel" label="Keep current" variant="ghost" onPress={() => router.back()} style={{ flex: 1 }} />
        <Button
          testID="adjust-apply"
          label="Apply"
          icon="check"
          disabled={!preview}
          onPress={() => {
            applyAdjust(kind);
            success();
            router.back();
          }}
          style={{ flex: 1 }}
        />
      </View>
    </View>
  );
}

function DayCol({ label, day, muted }: { label: string; day: PlanDay; muted?: boolean }) {
  const c = useColors();
  const s2 = day.session;
  return (
    <View style={[s.col, { backgroundColor: muted ? c.card : c.accent, borderColor: muted ? c.border : c.accent }]}>
      <Text style={[s.colLabel, { color: muted ? c.mutedForeground : c.accentMuted }]}>{label.toUpperCase()}</Text>
      <Text style={[s.colTitle, { color: muted ? c.foreground : c.accentForeground }]}>{s2 ? `${s2.title} · ${s2.minutes} min` : 'Rest'}</Text>
      {s2 ? (
        s2.exercises.map((e) => (
          <View key={e.exerciseId} style={s.row}>
            <Text style={[s.rowName, { color: muted ? c.foreground : c.accentForeground }]}>{e.name}</Text>
            <Text style={[s.rowT, { color: muted ? c.mutedForeground : c.accentMuted }]}>{e.sets}×{targetLabel(e)}</Text>
          </View>
        ))
      ) : (
        <Text style={[s.rowName, { color: muted ? c.mutedForeground : c.accentMuted }]}>{day.reason}</Text>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  title: { fontFamily: fonts.display, fontSize: 30, letterSpacing: -1, marginTop: 4 },
  explain: { flexDirection: 'row', gap: 10, padding: 14, borderRadius: 16, marginBottom: 16 },
  explainText: { flex: 1, fontFamily: 'Inter_500Medium', fontSize: 14, lineHeight: 20 },
  col: { borderRadius: 22, borderWidth: 1, padding: 18, gap: 8 },
  colLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 11, letterSpacing: 1.5 },
  colTitle: { fontFamily: fonts.display, fontSize: 20, letterSpacing: -0.4, marginBottom: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  rowName: { fontFamily: 'Inter_400Regular', fontSize: 14, flex: 1, lineHeight: 20 },
  rowT: { fontFamily: fonts.displayMedium, fontSize: 13 },
  fine: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 18, marginTop: 16, textAlign: 'center' },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1 },
});
