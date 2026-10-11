import React, { useRef, useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ExerciseDef, RoutineItem, itemsFromSelection, selectionErrors, snapItem, snapshotErrors } from '@/lib/domain';
import { KeyboardAwareScrollViewCompat } from './KeyboardAwareScrollViewCompat';
import { TargetEditor } from './TargetEditor';
import { Button } from './ui';
import { useColors } from '@/hooks/useColors';
import { useTempo } from '@/context/TempoContext';
import { focusDetailTarget } from '@/lib/detail-focus';

export function SessionAddition({ definition: d, close, sessionId, onAdded }: {
  definition: ExerciseDef; close: () => void; sessionId?: string; onAdded?: () => void;
}) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const t = useTempo();
  const [originalSession] = useState(sessionId ?? t.state.active?.id ?? '');
  const [initial] = useState(() => itemsFromSelection([d], t.state.customExercises, t.state.presets));
  const [items, setItems] = useState<RoutineItem[]>(initial.items);
  const [submitErrors, setSubmitErrors] = useState<string[]>([]);
  const submitted = useRef(false);
  const heading = useRef<View>(null);
  const errors = [
    initial.error,
    ...(t.state.active?.id === originalSession ? [] : ['The original session is no longer running. Nothing was added.']),
    ...selectionErrors(d.id, items, t.state.customExercises, initial.items),
    ...snapshotErrors(items.map(it => snapItem(it, it.definition!))),
  ].filter((e): e is string => !!e);
  const confirm = () => {
    if (submitted.current) return;
    submitted.current = true;
    const result = t.addSelectionToActive(originalSession, d.id, items, initial.items);
    if (result.length) { setSubmitErrors(result); submitted.current = false; return; }
    (onAdded ?? close)();
  };
  return <Modal visible transparent animationType="slide" onShow={() => focusDetailTarget(heading.current)} onRequestClose={close}>
    <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}>
      <Pressable testID="session-add-dismiss" accessibilityRole="button" accessibilityLabel="Dismiss target entry" onPress={close} style={StyleSheet.absoluteFill} />
      <View accessibilityViewIsModal style={{ maxHeight: '88%', backgroundColor: c.background, borderTopLeftRadius: 24, borderTopRightRadius: 24 }}>
        <KeyboardAwareScrollViewCompat keyboardShouldPersistTaps="handled" bottomOffset={30} contentContainerStyle={{ padding: 20, paddingBottom: Math.max(insets.bottom, Platform.OS === 'web' ? 34 : 0) + 20, gap: 16 }}>
          <View ref={heading} accessible accessibilityRole="header" tabIndex={-1}><Text style={{ color: c.foreground, fontSize: 22 }}>Add {d.name} to active session</Text></View>
          <Text style={{ color: c.mutedForeground }}>Enter and confirm every target. Existing work and timers stay unchanged.</Text>
          {items.map((it, n) => <View key={it.key} style={{ gap: 10 }}>
            <Text style={{ color: c.foreground }}>{n + 1}. {it.definition!.name}</Text>
            <TargetEditor item={it} definition={it.definition!} index={n} onChange={p => { setSubmitErrors([]); setItems(xs => xs.map(x => x.key === it.key ? { ...x, ...p } : x)); }} />
          </View>)}
          {[...new Set([...errors, ...submitErrors])].map(e => <Text key={e} accessibilityRole="alert" style={{ color: c.destructive }}>{e}</Text>)}
          <Button testID="session-add-confirm" label="Add these targets" disabled={errors.length > 0} onPress={confirm} />
          <Button testID="session-add-cancel" variant="ghost" label="Cancel" onPress={close} />
        </KeyboardAwareScrollViewCompat>
      </View>
    </View>
  </Modal>;
}
