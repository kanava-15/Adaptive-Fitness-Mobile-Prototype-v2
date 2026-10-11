import React from 'react';
import { Text, TextInput, View } from 'react-native';
import { Activity, activityTypeSchema, muscleSchema, jointSchema, actionSchema } from '@workspace/activity-catalog';
import { Chip } from './ui';
import { ToggleRow } from './planner';
import { useColors } from '@/hooks/useColors';
import { fonts } from '@/constants/colors';

export function KnowledgeEditor({ value: a, onChange }: { value: Activity; onChange: (a: Activity) => void }) {
  const c = useColors();
  const patch = (p: Partial<Activity>) => onChange({ ...a, ...p });
  const field = (label: string, value: string, save: (s: string) => void, multiline = false) => <View style={{ gap: 6 }}>
    <Text style={{ color: c.foreground, fontFamily: fonts.bodySemi }}>{label}</Text>
    <TextInput accessibilityLabel={label} value={value} onChangeText={save} multiline={multiline}
      style={{ color: c.foreground, backgroundColor: c.card, borderColor: c.border, borderWidth: 1, borderRadius: 12, padding: 12, minHeight: multiline ? 80 : 44 }} />
  </View>;
  const chips = <T extends string,>(title: string, values: readonly T[], selected: readonly T[], save: (v: T[]) => void) => <View style={{ gap: 6 }}>
    <Text style={{ color: c.foreground, fontFamily: fonts.bodySemi }}>{title}</Text>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>{values.map(v => <Chip key={v} label={v} active={selected.includes(v)} onPress={() => save(selected.includes(v) ? selected.filter(x => x !== v) : [...selected, v])} />)}</View>
  </View>;
  const lines = (v: string) => v.split('\n').map(s => s.trim()).filter(Boolean);
  return <View style={{ gap: 14, marginTop: 20 }}>
    <Text style={{ color: c.foreground, fontFamily: fonts.display, fontSize: 20 }}>Structured activity knowledge</Text>
    <Text style={{ color: c.mutedForeground }}>User-authored · unreviewed · stored only on this device, not uploaded. No dosage or automatic adaptation permission.</Text>
    {field('English name', a.englishName ?? '', v => patch({ englishName: v || null }))}
    {field('Sanskrit name', a.sanskritName ?? '', v => patch({ sanskritName: v || null }))}
    {field('Aliases (one per line)', a.aliases.join('\n'), v => patch({ aliases: lines(v) }), true)}
    {chips('Activity type', activityTypeSchema.options, [a.type], v => patch({ type: v.at(-1) ?? a.type }))}
    {chips('Difficulty', ['beginner', 'intermediate', 'advanced', 'unknown'] as const, [a.difficulty], v => patch({ difficulty: v.at(-1) ?? a.difficulty }))}
    {chips('Supported measurements', ['reps', 'duration', 'breaths', 'distance'] as const, a.supportedMetrics, v => patch({ supportedMetrics: v, distanceUnits: v.includes('distance') ? ['m', 'km', 'mi', 'yd'] : [] }))}
    {chips('Laterality', ['bilateral', 'unilateral', 'alternating', 'not-applicable', 'unknown'] as const, [a.laterality], v => patch({ laterality: v.at(-1) ?? a.laterality }))}
    {chips('Primary muscles (empty = unknown)', muscleSchema.options, a.primaryMuscles ?? [], v => patch({ primaryMuscles: v.length ? v : null }))}
    {chips('Secondary muscles (empty = unknown)', muscleSchema.options, a.secondaryMuscles ?? [], v => patch({ secondaryMuscles: v.length ? v : null }))}
    {chips('Joints (empty = unknown)', jointSchema.options, a.joints ?? [], v => patch({ joints: v.length ? v : null }))}
    {chips('Actions (empty = unknown)', actionSchema.options, a.actions ?? [], v => patch({ actions: v.length ? v : null }))}
    {(['setup', 'cues', 'precautions', 'modifications'] as const).map(k => <React.Fragment key={k}>{field(`${k} (one per line)`, a[k].join('\n'), v => patch({ [k]: lines(v) }), true)}</React.Fragment>)}
    {field('Common mistakes (one per line)', (a.commonMistakes ?? []).join('\n'), v => patch({ commonMistakes: lines(v) }), true)}
    <ToggleRow label="Instruction required" value={a.instructionNeeded} onChange={v => patch({ instructionNeeded: v })} />
    {a.discipline === 'mobility' ? <>
      <ToggleRow label="Add mobility safeguards" value={!!a.mobility} onChange={v => patch({ mobility: v ? { position: 'Describe position', stabilization: 'Describe stabilization', compensationCues: [], comfortableRange: 'Stay within a comfortable range', intensityCaution: 'Stop if painful', regressions: [] } : null })} />
      {a.mobility ? (['position', 'stabilization', 'comfortableRange', 'intensityCaution'] as const).map(k => <React.Fragment key={k}>{field(k, a.mobility![k], v => patch({ mobility: { ...a.mobility!, [k]: v } }), true)}</React.Fragment>) : null}
    </> : null}
  </View>;
}
