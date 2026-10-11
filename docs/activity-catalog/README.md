# Activity catalog — phased implementation

## Shared contracts and persistence

The shared `@workspace/activity-catalog` library defines activity identity,
controlled vocabularies, sources, relationships, ordered sequence membership,
separate prescriptions and actual measurements. It rejects dosage fields on
definitions, unsupported targets, unknown adaptation suitability, duplicate
identities, sequence cycles and dangling references. Null means unknown;
an empty metadata array means not applicable. Built-in does not mean clinically
verified. Reviews are content reviews, not medical certification.

The existing mobile moves and routines remain in place. Their local state
format is deliberately unchanged. No schedules, custom definitions, routines,
active sessions or history are rewritten or uploaded.

The read-only Express API exposes:

- `GET /api/catalog/manifest` — active release metadata and checksum.
- `GET /api/catalog/releases/:version` — complete immutable release.
- `GET /api/catalog/activities?version=...&q=...&discipline=...&type=...`
  — also supports bounded `family`, `equipment`, `joint`, `difficulty` and
  boolean `includeArchived` filters. ID-ordered pages; limit 1–100,
  offset 0–10000, text at most 120 characters. Unknown keys/values are rejected.
  Archived definitions are hidden by default, retained in full snapshots.

The reviewed starter `tempo-catalog-2026-10-11-1` is bundled for offline use and
loaded into **development only**. Manifest returns an explicit 503 wherever no
release has been loaded (including production unless separately approved).
The app's Library → Explore reads the shared repository independently of
legacy moves and shows original details, precautions, modifications, qualified
benefits, aliases, lineage context, relationships/sequences and linked review records.

Catalog persistence contains only shared knowledge, never personal fitness
records. Aliases, relationships and membership use normalized tables and
foreign keys; rich definitions/source records use strictly validated structured
JSON. Complete immutable rows for old releases are retained for rollback.

## Trusted content loading

Run only in a trusted maintainer runtime. No public write endpoint exists.

For a fresh development database, first apply the existing schema with
`pnpm --filter @workspace/db run push`, then load the reviewed release below.
An empty database is not a working catalog service even if `/api/healthz` passes.

```
pnpm --filter @workspace/scripts catalog:bundle
pnpm --filter @workspace/scripts catalog --environment development --file ../generated-artifacts/catalog/reviewed-release.json
NODE_ENV=development pnpm --filter @workspace/scripts catalog --environment development --file ../generated-artifacts/catalog/reviewed-release.json --apply
pnpm --filter @workspace/scripts catalog --environment development --file reviewed-release.json
NODE_ENV=development pnpm --filter @workspace/scripts catalog --environment development --file reviewed-release.json --apply
NODE_ENV=development pnpm --filter @workspace/scripts catalog --environment development --rollback previous-version --apply
```

The bundle command validates authored content and minimum counts, generates
`src/starter.json` with a pinned manifest, a maintainer release file under ignored
`generated-artifacts/catalog/`, and the auditable inventory TSV. Paths passed
through `pnpm --filter @workspace/scripts` resolve from `scripts/`.
Publishing here means atomically importing/activating shared content—not deploying
code or changing schema.

The public application also requires a provisioned production database.
Use Replit's Publishing flow to create it and apply the development schema;
do not add schema changes to server startup or deployment build commands.
For a new production database, copying the reviewed development catalog through
the Publishing database settings is a maintainer-approved option. Do not overwrite
an existing production database merely to refresh shared catalog content.
If production is unavailable or uninitialized, updates report an explicit error
and the client retains its bundled or last-known-good catalog.

The default is dry run: validates the file without opening a database connection.
Publishing requires all minimum distinct coverage counts (200 strength exercises,
80 Ashtanga-related elements, 35 mobility drills, 15 conditioning activities),
source-checked records, compatible schema and valid relationships. These are
coverage targets, not counts of any tradition. Sequences and synonyms do not
inflate these counts. A published version can never be modified; identical
re-import is a no-op, including activation. Rollback explicitly reactivates a
previous published version without deleting newer versions. Import/activation
is one transaction protected against simultaneous releases.
Publication timestamps are normalized to millisecond ISO strings before hashing
and storage, matching the read API's PostgreSQL/Date reconstruction. Release
checksums therefore do not depend on the author's timestamp formatting/precision.

Environment selection never changes the connection string. The maintainer must
run inside the intended runtime whose server-side DATABASE_URL already targets
that environment. Applied writes require a matching NODE_ENV. For production
content loading, use `--environment production --apply --confirm-production`
only inside the trusted production runtime, following explicit approval.
Never copy credentials into CLI arguments, logs, docs or the mobile app.
Production content loading has NOT been run by this work.

