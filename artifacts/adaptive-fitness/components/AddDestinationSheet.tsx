import React, { useRef, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCatalog } from '@/context/CatalogContext';
import { useTempo } from '@/context/TempoContext';
import { useColors } from '@/hooks/useColors';
import { activityDef, itemsFromSelection } from '@/lib/domain';
import { focusDetailTarget } from '@/lib/detail-focus';
import { Button, IconButton } from './ui';
import { SessionAddition } from './SessionAddition';
import { fonts } from '@/constants/colors';

/** Shared by Explore cards and the currently displayed (including nested) detail. */
export function AddDestinationSheet({ activityId, onClose, onNavigate }: {
  activityId: string; onClose: () => void; onNavigate?: () => void;
}) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const t = useTempo();
  const { state: catalog } = useCatalog();
  const [originalSession] = useState(t.state.active?.id);
  const [enterTargets, setEnterTargets] = useState(false);
  const [error, setError] = useState('');
  const leaving = useRef(false);
  const heading = useRef<View>(null);
  const activeButton = useRef<View>(null);
  const activity = catalog.release.activities.find(a => a.id === activityId);
  const available = !!activity && !activity.archived;
  const go = (id?: string) => {
    if (leaving.current) return;
    if (!available) { setError('This activity is no longer available. Nothing was added.'); return; }
    if (id && !t.state.routines.some(r => r.id === id && !r.archived)) {
      setError('This routine is no longer available. Choose another destination.'); return;
    }
    const batch = itemsFromSelection([activityDef(activity!)], t.state.customExercises);
    if (batch.error) { setError(batch.error); return; }
    leaving.current = true;
    onClose();
    onNavigate?.();
    router.push({ pathname: '/builder', params: { ...(id ? { id } : {}), activityId, explore: '1' } });
  };
  return <Modal visible transparent animationType="slide" onShow={() => focusDetailTarget(heading.current)} onRequestClose={onClose}>
    <View style={s.overlay}>
      <Pressable testID="catalog-add-dismiss" accessibilityRole="button" accessibilityLabel="Dismiss Add to choices" onPress={onClose} style={StyleSheet.absoluteFill} />
      <View accessibilityViewIsModal style={[s.sheet, { backgroundColor: c.background, paddingBottom: Math.max(insets.bottom, Platform.OS === 'web' ? 34 : 0) + 14 }]}>
        <View style={s.header}>
          <View ref={heading} accessible accessibilityRole="header" tabIndex={-1} style={{ flex: 1 }}><Text style={[s.title, { color: c.foreground }]}>Add “{activity?.name ?? activityId}” to…</Text></View>
          <IconButton testID="catalog-add-close" icon="x" label="Close Add to choices" onPress={onClose} />
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 12, paddingBottom: 12 }}>
          <Text style={{ color: c.mutedForeground }}>Routine choices open a draft. Nothing is saved until you save it.</Text>
          {!available ? <Text accessibilityRole="alert" style={{ color: c.destructive }}>This activity is unavailable or archived. It cannot be newly added.</Text> : null}
          {originalSession && t.state.active?.id === originalSession ? <View ref={activeButton}>
            <Button testID="catalog-add-active-session" variant="soft" icon="play" label="Add to active session" disabled={!available} onPress={() => {
              if (t.state.active?.id !== originalSession) { setError('The original session is no longer running. Nothing was added.'); return; }
              setEnterTargets(true);
            }} />
          </View> : null}
          {t.state.routines.filter(r => !r.archived).map(r => <Button key={r.id} testID={`catalog-add-existing-${r.id}`} variant="soft" label={`Add to “${r.name}” draft`} disabled={!available} onPress={() => go(r.id)} />)}
          <Button testID="catalog-add-new-routine" icon="plus" label="Create new routine" disabled={!available} onPress={() => go()} />
          {error ? <Text accessibilityRole="alert" style={{ color: c.destructive }}>{error}</Text> : null}
          <Button variant="ghost" label="Cancel" onPress={onClose} />
        </ScrollView>
      </View>
      {enterTargets && activity ? <SessionAddition definition={activityDef(activity)} sessionId={originalSession} close={() => { setEnterTargets(false); requestAnimationFrame(() => focusDetailTarget(activeButton.current)); }} onAdded={onClose} /> : null}
    </View>
  </Modal>;
}

const s = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { maxHeight: '80%', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20 },
  header: { flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 16 },
  title: { fontFamily: fonts.display, fontSize: 21 },
});
