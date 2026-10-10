import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Chip, EmptyState, Eyebrow, ScreenTitle, useBottomPad, useTopInset } from '@/components/ui';
import { fonts } from '@/constants/colors';
import { useTempo } from '@/context/TempoContext';
import { useColors } from '@/hooks/useColors';
import { EventKind, addDays, dateKey, formatDuration, prettyDate } from '@/lib/engine';
import { targetLabel } from '@/lib/domain';

const EVENT_LABEL: Record<EventKind, string> = {
  starter: 'Starter plan',
  setup: 'Setup',
  rollover: 'New day',
  adjusted: 'Adjusted',
  profile: 'Profile change',
};
const DIFF = ['', 'Very easy', 'Easy', 'About right', 'Hard', 'Too hard'];

export default function Progress() {
  const c = useColors();
  const top = useTopInset();
  const bottom = useBottomPad();
  const { state } = useTempo();
  const [open, setOpen] = useState<string | null>(null);
  const [tab, setTab] = useState<'sessions' | 'versions'>('sessions');
  const comps = [...state.completions].sort((a, b) => (a.finishedAt < b.finishedAt ? 1 : -1));
  const events = [...state.events].reverse();
  const today = dateKey();
  const last28 = comps.filter((x) => x.date > addDays(today, -28));
  const totalSec = comps.reduce((n, x) => n + x.activeSeconds, 0);
  const activeDays = new Set(last28.map((x) => x.date)).size;

  return (
    <ScrollView style={{ backgroundColor: c.background }} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: top + 16, paddingBottom: bottom }}>
      <ScreenTitle eyebrow="Progress" title="What you did" />
      <View style={s.stats}>
        <View style={[s.statBig, { backgroundColor: c.accent }]}>
          <Text style={[s.statNum, { color: c.accentForeground }]}>{activeDays}</Text>
          <Text style={[s.statLabel, { color: c.accentMuted }]}>active days in the last 4 weeks</Text>
        </View>
        <View style={{ flex: 1, gap: 10 }}>
          <Card style={s.statSmall}>
            <Text style={[s.statNumS, { color: c.foreground }]}>{comps.length}</Text>
            <Text style={[s.statLabelS, { color: c.mutedForeground }]}>sessions total</Text>
          </Card>
          <Card style={s.statSmall}>
            <Text style={[s.statNumS, { color: c.foreground }]}>{Math.round(totalSec / 60)}</Text>
            <Text style={[s.statLabelS, { color: c.mutedForeground }]}>active minutes</Text>
          </Card>
        </View>
      </View>
      <Text style={[s.calm, { color: c.mutedForeground }]}>No streaks to break. Every session counts by itself.</Text>

      <View style={{ flexDirection: 'row', gap: 8, marginTop: 20, marginBottom: 14 }}>
        <Chip label="Sessions" active={tab === 'sessions'} onPress={() => setTab('sessions')} />
        <Chip label={`Plan versions (${state.events.length})`} active={tab === 'versions'} onPress={() => setTab('versions')} />
      </View>

      {tab === 'sessions' ? (
        comps.length === 0 ? (
          <EmptyState icon="activity" title="Nothing logged yet" body="Your first finished session will show up here with real times, sets, and how it felt. No placeholder history.">
            <Button label="Go to today" variant="soft" compact onPress={() => router.navigate('/')} />
          </EmptyState>
        ) : (
          <View style={{ gap: 10 }}>
            {comps.map((x) => {
              const sets = x.exercises.reduce((n, e) => n + e.sets.length, 0);
              const moves = x.exercises.filter((e) => e.done).length;
              return (
                <Card key={x.id}>
                  <Pressable testID={`history-${x.id}`} onPress={() => setOpen(open === x.id ? null : x.id)} style={s.rowHead}>
                    <View style={[s.badge, { backgroundColor: x.stoppedForPain ? c.muted : c.done }]}>
                      <Feather name={x.stoppedForPain ? 'shield' : 'check'} size={16} color={c.doneForeground} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.title, { color: c.foreground }]}>{x.title}</Text>
                      <Text style={[s.sub, { color: c.mutedForeground }]}>{prettyDate(x.date)}</Text>
                    </View>
                    <Text style={[s.time, { color: c.foreground }]}>{formatDuration(x.activeSeconds)}</Text>
                    <Feather name={open === x.id ? 'chevron-up' : 'chevron-down'} size={18} color={c.mutedForeground} />
                  </Pressable>
                  <Text style={[s.sub, { color: c.mutedForeground, marginTop: 10 }]}>
                    {moves}/{x.exercises.length} activities · {sets} sets · planned {x.estimateSec === null ? 'duration unknown' : `${x.plannedMinutes} min`}
                    {x.difficulty ? ` · felt ${DIFF[x.difficulty].toLowerCase()}` : ''}
                    {x.stoppedForPain ? ' · stopped for discomfort' : x.finishedEarly ? ' · finished early' : ''}
                  </Text>
                  {open === x.id ? (
                    <View style={{ marginTop: 12, gap: 10 }}>
                      {x.exercises.map((e, k) => (
                        <View key={`${e.itemKey}-${k}`} style={[s.detail, { borderTopColor: c.border }]}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                            <Text style={[s.dName, { color: c.foreground }]}>{e.name}{e.added ? ' (added)' : ''}</Text>
                            <Text style={[s.sub, { color: e.done ? c.foreground : c.mutedForeground }]}>{e.skipped ? 'skipped' : e.done ? 'done' : 'partial'}</Text>
                          </View>
                          <Text style={[s.sub, { color: c.mutedForeground }]}>
                            Planned {e.planned.sets} × {targetLabel(e.planned)}
                          </Text>
                          {(x.executedItems ?? x.snapshot?.items)?.find(it => it.key === e.itemKey) ? <Text style={[s.sub, { color: c.mutedForeground }]}>
                            Saved definition v{(x.executedItems ?? x.snapshot?.items)!.find(it => it.key === e.itemKey)!.defVersion} · {(x.executedItems ?? x.snapshot?.items)!.find(it => it.key === e.itemKey)!.definition?.activity?.reviewStatus ?? 'legacy knowledge'}
                          </Text> : null}
                          <Text style={[s.sub, { color: c.foreground }]}>
                            Did {e.sets.length ? e.sets.map(targetLabel).join(', ') : 'no sets logged'}
                          </Text>
                        </View>
                      ))}
                      {x.adaptation?.length ? <Text style={[s.sub, { color: c.mutedForeground }]}>Adapted: {x.adaptation.join(' ')}</Text> : null}
                    </View>
                  ) : null}
                </Card>
              );
            })}
          </View>
        )
      ) : events.length === 0 ? (
        <EmptyState icon="git-commit" title="No plan versions" body="Plan changes will be recorded here." />
      ) : (
        <View>
          {events.map((e, i) => (
            <View key={e.id} style={s.evRow}>
              <View style={{ alignItems: 'center' }}>
                <View style={[s.evDot, { backgroundColor: e.kind === 'adjusted' ? c.primary : c.accent }]} />
                {i < events.length - 1 ? <View style={[s.evLine, { backgroundColor: c.border }]} /> : null}
              </View>
              <View style={{ flex: 1, paddingBottom: 18 }}>
                <Eyebrow>{`v${e.planVersion} · ${EVENT_LABEL[e.kind]}`}</Eyebrow>
                <Text style={[s.sub, { color: c.mutedForeground }]}>{new Date(e.at).toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit', day: 'numeric', month: 'short' })}</Text>
                <Text style={[s.evText, { color: c.foreground }]}>{e.reason}</Text>
                {e.before || e.after ? (
                  <Text style={[s.sub, { color: c.mutedForeground, marginTop: 4 }]}>
                    {e.before ? (e.before.session ? `${e.before.session.title} ${e.before.session.minutes}m` : 'Rest') : '—'} → {e.after ? (e.after.session ? `${e.after.session.title} ${e.after.session.minutes}m` : 'Rest') : '—'}
                  </Text>
                ) : null}
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  detail: { borderTopWidth: 1, paddingTop: 10, gap: 2 },
  dName: { fontFamily: fonts.bodySemi, fontSize: 14, flex: 1 },
  stats: { flexDirection: 'row', gap: 10 },
  statBig: { flex: 1.1, borderRadius: 24, padding: 18, justifyContent: 'flex-end', minHeight: 170 },
  statNum: { fontFamily: fonts.display, fontSize: 60, letterSpacing: -3 },
  statLabel: { fontFamily: 'Inter_500Medium', fontSize: 13, lineHeight: 18 },
  statSmall: { flex: 1, padding: 14, justifyContent: 'center' },
  statNumS: { fontFamily: fonts.display, fontSize: 28, letterSpacing: -1 },
  statLabelS: { fontFamily: 'Inter_500Medium', fontSize: 12 },
  calm: { fontFamily: 'Inter_400Regular', fontSize: 13, marginTop: 12 },
  rowHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  badge: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: fonts.display, fontSize: 17, letterSpacing: -0.3 },
  sub: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 18 },
  time: { fontFamily: fonts.display, fontSize: 18 },
  evRow: { flexDirection: 'row', gap: 14 },
  evDot: { width: 12, height: 12, borderRadius: 6, marginTop: 3 },
  evLine: { width: 2, flex: 1, marginTop: 4 },
  evText: { fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 20, marginTop: 4 },
});
