# Activity catalog — phased implementation

## Phase 1: contracts and persistence

The shared `@workspace/activity-catalog` library defines activity identity,
controlled vocabularies, sources, relationships, ordered sequence membership,
separate prescriptions and actual measurements. It rejects dosage fields on
definitions, unsupported targets, unknown adaptation suitability, duplicate
identities, sequence cycles and dangling references. Null means unknown;
an empty metadata array means not applicable. Built-in does not mean clinically
verified. Reviews are content reviews, not medical certification.

The existing mobile library remains in place in this phase. Its local state
format is deliberately unchanged. No schedules, custom definitions, routines,
active sessions or history are rewritten or uploaded.

The read-only Express API exposes:

- `GET /api/catalog/manifest` — active release metadata and checksum.
- `GET /api/catalog/releases/:version` — complete immutable release.
- `GET /api/catalog/activities?version=...&q=...&discipline=...&type=...`
  — ID-ordered pages; limit 1–100, offset 0–10000, text at most 120 characters.

No reviewed content has been published yet. Manifest returns an explicit 503
until one is available. The new API is not yet wired to the mobile app.
It must not replace the working legacy library with empty data.

Catalog persistence contains only shared knowledge, never personal fitness
records. Aliases, relationships and membership use normalized tables and
foreign keys; rich definitions/source records use strictly validated structured
JSON. Complete immutable rows for old releases are retained for rollback.

## Trusted content loading

Run only in a trusted maintainer runtime. No public write endpoint exists.

```
pnpm --filter @workspace/scripts catalog --environment development --file reviewed-release.json
NODE_ENV=development pnpm --filter @workspace/scripts catalog --environment development --file reviewed-release.json --apply
NODE_ENV=development pnpm --filter @workspace/scripts catalog --environment development --rollback previous-version --apply
```

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

**Phase 2 — reviewed catalog and offline repository:** establish the actual
distinct inventory before authoring; write original substantive instructions
and record per-entry sources, review dates only when known, permitted-use notes,
advanced instruction flags and CARs safeguards. Ship a validated snapshot.
Implement complete-release checksum validation, atomic cache activation,
compatible schema checks, first-offline-launch support, last-known-good fallback,
visible freshness/errors and retained archived references.

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
