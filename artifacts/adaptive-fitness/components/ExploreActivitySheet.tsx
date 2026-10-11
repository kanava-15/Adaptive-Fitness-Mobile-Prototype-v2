import { Feather } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Activity } from '@workspace/activity-catalog';
import { DetailDisclosure as Disclosure, DetailDisclosureState, ExploreActivityContent } from '@/components/ExploreActivityContent';
import { Button, IconButton } from '@/components/ui';
import { fonts } from '@/constants/colors';
import { useCatalog } from '@/context/CatalogContext';
import { useTempo } from '@/context/TempoContext';
import { useColors } from '@/hooks/useColors';
import { formatHistorySet, historyStatus, selectActivityHistory, sequenceDisplay } from '@/lib/catalog-detail';
import { DISCIPLINE_LABEL } from '@/lib/domain';
import { focusDetailTarget } from '@/lib/detail-focus';
import { AddDestinationSheet } from './AddDestinationSheet';

const label = (s: string) => s.replaceAll('-', ' ');
const FooterAction = React.forwardRef<View, { label: string; accessibilityLabel?: string; saved?: boolean; primary?: boolean; testID: string; onPress: () => void }>(
  function FooterAction({ label, accessibilityLabel, saved, primary, testID, onPress }, ref) {
    const c = useColors();
    return <Pressable ref={ref} testID={testID} accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? label} accessibilityState={{ selected: saved }} onPress={onPress} style={({ pressed }) => [s.action, { backgroundColor: primary ? c.accent : c.secondary, opacity: pressed ? 0.8 : 1 }]}>
      <Feather name={primary ? 'plus' : 'bookmark'} size={18} color={primary ? c.accentForeground : c.secondaryForeground} />
      <Text style={[s.actionText, { color: primary ? c.accentForeground : c.secondaryForeground }]}>{label}</Text>
    </Pressable>;
  },
);

