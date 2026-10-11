import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { Button, Card, Eyebrow, ScreenTitle, confirm, notify, success, tap, useBottomPad, useTopInset } from '@/components/ui';
import { fonts } from '@/constants/colors';
import { useTempo } from '@/context/TempoContext';
import { useColors } from '@/hooks/useColors';
import { DAY_SHORT, EQUIP_LABEL, GOAL_LABEL, REGION_LABEL } from '@/lib/engine';

export default function Settings() {
  const c = useColors();
  const top = useTopInset();
  const bottom = useBottomPad();
  const { state, exportJson, checkImport, replaceAll, resetAll } = useTempo();
  const [showExport, setShowExport] = useState(false);
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const p = state.profile;

  const doExport = async () => {
    const json = exportJson();
    setShowExport(true);
    try {
      await Share.share({ message: json, title: 'Svasthic export' });
    } catch {
      // Share unavailable (e.g. some web browsers) — JSON is shown below for copying.
    }
  };

  const doImport = () => {
    const r = checkImport(importText.trim());
    if (!r.ok) {
      setImportError(r.error);
      return;
    }
    setImportError(null);
    confirm('Replace all local data?', `This file has ${r.summary}\n\nEverything currently on this device will be replaced. Export first if you want a backup.`, 'Replace', () => {
      replaceAll(r.data);
      setImportText('');
      success();
      notify('Imported', 'Your saved workouts and history were restored. No sessions were added.');
    }, true);
  };

  const rows: [string, string][] = [
    ['Goal', GOAL_LABEL[p.goal]],
    ['Equipment', p.equipment.map((e) => EQUIP_LABEL[e]).join(', ')],
    ['Avoiding', p.exclusions.length ? p.exclusions.map((r) => REGION_LABEL[r]).join(', ') : 'Nothing'],
    ['Training days', p.availability.length ? p.availability.map((d) => DAY_SHORT[d]).join(' ') : 'None'],
    ['Default length', `${p.defaultMinutes} min`],
  ];

  return (
    <KeyboardAwareScrollViewCompat style={{ backgroundColor: c.background }} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: top + 16, paddingBottom: bottom }} keyboardShouldPersistTaps="handled" bottomOffset={20}>
      <ScreenTitle eyebrow="You" title="Profile & data" />

      <Card>
        <View style={s.cardHead}>
          <Eyebrow>Your setup</Eyebrow>
          {!p.setupDone ? <Text style={[s.pill, { backgroundColor: c.secondary, color: c.secondaryForeground }]}>Using defaults</Text> : null}
        </View>
        {rows.map(([k, v]) => (
          <View key={k} style={[s.row, { borderBottomColor: c.border }]}>
            <Text style={[s.k, { color: c.mutedForeground }]}>{k}</Text>
            <Text style={[s.v, { color: c.foreground }]}>{v}</Text>
          </View>
        ))}
        <Button testID="edit-profile" label={p.setupDone ? 'Edit setup' : 'Run quick setup'} icon="sliders" variant="soft" onPress={() => router.push('/setup')} style={{ marginTop: 14 }} />
      </Card>

      <View style={[s.privacy, { backgroundColor: c.accent }]}>
        <Feather name="lock" size={20} color={c.done} />
        <View style={{ flex: 1 }}>
          <Text style={[s.privTitle, { color: c.accentForeground }]}>Stays on this device</Text>
          <Text style={[s.privBody, { color: c.accentMuted }]}>No account, cloud sync, in-app AI calls, or analytics. Your profile, routines, and workout history stay in this app’s local storage. Svasthic may request shared exercise-catalog updates; it does not send your profile or workouts. If you export, the app you choose receives either your selected content or a whole-device JSON backup. Deleting Svasthic removes local data unless you exported it.</Text>
        </View>
      </View>

      <Card style={{ marginTop: 14 }}>
        <Eyebrow>Activities and routines</Eyebrow>
        <Text style={[s.body, { color: c.mutedForeground }]}>Import or export selected activities and routines, with a guide for your own AI assistant. Separate from whole-device backup below.</Text>
        <Button testID="open-content-exchange" label="Import & export content" icon="repeat" variant="soft" onPress={() => router.push('/content-exchange')} style={{ marginTop: 12 }} />
      </Card>

      <Card style={{ marginTop: 14 }}>
        <Eyebrow>Whole-device backup</Eyebrow>
        <Text style={[s.body, { color: c.mutedForeground }]}>Save a JSON copy of your profile, plan versions, and every completed session. Restore below replaces everything on this device.</Text>
        <Button testID="export" label="Export data" icon="share" variant="accent" onPress={doExport} style={{ marginTop: 12 }} />
        {showExport ? (
          <>
            <TextInput value={exportJson()} multiline editable={false} selectTextOnFocus style={[s.code, { backgroundColor: c.muted, color: c.foreground }]} />
            <Pressable onPress={() => { tap(); setShowExport(false); }} hitSlop={8}>
              <Text style={[s.link, { color: c.mutedForeground }]}>Hide</Text>
            </Pressable>
          </>
        ) : null}
      </Card>

      <Card style={{ marginTop: 14 }}>
        <Eyebrow>Whole-device restore</Eyebrow>
        <Text style={[s.body, { color: c.mutedForeground }]}>Paste a Svasthic backup. Earlier Tempo backups are still supported. It’s checked first, and you’ll confirm before anything is replaced.</Text>
        <TextInput
          testID="import-input"
          value={importText}
          onChangeText={(v) => {
            setImportText(v);
            setImportError(null);
          }}
          multiline
          placeholder='{"app": "tempo", ...}'
          placeholderTextColor={c.mutedForeground}
          autoCapitalize="none"
          autoCorrect={false}
          style={[s.code, { backgroundColor: c.muted, color: c.foreground, borderColor: importError ? c.destructive : 'transparent', borderWidth: 1.5 }]}
        />
        {importError ? <Text style={[s.err, { color: c.destructive }]}>{importError}</Text> : null}
        <Button testID="import" label="Check & import" icon="download" variant="ghost" disabled={!importText.trim()} onPress={doImport} style={{ marginTop: 12 }} />
      </Card>

      <Card style={{ marginTop: 14 }}>
        <Eyebrow>Start over</Eyebrow>
        <Text style={[s.body, { color: c.mutedForeground }]}>Erase profile, history, and plan versions from this device.</Text>
        <Button
          testID="reset"
          label="Erase all data"
          icon="trash-2"
          variant="danger"
          onPress={() => confirm('Erase everything?', 'All sessions and plan history on this device will be permanently deleted.', 'Erase', () => { resetAll(); success(); }, true)}
          style={{ marginTop: 12 }}
        />
      </Card>

      <Text style={[s.fine, { color: c.mutedForeground }]}>Svasthic offers general fitness suggestions, not medical advice, and has not been clinically validated. Stop if something hurts and consult a qualified professional about pain or health conditions.</Text>
    </KeyboardAwareScrollViewCompat>
  );
}

const s = StyleSheet.create({
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  pill: { fontFamily: 'Inter_600SemiBold', fontSize: 11, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, overflow: 'hidden' },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  k: { fontFamily: 'Inter_400Regular', fontSize: 14 },
  v: { fontFamily: 'Inter_500Medium', fontSize: 14, flex: 1, textAlign: 'right' },
  privacy: { flexDirection: 'row', gap: 14, borderRadius: 22, padding: 18, marginTop: 14 },
  privTitle: { fontFamily: fonts.display, fontSize: 18, letterSpacing: -0.3 },
  privBody: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 19, marginTop: 4 },
  body: { fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 20, marginTop: 6 },
  code: { fontFamily: 'Inter_400Regular', fontSize: 12, borderRadius: 14, padding: 12, marginTop: 12, minHeight: 110, maxHeight: 220, textAlignVertical: 'top' },
  link: { fontFamily: 'Inter_500Medium', fontSize: 13, marginTop: 8, textDecorationLine: 'underline' },
  err: { fontFamily: 'Inter_500Medium', fontSize: 13, marginTop: 8 },
  fine: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 18, marginTop: 20, textAlign: 'center' },
});
