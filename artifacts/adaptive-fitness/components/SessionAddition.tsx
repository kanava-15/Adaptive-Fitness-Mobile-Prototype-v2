import React, { useState } from 'react';
import { Modal, Platform, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ExerciseDef, RoutineItem, makeItem, sequenceDefinitions, snapItem, snapshotErrors } from '@/lib/domain';
import { TargetEditor } from './TargetEditor';
import { Button } from './ui';
import { useColors } from '@/hooks/useColors';
import { useTempo } from '@/context/TempoContext';

export function SessionAddition({ definition: d, close }: { definition: ExerciseDef; close: () => void }) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const t = useTempo();
  const [initial] = useState(() => {
    try {
      return { items: d.activity?.type === 'sequence' ? sequenceDefinitions(d.id, t.state.customExercises).map(m => ({ ...makeItem(m.definition), side: m.side, confirmed: false }))
        : [makeItem(d, 'kg', t.state.presets[d.id])], error: '' };
    } catch (err) { return { items: [] as RoutineItem[], error: `Cannot expand sequence: ${err instanceof Error ? err.message : 'membership invalid'}. Edit membership or restore its missing activities.` }; }
  });
  const [items, setItems] = useState<RoutineItem[]>(initial.items);
  const errors = [initial.error, ...snapshotErrors(items.map(it => snapItem(it, it.definition!)))].filter(Boolean);
  return <Modal visible animationType="slide" onRequestClose={close} presentationStyle="pageSheet">
    <ScrollView style={{ backgroundColor: c.background }} keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, paddingTop: Platform.OS === 'web' ? 67 : insets.top + 20, paddingBottom: insets.bottom + 30, gap: 16 }}>
      <Text style={{ color: c.foreground, fontSize: 22 }}>Add to current session — explicit targets</Text>
      {items.map((it, n) => <View key={it.key} style={{ gap: 10 }}>
        <Text style={{ color: c.foreground }}>{n + 1}. {it.definition!.name}</Text>
        <TargetEditor item={it} definition={it.definition!} index={n} onChange={p => setItems(xs => xs.map(x => x.key === it.key ? { ...x, ...p } : x))} />
      </View>)}
      {errors.map((e, n) => <Text key={n} style={{ color: c.destructive }}>{e}</Text>)}
      <Button testID="session-add-confirm" label="Add these targets" disabled={errors.length > 0} onPress={() => { items.forEach(it => t.addExerciseToActive(it.exerciseId, it)); close(); }} />
      <Button variant="ghost" label="Cancel" onPress={close} />
    </ScrollView>
  </Modal>;
}