export function ExploreActivitySheet({ activityId, onClose, saved, onToggleSaved }: {
  activityId: string; onClose: () => void; saved: (a: Activity) => boolean; onToggleSaved: (a: Activity) => void;
}) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { state: catalog } = useCatalog();
  const tempo = useTempo();
  const [stack, setStack] = useState<string[]>([activityId]);
  const [chooser, setChooser] = useState(false);
  const [allHistory, setAllHistory] = useState(false);
  const [disclosures, setDisclosures] = useState<Record<string, boolean>>({});
  const scrollRef = React.useRef<ScrollView>(null);
  const headingRef = React.useRef<View>(null);
  const addRef = React.useRef<View>(null);
  const offsets = React.useRef<Record<number, number>>({});
  const { width, fontScale } = useWindowDimensions();
  const release = catalog.release;
  const currentId = stack[stack.length - 1];
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: offsets.current[stack.length - 1] ?? 0, animated: false });
      focusDetailTarget(headingRef.current);
    });
    return () => cancelAnimationFrame(frame);
  }, [currentId, stack.length]);
  const dismissChooser = () => {
    setChooser(false);
    requestAnimationFrame(() => focusDetailTarget(addRef.current));
  };
  const activity = release.activities.find(a => a.id === currentId);
  if (!activity) return <Modal visible transparent animationType="slide" onRequestClose={() => chooser ? dismissChooser() : onClose()}>
    <View style={s.overlay}>
      <View style={[s.choice, { backgroundColor: c.background, paddingBottom: insets.bottom + 20 }]}>
        <Text accessibilityRole="alert" style={[s.body, { color: c.destructive }]}>This activity is no longer available.</Text>
        <Button label="Close details" onPress={onClose} />
      </View>
      {chooser ? <AddDestinationSheet activityId={currentId} onClose={dismissChooser} onNavigate={onClose} /> : null}
    </View>
  </Modal>;
  const isSaved = saved(activity);
  const back = () => { setAllHistory(false); if (stack.length > 1) setStack(st => st.slice(0, -1)); else onClose(); };
  const open = (id: string) => { if (!release.activities.some(a => a.id === id && !a.archived)) return; setAllHistory(false); offsets.current[stack.length] = 0; setStack(st => [...st, id]); };
  const isSport = activity.type === 'sport' || activity.discipline === 'sports';
  const showDifficulty = !isSport && activity.difficulty !== 'unknown';

  const seq = sequenceDisplay(release, activity);
  const members = activity.type === 'sequence' ? seq.steps : null;
  const seqError = seq.error;
  const history = selectActivityHistory(tempo.state.completions, activity.id);
  const shown = allHistory ? history : history.slice(0, 5);
  const list = (items: string[] | null) => items?.length ? items.map((t, i) => (
    <Text key={i} selectable style={[s.body, { color: c.foreground }]}>{items.length > 1 ? `${i + 1}. ` : ''}{t}</Text>
  )) : null;
  const meta = [DISCIPLINE_LABEL[activity.discipline], activity.type === 'sequence' ? 'Sequence' : label(activity.type), showDifficulty ? activity.difficulty : null].filter(Boolean).join(' · ');
  const measures = activity.supportedMetrics.join(', ');

  return (
    <Modal visible transparent animationType="slide" onShow={() => focusDetailTarget(headingRef.current)} onRequestClose={() => { if (chooser) dismissChooser(); else back(); }}>
      <View style={s.overlay}>
        <Pressable accessibilityLabel="Close details" onPress={onClose} style={StyleSheet.absoluteFill} />
        <View accessibilityViewIsModal style={[s.sheet, { backgroundColor: c.background, marginTop: insets.top + 12 }]}>
          <View style={s.grab}><View style={[s.grabBar, { backgroundColor: c.border }]} /></View>
          <View style={s.top}>
            <IconButton testID="catalog-detail-back" icon={stack.length > 1 ? 'arrow-left' : 'x'} label={stack.length > 1 ? 'Back to previous activity' : 'Close details'} onPress={back} />
            <Text style={[s.topTitle, { color: c.mutedForeground }]} numberOfLines={1}>{stack.length > 1 ? 'Related activity' : 'Activity details'}</Text>
            {stack.length > 1 ? <IconButton icon="x" label="Close details" onPress={onClose} /> : <View style={{ width: 44 }} />}
          </View>
          <ScrollView ref={scrollRef} onScroll={e => { offsets.current[stack.length - 1] = e.nativeEvent.contentOffset.y; }} scrollEventThrottle={16} contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
            <DetailDisclosureState.Provider value={{ identity: currentId, values: disclosures, toggle: (key, value) => setDisclosures(v => ({ ...v, [key]: value })) }}>
            <View ref={headingRef} accessible accessibilityRole="header" accessibilityLabel={activity.name} tabIndex={-1}>
              <Text testID="catalog-detail-name" style={[s.title, { color: c.foreground }]}>{activity.name}</Text>
            </View>
            <Text style={[s.meta, { color: c.mutedForeground }]}>{meta}</Text>
            {activity.archived ? <Text style={[s.meta, { color: c.destructive }]}>Archived: not available to add to routines.</Text> : null}
            <View style={s.chips}>
              <View style={[s.chip, { backgroundColor: c.secondary }]}><Text style={[s.chipT, { color: c.secondaryForeground }]}>Measures: {measures}</Text></View>
              {activity.equipment?.length ? <View style={[s.chip, { backgroundColor: c.muted }]}><Text style={[s.chipT, { color: c.foreground }]}>{activity.equipment.map(label).join(', ')}</Text></View> : null}
              {activity.laterality !== 'unknown' && activity.laterality !== 'not-applicable' ? <View style={[s.chip, { backgroundColor: c.muted }]}><Text style={[s.chipT, { color: c.foreground }]}>{activity.laterality}</Text></View> : null}
            </View>
            <Text selectable style={[s.body, { color: c.foreground, fontSize: 16, lineHeight: 24 }]}>{activity.description}</Text>

            {activity.instructionNeeded || activity.precautions.length ? (
              <View accessibilityRole="alert" style={[s.warn, { borderColor: c.destructive, backgroundColor: c.card }]}>
                <View style={s.row}><Feather name="alert-triangle" size={16} color={c.destructive} /><Text accessibilityRole="header" style={[s.h, { color: c.destructive }]}>Precautions</Text></View>
                {activity.instructionNeeded ? <Text style={[s.body, { color: c.foreground, fontFamily: fonts.bodySemi }]}>Experienced instruction required.</Text> : null}
                {list(activity.precautions)}
              </View>
            ) : null}

            {activity.setup.length || activity.execution.length || activity.cues.length ? (
              <Disclosure key={`how:${currentId}`} title="How to do it" initial testID="catalog-detail-how">
                 {activity.setup.length ? <><Text accessibilityRole="header" style={[s.sub, { color: c.foreground }]}>Setup</Text>{list(activity.setup)}</> : null}
                 {activity.execution.length ? <><Text accessibilityRole="header" style={[s.sub, { color: c.foreground }]}>Execution and exit</Text>{list(activity.execution)}</> : null}
                 {activity.cues.length ? <><Text accessibilityRole="header" style={[s.sub, { color: c.foreground }]}>Cues</Text>{list(activity.cues)}</> : null}
              </Disclosure>
            ) : null}

            {activity.benefits.length ? (
              <Disclosure key={`benefits:${currentId}`} title="Benefits (qualified)">
                {activity.benefits.map((b, i) => <Text key={i} selectable style={[s.body, { color: c.foreground }]}>{b.text}{'\n'}<Text style={{ color: c.mutedForeground }}>{b.qualification}{'\n'}Sources: {b.sourceIds.map(id => release.sources.find(s => s.id === id)?.title ?? id).join('; ')}</Text></Text>)}
              </Disclosure>
            ) : null}

            {activity.type === 'sequence' ? (
              <Disclosure key={`seq:${currentId}`} title={`Sequence${members ? ` (${members.length} steps)` : ''}`} initial testID="catalog-detail-sequence">
                {seqError ? <Text style={[s.body, { color: c.destructive }]}>{seqError}</Text> : null}
                {members?.map((m, i) => {
                  const ok = m.navigable;
                  return (
                    <Pressable key={i} disabled={!ok} accessibilityRole={ok ? 'link' : 'text'} accessibilityLabel={`Step ${i + 1}: ${m.name}, side ${m.side}${ok ? '. Open' : ''}`} onPress={() => open(m.activityId)} style={[s.step, { borderColor: c.border }]}>
                      <Text style={[s.stepN, { color: c.mutedForeground }]}>{i + 1}</Text>
                      <Text style={[s.body, { color: ok ? c.primary : c.foreground, flex: 1, textDecorationLine: ok ? 'underline' : 'none' }]}>{m.name} · {m.side}</Text>
                    </Pressable>
                  );
                })}
                <Text style={[s.meta, { color: c.destructive }]}>Explicit target required: the catalog sets no dose for these steps.</Text>
              </Disclosure>
            ) : null}

            <ExploreActivityContent key={currentId} activity={activity} release={release} onOpenRelated={open} />

            <View style={[s.block, { borderColor: c.border, backgroundColor: c.muted, padding: 14, gap: 8 }]}>
              <Text accessibilityRole="header" style={[s.h, { color: c.foreground }]}>Your recorded history</Text>
              <Text style={[s.meta, { color: c.mutedForeground }]}>From workouts you logged on this device. Not part of the catalog.</Text>
              {shown.length ? shown.map(({ completion, log, key }) => (
                <View key={key} style={[s.hist, { borderTopColor: c.border }]}>
                  <Text style={[s.sub, { color: c.foreground }]}>{new Date(completion.finishedAt).toLocaleDateString()} · {completion.title}</Text>
                  <Text style={[s.meta, { color: c.mutedForeground }]}>{historyStatus(log)}{log.sets.length ? ` · ${log.sets.map(formatHistorySet).join(' / ')}` : ''}</Text>
                </View>
              )) : <Text style={[s.meta, { color: c.mutedForeground }]}>No local history recorded for this activity.</Text>}
              {history.length > 5 ? <Button compact variant="ghost" label={allHistory ? 'Show fewer' : `Show all ${history.length}`} onPress={() => setAllHistory(v => !v)} /> : null}
            </View>
            </DetailDisclosureState.Provider>
          </ScrollView>
          <View style={[s.footer, { flexDirection: width < 360 || fontScale > 1.3 ? 'column' : 'row', backgroundColor: c.background, borderTopColor: c.border, paddingBottom: Math.max(insets.bottom, 12) }]}>
            <View style={{ flex: width < 360 || fontScale > 1.3 ? undefined : 1 }}><FooterAction testID={`catalog-save-${activity.id}`} saved={isSaved} label={isSaved ? 'Saved' : 'Save'} accessibilityLabel={isSaved ? `Saved ${activity.name}; remove bookmark` : `Save ${activity.name}`} onPress={() => onToggleSaved(activity)} /></View>
            {!activity.archived ? <View style={{ flex: width < 360 || fontScale > 1.3 ? undefined : 2 }}><FooterAction ref={addRef} testID="catalog-add-routine" primary label="Add to…" onPress={() => setChooser(true)} /></View> : null}
          </View>
        </View>
        {chooser ? <AddDestinationSheet activityId={currentId} onClose={dismissChooser} onNavigate={onClose} /> : null}
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { flex: 1, borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden' },
  grab: { alignItems: 'center', paddingTop: 8 }, grabBar: { width: 40, height: 4, borderRadius: 2 },
  top: { minHeight: 52, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  topTitle: { flex: 1, textAlign: 'center', fontFamily: fonts.bodySemi, fontSize: 13 },
  scroll: { padding: 20, paddingBottom: 28, gap: 14 },
  title: { fontFamily: fonts.display, fontSize: 28, lineHeight: 34, flexShrink: 1 },
  meta: { fontFamily: fonts.body, fontSize: 12.5, lineHeight: 18, textTransform: 'capitalize' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { maxWidth: '100%', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  chipT: { fontFamily: fonts.bodyMedium, fontSize: 12.5, textTransform: 'capitalize' },
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22 },
  warn: { borderWidth: 2, borderRadius: 18, padding: 14, gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  h: { fontFamily: fonts.bodySemi, fontSize: 16 },
  sub: { fontFamily: fonts.bodySemi, fontSize: 13, marginTop: 4 },
  block: { borderWidth: 1, borderRadius: 18, overflow: 'hidden' },
  step: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 10, borderTopWidth: 1, paddingVertical: 6 },
  stepN: { width: 24, fontFamily: fonts.bodySemi, fontSize: 13 },
  hist: { borderTopWidth: 1, paddingTop: 8, gap: 2 },
  footer: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1 },
  choice: { maxHeight: '80%', borderTopWidth: 1, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 18, paddingTop: 10 },
  action: { minHeight: 54, borderRadius: 28, paddingHorizontal: 12, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  actionText: { fontFamily: fonts.bodySemi, fontSize: 15, flexShrink: 1, textAlign: 'center' },
});
