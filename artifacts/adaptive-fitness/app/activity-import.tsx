import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { Button, Card, Eyebrow, IconButton, confirm, success, useBottomPad, useTopInset } from '@/components/ui';
import { fonts } from '@/constants/colors';
import { useCatalog } from '@/context/CatalogContext';
import { useTempo } from '@/context/TempoContext';
import { useColors } from '@/hooks/useColors';
import {
  activityImportIsStale,
  includedActivityImportRefs,
  reviewActivityContent,
  validateActivityImportChoices,
  type ActivityImportChoice,
  type ActivityImportEntry,
  type ActivityImportReview,
} from '@/lib/content-exchange';
import { pickContentFile } from '@/lib/content-transport';
import type { Activity, Source } from '@workspace/activity-catalog';

const messageOf = (error: unknown) => error instanceof Error ? error.message : 'Something went wrong.';
const compactJson = (value: unknown) => JSON.stringify(value, null, 2);

function references(activity: Activity): string[] {
  return [...new Set([
    ...activity.sourceIds,
    ...activity.seriesContext.map(item => item.sourceId),
    ...activity.benefits.flatMap(item => item.sourceIds),
    ...(activity.mediaReferences ?? []).map(item => item.sourceId),
  ])];
}

function sourceDetails(activity: Activity, sources: Source[]): unknown[] {
  const ids = new Set(references(activity));
  return sources.filter(source => ids.has(source.id));
}

function DiffRows({ entry, allEntries, releaseSources }: { entry: ActivityImportEntry; allEntries: ActivityImportEntry[]; releaseSources: Source[] }) {
  const c = useColors();
  const match = entry.match!;
  const incoming = entry.incoming.activity;
  const existing = match.activity;
  const packageSources = entry.incoming.sources;
  const nameFor = (ref: string) => allEntries.find(item => item.incoming.ref === ref)?.incoming.activity.name ?? ref;
  const incomingSequence = entry.incoming.members.map((member, index) => ({
    position: index + 1,
    name: nameFor(member.activityRef),
    side: member.side,
  }));
  const existingSequence = match.members.map((member, index) => ({
    position: index + 1,
    name: member.name,
    side: member.side,
  }));
  const coreKeys = new Set([
    'id', 'version', 'name', 'type', 'discipline', 'family', 'description', 'setup', 'execution', 'cues', 'commonMistakes',
    'precautions', 'supportedMetrics', 'distanceUnits', 'loadUnits', 'laterality', 'equipment',
    'sourceIds', 'seriesContext', 'benefits', 'mediaReferences', 'type',
  ]);
  const rows: { label: string; current: unknown; incoming: unknown }[] = [
    { label: 'Version', current: existing.version, incoming: incoming.version },
    { label: 'Name', current: existing.name, incoming: incoming.name },
    { label: 'Activity type', current: { type: existing.type, discipline: existing.discipline, family: existing.family }, incoming: { type: incoming.type, discipline: incoming.discipline, family: incoming.family } },
    {
      label: 'Instructions',
      current: { description: existing.description, setup: existing.setup, execution: existing.execution, cues: existing.cues, commonMistakes: existing.commonMistakes },
      incoming: { description: incoming.description, setup: incoming.setup, execution: incoming.execution, cues: incoming.cues, commonMistakes: incoming.commonMistakes },
    },
    { label: 'Precautions', current: existing.precautions, incoming: incoming.precautions },
    { label: 'Benefits', current: existing.benefits, incoming: incoming.benefits },
    { label: 'Lineage context', current: existing.seriesContext, incoming: incoming.seriesContext },
    {
      label: 'Tracking',
      current: { supportedMetrics: existing.supportedMetrics, distanceUnits: existing.distanceUnits, loadUnits: existing.loadUnits, laterality: existing.laterality },
      incoming: { supportedMetrics: incoming.supportedMetrics, distanceUnits: incoming.distanceUnits, loadUnits: incoming.loadUnits, laterality: incoming.laterality },
    },
    { label: 'Equipment', current: existing.equipment, incoming: incoming.equipment },
    { label: 'Sources', current: sourceDetails(existing, releaseSources), incoming: packageSources.filter(source => references(incoming).includes(source.id)) },
    { label: 'Media references', current: existing.mediaReferences ?? [], incoming: incoming.mediaReferences ?? [] },
    { label: 'Sequence membership', current: existingSequence, incoming: incomingSequence },
    {
      label: 'Other activity details',
      current: Object.fromEntries(Object.entries(existing).filter(([key]) => !coreKeys.has(key))),
      incoming: Object.fromEntries(Object.entries(incoming).filter(([key]) => !coreKeys.has(key))),
    },
  ];
  const changedRows = rows.map(row => ({ ...row, changed: compactJson(row.current) !== compactJson(row.incoming) }));
  const changed = changedRows.filter(row => row.changed);
  if (!changed.length) {
    return <Text testID={`activity-diff-identical-${entry.incoming.ref}`} style={[s.copy, { color: c.mutedForeground }]}>No differences found.</Text>;
  }
  return <View testID={`activity-diff-${entry.incoming.ref}`} style={{ gap: 8 }}>
    {changedRows.map(row => (
      <View key={row.label} style={[s.diffRow, { borderColor: row.changed ? c.primary : c.border, backgroundColor: row.changed ? c.secondary : c.card }]}>
        <View style={s.diffHeader}>
          <Text style={[s.label, { color: c.foreground, flex: 1 }]}>{row.label}</Text>
          {row.changed ? <Text style={[s.changed, { color: c.primary }]}>Changed</Text> : <Text style={[s.small, { color: c.mutedForeground }]}>Same</Text>}
        </View>
        <View style={s.diffColumns}>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={[s.smallStrong, { color: c.mutedForeground }]}>Catalogue</Text>
            <Text selectable style={[s.small, { color: c.foreground }]}>{compactJson(row.current)}</Text>
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={[s.smallStrong, { color: c.mutedForeground }]}>Incoming</Text>
            <Text selectable style={[s.small, { color: c.foreground }]}>{compactJson(row.incoming)}</Text>
          </View>
        </View>
      </View>
    ))}
  </View>;
}