## Schema deployment is separate from content loading

Development schema uses the existing Drizzle workflow (`@workspace/db push`).
Managed production schema changes happen through Replit Publish, not this
content CLI. There are no production schema scripts, startup-time DDL or
schema mutations in deployment build commands. Seed/content rows are not
assumed to transfer with schema publishing. After an approved schema deployment,
load an approved release separately into the intended runtime.

## Remaining phases

**Delivered — reviewed catalog and offline repository:** 240 strength, 119
Ashtanga-related, 36 mobility (8 CARs), 16 conditioning, plus ordered Ashtanga
Sun Salutation A/B references and a mobility sequence. Mula and Uddiyana Bandha
are source-qualified practice elements without prescribed technique or dose.
See [source-inventory.md](source-inventory.md). Reviews are source checks, not
medical/expert certifications.

The shared repository exposes a validated bundled snapshot synchronously before
any storage/network call. Native builds configure the API origin through existing
`setBaseUrl` using `EXPO_PUBLIC_DOMAIN` (host or HTTPS origin); missing native
configuration yields a visible error while browsing remains usable. The dev
workflow already supplies that variable. Physical-device release builds must
supply their approved API origin; no preview hostname is hardcoded in source.

Network calls use generated GET helpers/React Query. Only manifest/version paths
are sent: never profiles, preferences, workouts, logs, history, custom moves or
personal search terms. Requests omit cookies. Cache keys are isolated under
`@tempo/shared-catalog/v1/`, not the personal storage keys. Existing state and
legacy IDs remain untouched.

Activation validates the **entire** strict release, supported schema, immutable
version, source provenance/identity/graph checks, coverage, count, normalized
publication timestamp and portable SHA-256 of canonical ordered JSON against
the pinned manifest. New payload is persisted and revalidated from storage first;
one AsyncStorage pointer write activates it. A saved recovery pointer and all
older immutable payloads remain available. Interrupted writes, invalid schemas,
changed immutable versions, partial downloads, offline requests and corrupted
cache never replace a working snapshot. Hydration tries retained last-known-good
versions, then the verified bundle, and reports failures visibly. No cache is
silently cleared and no private data is reset.

The browser shows copy origin, content version, last successful check and current
errors, with an explicit retry. Archived/removed IDs can still be resolved through
retained releases, including explicit version-pinned references; corrupt requested
archives fail rather than substituting a different definition. Retention is not
garbage-collected. Future migrations must store version pins when exact provenance
is required. Download checks time out after 20 seconds. Storage-full failure keeps
the previous active pointer. Freshness is informational, not an exercise safety rating.

### Verification

```
pnpm run typecheck
pnpm --filter @workspace/activity-catalog test
pnpm --filter @workspace/adaptive-fitness test
pnpm --filter @workspace/scripts test:catalog-development
```

The last command is explicitly development-only and requires the running dev API.
It checks CLI dry run, concurrent identical imports, immutable version rejection,
real database rollback after a partial insert failure, rollback/reactivation,
checksum reconstruction, aliases, bounded filters, archive handling, pagination,
implement accuracy (including barbell loading/safety and separate dip bars),
invalid queries, missing releases and write rejection. Temporary named test
versions are cleaned up after restoring the authored release; no personal tables,
schema scripts or production operations are involved. Offline unit checks cover
first launch, cache restart, failed payload/pointer writes, corruption recovery,
schema/checksum/count/date mismatch, interrupted downloads, concurrent refresh,
server rollback and retained references. Existing personal-data regressions run
unchanged. Native hardware has not been tested in this workspace.

Content corrections always receive a new immutable release version. The current
starter corrects implement/support metadata without changing stable activity IDs;
affected definition versions increase. Earlier development releases are retained
for audit/explicit rollback, not recommended as the current reviewed content.

**Phase 3 — local data and app integration:** losslessly migrate legacy dosage
into personal prescriptions (including custom defaults into separate presets),
preserve saved snapshots and numeric values, connect rich details/search/filters,
support reps/seconds/breaths/distance with explicit distance/load units across
routine/date/session editors, execution/history/import/export. Expand sequences
into ordered explicit editable targets and preserve repetition/side. Keep
unknown duration unknown and show any estimation assumptions. Expanded equipment
must work in profile and adaptation. Automatically eligible activities require
explicit suitability, with no advanced-yoga or rehab progression.

The numeric-draft immediate-save/stepping and explicit-zero-load logging fixes
are delivered in Phase 1 because they are independently useful and do not
require the personal-data migration.
