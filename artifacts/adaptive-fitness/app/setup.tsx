import { router } from 'expo-router';
import React, { useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Chip, Eyebrow, IconButton, success } from '@/components/ui';
import { fonts } from '@/constants/colors';
import { useTempo } from '@/context/TempoContext';
import { useColors } from '@/hooks/useColors';
import { DAY_SHORT, EQUIP_LABEL, Equipment, GOAL_LABEL, Goal, Minutes, Profile, REGION_LABEL, Region } from '@/lib/engine';

const STEPS = ['Goal', 'Equipment', 'Limits', 'Time'];

export default function Setup() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { state, saveProfile } = useTempo();
  const [p, setP] = useState<Profile>(state.profile);
  const [step, setStep] = useState(0);
  const top = Platform.OS === 'web' ? 67 : Platform.OS === 'ios' ? 20 : insets.top + 12;
  const bottom = Platform.OS === 'web' ? 34 : insets.bottom + 12;

  const toggle = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  const save = () => {
    saveProfile(p);
    success();
    router.back();
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: top, paddingBottom: 140 }}>
        <View style={s.head}>
          <View style={{ flex: 1, flexDirection: 'row', gap: 6 }}>
            {STEPS.map((x, i) => <View key={x} style={[s.seg, { backgroundColor: i <= step ? c.primary : c.muted }]} />)}
          </View>
          <IconButton testID="setup-close" icon="x" label="Close setup" onPress={() => router.back()} />
        </View>
        <Eyebrow>{`Step ${step + 1} of 4 · optional`}</Eyebrow>

        {step === 0 ? (
          <>
            <Text style={[s.q, { color: c.foreground }]}>What would make this worth it?</Text>
            <View style={s.list}>
              {(Object.keys(GOAL_LABEL) as Goal[]).map((g) => <Chip key={g} label={GOAL_LABEL[g]} active={p.goal === g} onPress={() => setP({ ...p, goal: g })} />)}
            </View>
          </>
        ) : null}
        {step === 1 ? (
          <>
            <Text style={[s.q, { color: c.foreground }]}>What’s usually within reach?</Text>
            <Text style={[s.help, { color: c.mutedForeground }]}>Bodyweight is always included. You can switch to no-equipment any day.</Text>
            <View style={s.list}>
              {(Object.keys(EQUIP_LABEL) as Equipment[]).map((e) => (
                <Chip key={e} label={EQUIP_LABEL[e]} active={p.equipment.includes(e)} onPress={() => e !== 'none' && setP({ ...p, equipment: toggle(p.equipment, e) })} />
              ))}
            </View>
          </>
        ) : null}
        {step === 2 ? (
          <>
            <Text style={[s.q, { color: c.foreground }]}>Anything to go easy on?</Text>
            <Text style={[s.help, { color: c.mutedForeground }]}>Movements that load these areas are left out entirely. If nothing safe remains for a day, Tempo schedules rest.</Text>
            <View style={s.list}>
              {(Object.keys(REGION_LABEL) as Region[]).map((r) => <Chip key={r} label={REGION_LABEL[r]} active={p.exclusions.includes(r)} onPress={() => setP({ ...p, exclusions: toggle(p.exclusions, r) })} />)}
            </View>
          </>
        ) : null}
        {step === 3 ? (
          <>
            <Text style={[s.q, { color: c.foreground }]}>Which days usually have a gap?</Text>
            <View style={s.days}>
              {[1, 2, 3, 4, 5, 6, 0].map((d) => <Chip key={d} label={DAY_SHORT[d]} active={p.availability.includes(d)} onPress={() => setP({ ...p, availability: toggle(p.availability, d).sort() })} />)}
            </View>
            <Text style={[s.q, { color: c.foreground, fontSize: 22, marginTop: 28 }]}>Typical length</Text>
            <View style={s.days}>
              {([10, 20, 30] as Minutes[]).map((m) => <Chip key={m} label={`${m} min`} active={p.defaultMinutes === m} onPress={() => setP({ ...p, defaultMinutes: m })} />)}
            </View>
            <Text style={[s.help, { color: c.mutedForeground }]}>Pick fewer days than you think. You can always add a session on the day.</Text>
          </>
        ) : null}
      </ScrollView>
      <View style={[s.footer, { paddingBottom: bottom, backgroundColor: c.background, borderTopColor: c.border }]}>
        <Button label={step === 0 ? 'Skip all' : 'Back'} variant="ghost" onPress={() => (step === 0 ? router.back() : setStep(step - 1))} style={{ flex: 1 }} />
        <Button testID="setup-next" label={step === 3 ? 'Build my plan' : 'Next'} icon={step === 3 ? 'check' : 'arrow-right'} onPress={() => (step === 3 ? save() : setStep(step + 1))} style={{ flex: 1.4 }} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 22 },
  seg: { flex: 1, height: 5, borderRadius: 3 },
  q: { fontFamily: fonts.display, fontSize: 30, letterSpacing: -1, marginTop: 8, lineHeight: 34 },
  help: { fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 20, marginTop: 10 },
  list: { gap: 10, marginTop: 20, alignItems: 'flex-start' },
  days: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1 },
});