function ActivityReviewCard({
  entry,
  allEntries,
  releaseSources,
  choice,
  onChoice,
}: {
  entry: ActivityImportEntry;
  allEntries: ActivityImportEntry[];
  releaseSources: Source[];
  choice?: ActivityImportChoice;
  onChoice: (choice: ActivityImportChoice) => void;
}) {
  const c = useColors();
  const [showDifferences, setShowDifferences] = useState(false);
  const [showDefinition, setShowDefinition] = useState(false);
  const incoming = entry.incoming;
  const activity = incoming.activity;
  const nameFor = (ref: string) => allEntries.find(item => item.incoming.ref === ref)?.incoming.activity.name ?? ref;
  const resolution = choice === 'catalogue'
    ? `Use existing activity · ${entry.match?.source} · ${entry.match?.activity.id} v${entry.match?.activity.version}`
    : choice === 'copy'
      ? `Create new imported activity · incoming ${incoming.origin.kind} ${incoming.origin.id} v${incoming.origin.version} · local copy v1, unverified`
      : entry.match
        ? 'Needs your choice'
        : `Create new imported activity · incoming ${incoming.origin.kind} ${incoming.origin.id} v${incoming.origin.version}`;
  const orderedMembers = incoming.members.map((member, index) => `${index + 1}. ${nameFor(member.activityRef)} · ${member.side}`);
  const sourceRows = incoming.sources.map(source => `${source.title} — ${source.provenance} · ${source.url}`);
  const isSequence = activity.type === 'sequence';

  return (
    <View testID={`activity-import-item-${incoming.ref}`}>
    <Card style={{ gap: 10 }}>
      <View style={s.itemTop}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={[s.itemName, { color: c.foreground }]}>{activity.name}</Text>
          <Text style={[s.small, { color: c.mutedForeground }]}>{resolution}</Text>
          <Text style={[s.small, { color: c.mutedForeground }]}>Incoming source: {incoming.origin.kind} {incoming.origin.id} · v{incoming.origin.version}</Text>
          {entry.match ? <Text style={[s.small, { color: c.mutedForeground }]}>Existing source: {entry.match.source} · {entry.match.activity.id} · v{entry.match.activity.version}</Text> : null}
        </View>
        <Feather name={isSequence ? 'list' : 'activity'} size={19} color={c.accent} />
      </View>

      <View style={[s.status, { backgroundColor: entry.match && !choice ? c.muted : choice === 'catalogue' ? c.secondary : c.card, borderColor: c.border }]}>
        <Text style={[s.statusText, { color: c.foreground }]}>{entry.match && !choice ? 'Needs your choice' : choice === 'catalogue' ? 'Use existing activity' : 'Create new imported activity'}</Text>
      </View>

      {entry.match ? (
        <View style={{ gap: 8 }}>
          <Text style={[s.copy, { color: c.foreground }]}>This activity matches an activity in Svasthic’s catalogue. Would you like to use the catalogue activity or save the incoming activity as a custom copy?</Text>
          <View style={s.actions}>
            <Button compact variant="soft" testID={`activity-differences-${incoming.ref}`} label={showDifferences ? 'Hide differences' : 'View differences'} icon="columns" onPress={() => setShowDifferences(value => !value)} />
            <Button compact testID={`activity-use-catalogue-${incoming.ref}`} label="Use catalogue activity" icon="bookmark" variant={choice === 'catalogue' ? 'accent' : 'ghost'} onPress={() => onChoice('catalogue')} />
            <Button compact testID={`activity-save-copy-${incoming.ref}`} label="Save custom copy" icon="copy" variant={choice === 'copy' ? 'accent' : 'ghost'} onPress={() => onChoice('copy')} />
          </View>
          {showDifferences ? <DiffRows entry={entry} allEntries={allEntries} releaseSources={releaseSources} /> : null}
        </View>
      ) : null}

      <View style={{ gap: 5 }}>
        <Text style={[s.smallStrong, { color: c.foreground }]}>Instructions</Text>
        <Text selectable style={[s.copy, { color: c.foreground }]}>{activity.description}</Text>
        {activity.setup.length ? <Text selectable style={[s.small, { color: c.foreground }]}>Setup: {activity.setup.join(' · ')}</Text> : null}
        {activity.execution.length ? <Text selectable style={[s.small, { color: c.foreground }]}>Steps: {activity.execution.join(' · ')}</Text> : null}
      </View>
      <View style={{ gap: 4 }}>
        <Text style={[s.smallStrong, { color: c.foreground }]}>Precautions</Text>
        <Text selectable style={[s.small, { color: c.foreground }]}>{activity.precautions.length ? activity.precautions.join(' · ') : 'None listed.'}</Text>
      </View>
      <View style={{ gap: 4 }}>
        <Text style={[s.smallStrong, { color: c.foreground }]}>Sources</Text>
        {sourceRows.length ? sourceRows.map((source, index) => <Text key={`${incoming.ref}-source-${index}`} selectable style={[s.small, { color: c.mutedForeground }]}>{source}</Text>) : <Text style={[s.small, { color: c.mutedForeground }]}>No sources listed.</Text>}
      </View>
      {isSequence ? (
        <View style={{ gap: 4 }}>
          <Text style={[s.smallStrong, { color: c.foreground }]}>Ordered sequence members · repeats are kept</Text>
          {orderedMembers.map((member, index) => <Text key={`${incoming.ref}-member-${index}`} style={[s.small, { color: c.foreground }]}>{member}</Text>)}
        </View>
      ) : null}
      {entry.match ? (
        <Button compact variant="ghost" testID={`activity-definition-${incoming.ref}`} label={showDefinition ? 'Hide full definitions' : 'View full catalogue and incoming definitions'} icon={showDefinition ? 'chevron-up' : 'chevron-down'} onPress={() => setShowDefinition(value => !value)} />
      ) : (
        <Button compact variant="ghost" testID={`activity-definition-${incoming.ref}`} label={showDefinition ? 'Hide full definition' : 'View full definition'} icon={showDefinition ? 'chevron-up' : 'chevron-down'} onPress={() => setShowDefinition(value => !value)} />
      )}
      {showDefinition ? (
        <View style={{ gap: 6 }}>
          {entry.match ? <Text selectable style={[s.code, { color: c.foreground, backgroundColor: c.muted }]}>Catalogue definition\n{compactJson({ activity: entry.match.activity, members: entry.match.members, sources: sourceDetails(entry.match.activity, releaseSources) })}</Text> : null}
          <Text selectable style={[s.code, { color: c.foreground, backgroundColor: c.muted }]}>Incoming definition\n{compactJson({ activity, sources: incoming.sources, members: incoming.members.map((member, index) => ({ order: index + 1, name: nameFor(member.activityRef), ...member })) })}</Text>
        </View>
      ) : null}
    </Card>
    </View>
  );
}

