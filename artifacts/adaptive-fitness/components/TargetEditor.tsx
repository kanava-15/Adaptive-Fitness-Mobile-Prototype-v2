import React from 'react';
import { View, Text, TextInput } from 'react-native';
import { NumField, Segmented, ToggleRow } from './planner';
import { Chip } from './ui';
import { useColors } from '@/hooks/useColors';
import { ExerciseDef, RoutineItem, Tracking, DistanceUnit, Side, knowledgeOf } from '@/lib/domain';

/** All dosage lives on this personal target, never on catalog knowledge. */
export function TargetEditor({ item, definition, onChange, index = 0 }: {
  item: RoutineItem; definition: ExerciseDef; onChange: (p: Partial<RoutineItem>) => void; index?: number;
}) {
  const c = useColors();
  const a = knowledgeOf(definition);
  const tracking: Tracking = item.breaths != null ? 'breaths' : item.distance != null ? 'distance' : item.seconds != null ? 'time' : item.reps != null ? 'reps' : definition.tracking;
  const change = (p: Partial<RoutineItem>) => onChange(definition.activity ? { ...p, confirmed: false } : p);
  const sides = ['unilateral', 'alternating'].includes(a.laterality);
  return (
    <View style={{ gap: 10 }}>
      <Text style={{ color: c.mutedForeground }}>Personal target · enter a dose before saving. Changing units keeps the number; it does not convert it.</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {a.supportedMetrics.map(m => {
          const t = m === 'duration' ? 'time' : m;
          return <Chip key={m} label={m} active={tracking === t} onPress={() => change({
            reps: undefined,
            seconds: undefined,
            breaths: undefined,
            distance: undefined,
            distanceUnit: t === 'distance' ? a.distanceUnits[0] : undefined,
          })} />;
        })}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        <NumField testID={`sets-${index}`} label="Sets" value={item.sets} min={1} max={20} onChange={v => change({ sets: v ?? 1 })} />
        {tracking === 'reps' ? <NumField testID={`reps-${index}`} label="Reps" value={item.reps} min={1} max={200} onChange={v => change({ reps: v })} /> : null}
        {tracking === 'time' ? <NumField testID={`seconds-${index}`} label="Time" suffix="s" step={5} value={item.seconds} min={5} max={3600} onChange={v => change({ seconds: v })} /> : null}
        {tracking === 'breaths' ? <NumField testID={`breaths-${index}`} label="Breaths" value={item.breaths} min={1} max={10000} onChange={v => change({ breaths: v })} /> : null}
        {tracking === 'distance' ? <NumField testID={`distance-${index}`} label="Distance" decimals value={item.distance} min={0.01} max={1000000} suffix={item.distanceUnit} onChange={v => change({ distance: v })} /> : null}
        <NumField label="Rest" suffix="s" step={15} value={item.restSec} max={600} onChange={v => change({ restSec: v ?? 0 })} />
        {a.loadUnits.length || item.load != null ? <NumField testID={`load-${index}`} label="Load" optional decimals step={item.unit === 'kg' ? 2.5 : 5} max={1000} value={item.load} suffix={item.unit} onChange={v => change({ load: v })} /> : null}
      </View>
      {tracking === 'distance' ? <Segmented testID={`distance-unit-${index}`} options={a.distanceUnits.map(u => ({ value: u, label: u }))} value={item.distanceUnit ?? a.distanceUnits[0] ?? 'm'} onChange={(distanceUnit: DistanceUnit) => change({ distanceUnit })} /> : null}
      {a.loadUnits.length || item.load != null ? <Segmented options={(a.loadUnits.length ? a.loadUnits : ['kg', 'lb'] as const).map(unit => ({ value: unit, label: unit }))} value={item.unit} onChange={unit => change({ unit })} /> : null}
      {sides ? <>
        <Segmented options={(['unspecified', 'left', 'right', 'both', 'alternating'] as Side[]).map(v => ({ value: v, label: v }))} value={item.side ?? 'unspecified'} onChange={side => change({ side })} />
        <ToggleRow label="Per side" value={item.perSide} onChange={perSide => change({ perSide })} />
      </> : null}
      <View style={{ gap: 5 }}>
        <Text style={{ color: c.mutedForeground, fontSize: 11, fontWeight: '600', letterSpacing: 1 }}>ACTIVITY NOTES</Text>
        <TextInput
          testID={`item-note-${index}`}
          value={item.note ?? ''}
          onChangeText={note => onChange({ note: note || undefined })}
          placeholder="Optional note for this routine item"
          placeholderTextColor={c.mutedForeground}
          multiline
          style={{ minHeight: 42, color: c.foreground, borderColor: c.border, borderWidth: 1, borderRadius: 12, padding: 10 }}
        />
      </View>
      <ToggleRow testID={`target-confirm-${index}`} label="Confirm this target" hint="Required for new catalog and sequence choices." value={item.confirmed === true} onChange={confirmed => onChange({ confirmed })} />
    </View>
  );
}
