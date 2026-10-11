import { router, useLocalSearchParams } from 'expo-router';
import React, { useMemo, useRef, useState } from 'react';
import { StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { Button, Card, Chip, EmptyState, Eyebrow, IconButton, success, useTopInset } from '@/components/ui';
import { fonts } from '@/constants/colors';
import { useCatalog } from '@/context/CatalogContext';
import { useTempo } from '@/context/TempoContext';
import { useColors } from '@/hooks/useColors';
import { exportContent, libraryRevision, reviewContent, type ContentReview, type ExportSelection } from '@/lib/content-exchange';
import { CONTENT_AI_PROMPT, CONTENT_EXAMPLES, CONTENT_FORMAT_GUIDE, CONTENT_JSON_SCHEMA } from '@/lib/content-examples';
import { copyText, pickContentFile, shareContentFile } from '@/lib/content-transport';
import type { ContentItem } from '@workspace/activity-catalog';
import { DetailDisclosure } from '@/components/ExploreActivityContent';

type Tab = 'export' | 'import' | 'guide';
const msg = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong.');
const first = (v?: string | string[]) => (Array.isArray(v) ? v[0] : v);
const MAX_RESULTS = 12;

function targetText(it: ContentItem): string {
  const t = it.reps !== undefined ? `${it.reps} reps` : it.seconds !== undefined ? `${it.seconds} sec` : it.breaths !== undefined ? `${it.breaths} breaths` : it.distance !== undefined ? `${it.distance} ${it.distanceUnit ?? ''}`.trim() : null;
  return `${it.sets} sets · ${t ?? 'target missing — you must enter it'}${it.load !== undefined ? ` · ${it.load} ${it.unit}` : ''} · rest ${it.restSec}s${it.side ? ` · ${it.side}` : ''}${it.note ? ` · ${it.note}` : ''}`;
}

function Toggle({ label, hint, value, onChange, disabled, testID }: { label: string; hint: string; value: boolean; onChange: (v: boolean) => void; disabled?: boolean; testID?: string }) {
  const c = useColors();
  return (
    <View style={[s.toggle, { opacity: disabled ? 0.5 : 1 }]}>
      <View style={{ flex: 1 }}>
        <Text style={[s.strong, { color: c.foreground }]}>{label}</Text>
        <Text style={[s.small, { color: c.mutedForeground }]}>{hint}</Text>
      </View>
      <Switch testID={testID} accessibilityLabel={label} value={value} disabled={disabled} onValueChange={onChange} />
    </View>
  );
}

function CodeBlock({ title, text, testID }: { title: string; text: string; testID?: string }) {
  const c = useColors();
  const [note, setNote] = useState<string | null>(null);
  const copy = async () => {
    try { await copyText(text); setNote('Copied.'); success(); } catch (e) { setNote(`Copy failed: ${msg(e)}`); }
  };
  return (
    <Card style={{ gap: 8, marginTop: 12 }}>
      <Eyebrow>{title}</Eyebrow>
      <TextInput testID={testID} value={text} multiline editable={false} selectTextOnFocus style={[s.code, { backgroundColor: c.muted, color: c.foreground }]} />
      <Button compact variant="soft" icon="copy" label={`Copy ${title.toLowerCase()}`} onPress={copy} />
      {note ? <Text accessibilityLiveRegion="polite" style={[s.small, { color: note.startsWith('Copy failed') ? c.destructive : c.mutedForeground }]}>{note}</Text> : null}
    </Card>
  );
}

export default function ContentExchange() {
  const c = useColors();
  const top = useTopInset();
  const { state, commitContentImport } = useTempo();
  const catalog = useCatalog();
  const params = useLocalSearchParams<{ activityId?: string; routineId?: string; tab?: string }>();
  const initial = useRef<ExportSelection[]>([
    ...(first(params.activityId) ? [{ kind: 'activity' as const, id: first(params.activityId)! }] : []),
    ...(first(params.routineId) ? [{ kind: 'routine' as const, id: first(params.routineId)! }] : []),
  ]).current;
  const [tab, setTab] = useState<Tab>(first(params.tab) === 'import' ? 'import' : first(params.tab) === 'guide' ? 'guide' : 'export');
  const [picked, setPicked] = useState<ExportSelection[]>(initial);
  const [q, setQ] = useState('');
  const [output, setOutput] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportNote, setExportNote] = useState<string | null>(null);
  const [raw, setRaw] = useState('');
  const [review, setReview] = useState<ContentReview | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [intentional, setIntentional] = useState(false);
  const [approve, setApprove] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [example, setExample] = useState<string>(Object.keys(CONTENT_EXAMPLES)[0] ?? '');

  const isPicked = (kind: ExportSelection['kind'], id: string) => picked.some(p => p.kind === kind && p.id === id);
  const toggle = (kind: ExportSelection['kind'], id: string) => {
    setOutput(null); setExportNote(null);
    setPicked(ps => (ps.some(p => p.kind === kind && p.id === id) ? ps.filter(p => !(p.kind === kind && p.id === id)) : [...ps, { kind, id }]));
  };

  const names = useMemo(() => {
    const m = new Map<string, string>();
    for (const a of catalog.state.release.activities) m.set(`activity:${a.id}`, `${a.name} (shared)`);
    for (const a of state.savedActivities) if (!m.has(`activity:${a.id}`)) m.set(`activity:${a.id}`, `${a.fallback.name} (saved)`);
    for (const e of state.customExercises) m.set(`activity:${e.id}`, `${e.name} (${e.contentImport ? 'imported' : 'custom'})`);
    for (const r of state.routines) m.set(`routine:${r.id}`, `${r.name} (routine)`);
    return m;
  }, [catalog.state.release, state.savedActivities, state.customExercises, state.routines]);

  const results = useMemo(() => {
    const needle = q.trim().toLocaleLowerCase();
    const all: ExportSelection[] = [...names.keys()].map(k => ({ kind: k.startsWith('routine:') ? 'routine' as const : 'activity' as const, id: k.slice(k.indexOf(':') + 1) }));
    const hit = (x: ExportSelection) => (names.get(`${x.kind}:${x.id}`) ?? '').toLocaleLowerCase().includes(needle);
    return needle ? all.filter(hit).slice(0, MAX_RESULTS) : [];
  }, [q, names]);

  const prepare = () => {
    setExportError(null); setExportNote(null);
    try {
      setOutput(JSON.stringify(exportContent(state, catalog.state.release, picked), null, 2));
    } catch (e) { setOutput(null); setExportError(msg(e)); }
  };
  const filename = 'svasthic-content.json';
  const doCopy = async () => { try { await copyText(output!); setExportNote('Copied to clipboard.'); success(); } catch (e) { setExportNote(`Copy failed: ${msg(e)}`); } };
  const doShare = async () => { try { await shareContentFile(output!, filename); setExportNote('File handed to sharing or download.'); } catch (e) { setExportNote(`Share or download failed: ${msg(e)}`); } };

  const doReview = (text = raw) => {
    setImportError(null); setDone(null); setReview(null); setIntentional(false); setApprove(false);
    try { setReview(reviewContent(text, state)); } catch (e) { setImportError(msg(e)); }
  };
  const doPick = async () => {
    setImportError(null);
    try {
      const text = await pickContentFile();
      if (text === null) return;
      setRaw(text); doReview(text);
    } catch (e) { setImportError(`Could not read the file: ${msg(e)}`); }
  };
  const cancel = () => { setReview(null); setIntentional(false); setApprove(false); setImportError(null); };
  const stale = review ? review.revision !== libraryRevision(state) : false;
  const blocked = !review || busy || stale || (review.duplicate && !intentional);
  const commit = async () => {
    if (!review || blocked) return;
    setBusy(true); setImportError(null);
    try {
      const r = await commitContentImport(review, { intentionalCopy: intentional, approveTargets: approve });
      setDone(`Added ${r.added} ${r.added === 1 ? 'item' : 'items'} to your library as externally imported, unverified content. ${approve ? 'Complete targets were approved; missing targets remain drafts.' : 'Routine targets remain drafts until you review them.'}`);
      setReview(null); setRaw(''); setIntentional(false); setApprove(false); success();
    } catch (e) { setImportError(msg(e)); } finally { setBusy(false); }
  };

  const pkg = review?.package;
  const nameOf = (ref: string) => pkg?.activities.find(a => a.ref === ref)?.activity.name ?? ref;

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <View style={[s.bar, { paddingTop: top + 8, borderBottomColor: c.border }]}>
        <View style={{ flex: 1 }}>
          <Eyebrow>Content exchange</Eyebrow>
          <Text accessibilityRole="header" style={[s.title, { color: c.foreground }]}>Import & export content</Text>
        </View>
        <IconButton testID="content-close" icon="x" label="Close" onPress={() => router.back()} />
      </View>
      <KeyboardAwareScrollViewCompat style={{ backgroundColor: c.background }} contentContainerStyle={{ padding: 20, paddingBottom: 60 }} keyboardShouldPersistTaps="handled" bottomOffset={20}>
        <View style={s.chips}>
          <Chip testID="tab-export" label="Export" icon="upload" active={tab === 'export'} onPress={() => setTab('export')} />
          <Chip testID="tab-import" label="Import" icon="download" active={tab === 'import'} onPress={() => setTab('import')} />
          <Chip testID="tab-guide" label="Guide" icon="book-open" active={tab === 'guide'} onPress={() => setTab('guide')} />
        </View>
        <Text style={[s.small, { color: c.mutedForeground, marginTop: 10 }]}>Move activities and routines to or from your own AI assistant or another device. This is separate from whole-device backup and restore in Settings, and never replaces your library.</Text>

        {tab === 'export' ? (
          <View style={{ marginTop: 14, gap: 10 }}>
            <TextInput testID="export-search" value={q} onChangeText={setQ} placeholder="Search activities and routines to add" placeholderTextColor={c.mutedForeground} accessibilityLabel="Search content to export" style={[s.input, { color: c.foreground, borderColor: c.border, backgroundColor: c.card }]} />
            {q.trim() && results.length === 0 ? <Text style={[s.small, { color: c.mutedForeground }]}>No matches. Shared, saved and custom activities and routines are searched.</Text> : null}
            {results.length ? <View style={s.chips}>{results.map(r => <Chip key={`${r.kind}:${r.id}`} label={names.get(`${r.kind}:${r.id}`) ?? r.id} active={isPicked(r.kind, r.id)} icon={isPicked(r.kind, r.id) ? 'check' : 'plus'} onPress={() => toggle(r.kind, r.id)} />)}</View> : null}
            {results.length === MAX_RESULTS ? <Text style={[s.small, { color: c.mutedForeground }]}>Showing the first {MAX_RESULTS}. Refine the search to narrow.</Text> : null}
            <Eyebrow style={{ marginTop: 6 }}>Selected ({picked.length})</Eyebrow>
            {picked.length === 0 ? <EmptyState icon="package" title="Nothing selected" body="Search above to pick activities and routines. Dependencies such as sequence members are included automatically." /> : (
              <View style={s.chips}>{picked.map(p => <Chip key={`${p.kind}:${p.id}`} active label={names.get(`${p.kind}:${p.id}`) ?? `${p.id} (unavailable)`} icon="x" onPress={() => toggle(p.kind, p.id)} />)}</View>
            )}
            <Button testID="export-prepare" icon="file-text" label="Prepare JSON" disabled={!picked.length} onPress={prepare} />
             <Text style={[s.small, { color: c.mutedForeground }]}>The external app you choose receives the selected content, dependencies and routine notes. Your profile, schedule, history and active session are excluded.</Text>
            {exportError ? <Text accessibilityLiveRegion="polite" testID="export-error" style={[s.err, { color: c.destructive }]}>{exportError}</Text> : null}
            {output ? (
              <Card style={{ gap: 8 }}>
                <Eyebrow>JSON output</Eyebrow>
                <TextInput testID="export-output" value={output} multiline editable={false} selectTextOnFocus style={[s.code, { backgroundColor: c.muted, color: c.foreground }]} />
                <View style={s.chips}>
                  <Button compact testID="export-copy" icon="copy" label="Copy" variant="soft" onPress={doCopy} />
                  <Button compact testID="export-share" icon="share" label="Share or download" variant="soft" onPress={doShare} />
                </View>
                {exportNote ? <Text accessibilityLiveRegion="polite" style={[s.small, { color: exportNote.includes('failed') ? c.destructive : c.mutedForeground }]}>{exportNote}</Text> : null}
              </Card>
            ) : null}
          </View>
        ) : null}

        {tab === 'import' ? (
          <View style={{ marginTop: 14, gap: 10 }}>
            {done ? <Card style={{ gap: 6 }}><Text accessibilityLiveRegion="polite" testID="import-done" style={[s.strong, { color: c.done }]}>{done}</Text><Button compact variant="soft" label="Open Library" onPress={() => router.replace('/library')} /></Card> : null}
            {!review ? (
              <>
                <TextInput testID="content-input" value={raw} onChangeText={t => { setRaw(t); setImportError(null); }} multiline autoCapitalize="none" autoCorrect={false} placeholder='Paste Svasthic content JSON, for example {"format": "svasthic-content", ...}' placeholderTextColor={c.mutedForeground} accessibilityLabel="Content JSON" style={[s.code, { backgroundColor: c.muted, color: c.foreground, borderColor: importError ? c.destructive : 'transparent', borderWidth: 1.5 }]} />
                <View style={s.chips}>
                  <Button compact testID="content-review" icon="eye" label="Preview" disabled={!raw.trim()} onPress={() => doReview()} />
                  <Button compact testID="content-file" icon="file" label="Choose file" variant="soft" onPress={doPick} />
                </View>
              </>
            ) : null}
            {importError ? <Text accessibilityLiveRegion="polite" testID="import-error" style={[s.err, { color: c.destructive }]}>{importError}</Text> : null}
            {review && pkg ? (
              <View style={{ gap: 10 }}>
                <Card style={{ gap: 4 }}>
                  <Eyebrow>Preview — nothing is added yet</Eyebrow>
                  <Text style={[s.h, { color: c.foreground }]}>{pkg.title}</Text>
                  <Text style={[s.small, { color: c.mutedForeground }]}>Author: {pkg.author ?? 'not stated'} · {pkg.activities.length} activities · {pkg.routines.length} routines</Text>
                  <Text style={[s.small, { color: c.mutedForeground }]}>Imported content arrives as unreviewed drafts, not eligible for automatic adaptation.</Text>
                </Card>
                {review.duplicate ? <Card style={{ borderColor: c.destructive }}><Text style={[s.strong, { color: c.destructive }]}>This identical package was already imported.</Text><Text style={[s.small, { color: c.mutedForeground }]}>Import is blocked unless you choose an intentional copy below.</Text></Card> : null}
                {stale ? <Text style={[s.err, { color: c.destructive }]}>Your library changed after preview. Cancel and preview again.</Text> : null}
                {review.collisions.length ? <Card style={{ gap: 4 }}><Eyebrow>Collisions ({review.collisions.length})</Eyebrow>{review.collisions.map((x, i) => <Text key={i} style={[s.small, { color: c.foreground }]}>{x}</Text>)}</Card> : null}
                <Eyebrow>Activities and dependencies</Eyebrow>
                {pkg.activities.map(a => (
                  <Card key={a.ref} style={{ gap: 3 }}>
                    <Text style={[s.strong, { color: c.foreground }]}>{a.activity.name}</Text>
                     <Text style={[s.small, { color: c.mutedForeground }]}>{pkg.selection.some(root => root.kind === 'activity' && root.ref === a.ref) ? 'Selected activity' : 'Included definition/dependency'} · Ref {a.ref} · {a.activity.type} · origin {a.origin.kind} {a.origin.id} v{a.origin.version}</Text>
                     <Text selectable style={[s.small, { color: c.foreground }]}>{a.activity.description}</Text>
                     <Text style={[s.small, { color: c.mutedForeground }]}>Measurements: {a.activity.supportedMetrics.join(', ')} · distance {a.activity.distanceUnits.join(', ') || 'none'} · load {a.activity.loadUnits.join(', ') || 'none'} · laterality {a.activity.laterality}</Text>
                     <DetailDisclosure title="Review full incoming knowledge and attribution">
                       <Text selectable style={[s.small, { color: c.foreground }]}>{JSON.stringify({ knowledge: a.activity, sources: a.sources, attribution: a.attribution ?? null }, null, 2)}</Text>
                     </DetailDisclosure>
                    {a.attribution ? <Text style={[s.small, { color: c.mutedForeground }]}>Prior attribution: {a.attribution.activity.name}</Text> : null}
                    {a.sources.length ? a.sources.map(src => <Text key={src.id} style={[s.small, { color: c.mutedForeground }]}>Source: {src.title} — {src.provenance} ({src.url})</Text>) : <Text style={[s.small, { color: c.mutedForeground }]}>No sources listed.</Text>}
                    {a.members.length ? <Text style={[s.small, { color: c.foreground }]}>Members: {a.members.map(m => `${nameOf(m.activityRef)} (${m.activityRef}, ${m.side})`).join(' → ')}</Text> : null}
                  </Card>
                ))}
                <Eyebrow>Routines and proposed targets</Eyebrow>
                {pkg.routines.length === 0 ? <Text style={[s.small, { color: c.mutedForeground }]}>No routines in this package.</Text> : null}
                {pkg.routines.map(r => (
                  <Card key={r.ref} style={{ gap: 4 }}>
                    <Text style={[s.strong, { color: c.foreground }]}>{r.name}</Text>
                    <Text style={[s.small, { color: c.mutedForeground }]}>{r.ref}{r.originId ? ` · origin ${r.originId}` : ''}{r.notes ? ` · ${r.notes}` : ''}</Text>
                    {r.items.map((it, i) => {
                      const missing = [it.reps, it.seconds, it.breaths, it.distance].every(x => x === undefined);
                      return <Text key={i} style={[s.small, { color: missing ? c.destructive : c.foreground }]}>{i + 1}. {nameOf(it.activityRef)}: {targetText(it)}</Text>;
                    })}
                  </Card>
                ))}
                {review.missingTargets ? <Text style={[s.small, { color: c.destructive }]}>{review.missingTargets} items have no target and will stay draft until you enter one.</Text> : null}
                <Card style={{ gap: 6 }}>
                  {review.duplicate ? <Toggle testID="toggle-copy" label="Intentional copy" hint="Add another copy of this already-imported package." value={intentional} onChange={setIntentional} /> : null}
                  <Toggle testID="toggle-approve" label="Approve complete targets" hint="Off by default: routines import as drafts to confirm yourself. On marks only items with valid targets as confirmed, using the values shown above." value={approve} onChange={setApprove} />
                </Card>
                <View style={s.chips}>
                  <Button testID="import-confirm" icon="check" label={busy ? 'Importing…' : approve ? 'Add with reviewed targets' : 'Import as drafts'} disabled={blocked} onPress={commit} style={{ flex: 1 }} />
                  <Button testID="import-cancel" variant="ghost" label="Cancel" disabled={busy} onPress={cancel} />
                </View>
              </View>
            ) : null}
          </View>
        ) : null}

        {tab === 'guide' ? (
          <View style={{ marginTop: 14 }}>
            <Card style={{ gap: 6 }}><Eyebrow>Format guide</Eyebrow><Text selectable style={[s.body, { color: c.foreground }]}>{CONTENT_FORMAT_GUIDE}</Text></Card>
            <CodeBlock title="AI prompt" text={CONTENT_AI_PROMPT} testID="guide-prompt" />
            <CodeBlock title="JSON Schema" text={JSON.stringify(CONTENT_JSON_SCHEMA, null, 2)} testID="guide-schema" />
            <Eyebrow style={{ marginTop: 14 }}>Examples</Eyebrow>
            <View style={[s.chips, { marginTop: 8 }]}>{Object.keys(CONTENT_EXAMPLES).map(k => <Chip key={k} label={k} active={example === k} onPress={() => setExample(k)} />)}</View>
            {CONTENT_EXAMPLES[example] ? <CodeBlock title="Example JSON" text={JSON.stringify(CONTENT_EXAMPLES[example], null, 2)} testID="guide-example" /> : null}
          </View>
        ) : null}
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

const s = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1 },
  title: { fontFamily: fonts.display, fontSize: 22, letterSpacing: -0.4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  small: { fontFamily: fonts.body, fontSize: 12.5, lineHeight: 18 },
  body: { fontFamily: fonts.body, fontSize: 14, lineHeight: 21 },
  strong: { fontFamily: fonts.bodySemi, fontSize: 15 },
  h: { fontFamily: fonts.display, fontSize: 20, letterSpacing: -0.4 },
  err: { fontFamily: fonts.bodyMedium, fontSize: 13, lineHeight: 18 },
  input: { fontFamily: fonts.body, fontSize: 15, minHeight: 48, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14 },
  code: { fontFamily: fonts.body, fontSize: 12, borderRadius: 14, padding: 12, minHeight: 120, maxHeight: 260, textAlignVertical: 'top' },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