export default function ActivityImportScreen() {
  const c = useColors();
  const top = useTopInset();
  const bottom = useBottomPad();
  const { state, commitActivityImport } = useTempo();
  const catalog = useCatalog();
  const [raw, setRaw] = useState('');
  const [pasteOpen, setPasteOpen] = useState(false);
  const [review, setReview] = useState<ActivityImportReview | null>(null);
  const [choices, setChoices] = useState<Record<string, ActivityImportChoice>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const stale = review ? activityImportIsStale(state, catalog.state.release, review) : false;
  const includedRefs = useMemo(() => review ? includedActivityImportRefs(review, choices) : new Set<string>(), [review, choices]);
  const visibleEntries = review?.entries.filter(entry => includedRefs.has(entry.incoming.ref)) ?? [];
  const excludedEntries = review?.entries.filter(entry => !includedRefs.has(entry.incoming.ref)) ?? [];
  const choiceErrors = useMemo(() => review ? validateActivityImportChoices(review, choices) : [], [review, choices]);
  const missingChoices = visibleEntries.filter(entry => !!entry.match && !choices[entry.incoming.ref]).length;
  const addedEstimate = visibleEntries.filter(entry => !entry.match || choices[entry.incoming.ref] === 'copy').length;
  const reusedEstimate = visibleEntries.filter(entry => !!entry.match && choices[entry.incoming.ref] === 'catalogue').length;
  const blocked = !review || busy || stale || !!review.duplicate || missingChoices > 0 || choiceErrors.length > 0;

  const reviewText = (text: string) => {
    setError(null);
    setReview(null);
    setChoices({});
    try {
      setReview(reviewActivityContent(text, state, catalog.state.release));
    } catch (failure) {
      setError(messageOf(failure));
    }
  };
  const chooseFile = async () => {
    setError(null);
    try {
      const text = await pickContentFile();
      if (text === null) return;
      setRaw(text);
      reviewText(text);
    } catch (failure) {
      setError(`Could not read the file: ${messageOf(failure)}`);
    }
  };
  const cancel = () => {
    setReview(null);
    setChoices({});
    setRaw('');
    setError(null);
  };
  const commit = () => {
    if (blocked || !review) return;
    const summary = `Add ${addedEstimate} new imported ${addedEstimate === 1 ? 'activity' : 'activities'} and reuse ${reusedEstimate} catalogue ${reusedEstimate === 1 ? 'definition' : 'definitions'}? Existing custom activities, routines, schedules, logs, bookmarks and active sessions will remain unchanged. New imported activities are saved as unverified.`;
    confirm('Confirm activity import', summary, 'Import', () => {
      setBusy(true);
      setError(null);
      void commitActivityImport(review, choices).then(result => {
        success();
        router.replace({
          pathname: '/library',
          params: {
            tab: 'personal',
            importAdded: String(result.added),
            importReused: String(result.reused),
            importNames: result.addedNames.slice(0, 5).join(' • '),
            importMore: String(Math.max(0, result.addedNames.length - 5)),
            importToken: review.token,
          },
        });
      }).catch(failure => setError(messageOf(failure))).finally(() => setBusy(false));
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <View style={[s.bar, { paddingTop: top + 8, borderBottomColor: c.border }]}>
        <View style={{ flex: 1 }}>
          <Eyebrow>My Activities</Eyebrow>
          <Text accessibilityRole="header" style={[s.title, { color: c.foreground }]}>Import activities</Text>
        </View>
        <IconButton testID="activity-import-close" icon="x" label="Close without importing" onPress={() => router.replace({ pathname: '/library', params: { tab: 'personal' } })} />
      </View>
      <KeyboardAwareScrollViewCompat
        style={{ backgroundColor: c.background }}
        contentContainerStyle={{ padding: 20, paddingBottom: bottom, gap: 12 }}
        keyboardShouldPersistTaps="handled"
        bottomOffset={24}
      >
        {!review ? (
          <>
            <Card style={{ gap: 8 }}>
              <Eyebrow>Choose a JSON file</Eyebrow>
              <Text style={[s.copy, { color: c.mutedForeground }]}>Review activities and sequences before anything is saved. A package that also contains routines is not imported in this activity-only flow.</Text>
              <View style={s.actions}>
                <Button compact testID="activity-import-file" variant="soft" icon="file" label="Choose JSON file" onPress={() => void chooseFile()} />
                <Button compact testID="activity-import-open-paste" variant="ghost" icon="clipboard" label={pasteOpen ? 'Hide paste field' : 'Paste JSON'} onPress={() => setPasteOpen(value => !value)} />
              </View>
            </Card>
            {pasteOpen ? (
              <Card style={{ gap: 8 }}>
                <Eyebrow>Paste JSON</Eyebrow>
                <TextInput
                  testID="activity-import-input"
                  value={raw}
                  onChangeText={text => { setRaw(text); setError(null); }}
                  multiline
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder="Paste a Svasthic activity JSON package"
                  placeholderTextColor={c.mutedForeground}
                  accessibilityLabel="Paste activity JSON"
                  style={[s.input, { color: c.foreground, borderColor: error ? c.destructive : c.border, backgroundColor: c.card }]}
                />
                <Button compact testID="activity-import-review" icon="eye" label="Review pasted JSON" disabled={!raw.trim()} onPress={() => reviewText(raw)} style={{ alignSelf: 'flex-start' }} />
              </Card>
            ) : null}
            {error ? <Text accessibilityRole="alert" accessibilityLiveRegion="polite" testID="activity-import-error" style={[s.error, { color: c.destructive }]}>{error}</Text> : null}
          </>
        ) : (
          <>
            <Card style={{ gap: 6 }}>
              <Eyebrow>Review — nothing is saved yet</Eyebrow>
              <Text style={[s.itemName, { color: c.foreground }]}>{review.package.title}</Text>
              <Text style={[s.small, { color: c.mutedForeground }]}>Author: {review.package.author ?? 'not stated'} · {review.entries.length} incoming activity definitions and dependencies · package version {review.package.version}</Text>
              <Text style={[s.small, { color: c.mutedForeground }]}>Choose how each recognized catalogue match is handled. New copies remain local, unverified, and separate from existing content.</Text>
              {review.duplicate ? <Text testID="activity-import-duplicate" style={[s.error, { color: c.destructive }]}>This identical activity package was already imported. Import is blocked to prevent accidental duplicate copies.</Text> : null}
              {stale ? <Text testID="activity-import-stale" style={[s.error, { color: c.destructive }]}>Your library or catalogue changed after review. Cancel and review this package again.</Text> : null}
              {review.collisions.map((warning, index) => <Text key={`collision-${index}`} style={[s.small, { color: c.mutedForeground }]}>{warning}</Text>)}
            </Card>
            {visibleEntries.map(entry => (
              <ActivityReviewCard
                key={entry.incoming.ref}
                entry={entry}
                allEntries={review.entries}
                releaseSources={catalog.state.release.sources}
                choice={choices[entry.incoming.ref]}
                onChoice={choice => setChoices(current => ({ ...current, [entry.incoming.ref]: choice }))}
              />
            ))}
            {excludedEntries.length ? (
              <View testID="activity-import-unused-dependencies">
              <Card style={{ gap: 5 }}>
                <Text style={[s.smallStrong, { color: c.foreground }]}>Incoming sequence members not used</Text>
                <Text style={[s.small, { color: c.mutedForeground }]}>
                  The selected catalogue sequence keeps its existing membership. These incoming definitions will not be added: {excludedEntries.map(entry => entry.incoming.activity.name).join(', ')}.
                </Text>
              </Card>
              </View>
            ) : null}
            {missingChoices ? <Text testID="activity-import-choice-required" style={[s.error, { color: c.destructive }]}>{missingChoices} catalogue {missingChoices === 1 ? 'match needs' : 'matches need'} your choice before import.</Text> : null}
            {choiceErrors.map((item, index) => <Text key={`choice-error-${index}`} testID="activity-import-choice-error" style={[s.error, { color: c.destructive }]}>{item}</Text>)}
            {error ? <Text accessibilityRole="alert" accessibilityLiveRegion="polite" testID="activity-import-error" style={[s.error, { color: c.destructive }]}>{error}</Text> : null}
            <Card style={{ gap: 6 }}>
              <Eyebrow>Confirm the outcome</Eyebrow>
              <Text style={[s.copy, { color: c.foreground }]}>{addedEstimate} new imported {addedEstimate === 1 ? 'activity' : 'activities'} · {reusedEstimate} catalogue {reusedEstimate === 1 ? 'activity reused' : 'activities reused'}</Text>
              <Text style={[s.small, { color: c.mutedForeground }]}>Sequences keep their order, repeated members, and sides. Existing activities and all routines, schedules, logs, and active sessions stay unchanged.</Text>
            </Card>
            <View style={s.actions}>
              <Button testID="activity-import-confirm" icon="check" label={busy ? 'Importing…' : 'Confirm import'} disabled={blocked} onPress={commit} style={{ flex: 1 }} />
              <Button testID="activity-import-cancel" variant="ghost" label="Cancel" disabled={busy} onPress={cancel} />
            </View>
          </>
        )}
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

const s = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1 },
  title: { fontFamily: fonts.display, fontSize: 24, letterSpacing: -0.5 },
  itemTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  itemName: { fontFamily: fonts.display, fontSize: 20, letterSpacing: -0.4 },
  copy: { fontFamily: fonts.body, fontSize: 14, lineHeight: 21 },
  small: { fontFamily: fonts.body, fontSize: 12, lineHeight: 18 },
  smallStrong: { fontFamily: fonts.bodySemi, fontSize: 12, lineHeight: 18 },
  label: { fontFamily: fonts.bodySemi, fontSize: 14 },
  changed: { fontFamily: fonts.bodySemi, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6 },
  status: { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5 },
  statusText: { fontFamily: fonts.bodySemi, fontSize: 12 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  diffRow: { borderWidth: 1, borderRadius: 12, padding: 10, gap: 8 },
  diffHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  diffColumns: { flexDirection: 'row', gap: 10 },
  code: { fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 16, borderRadius: 12, padding: 10, overflow: 'hidden' },
  input: { fontFamily: fonts.body, fontSize: 13, minHeight: 180, borderWidth: 1, borderRadius: 14, padding: 12, textAlignVertical: 'top' },
  error: { fontFamily: fonts.bodyMedium, fontSize: 13, lineHeight: 19 },
});
